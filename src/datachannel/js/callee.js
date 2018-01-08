/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

var remoteConnection;
var receiveChannel;
var pcConstraint;
var dataConstraint;
var dataChannelSend = document.querySelector('textarea#dataChannelSend');
var dataChannelReceive = document.querySelector('textarea#dataChannelReceive');
var startButton = document.querySelector('button#startButton');
var sendButton = document.querySelector('button#sendButton');
var closeButton = document.querySelector('button#closeButton');
var testButton = document.querySelector('button#test');

var vid1 = document.querySelector('#vid1');
var vid2 = document.querySelector('#vid2');
var localstream;

var output_offerDesc = document.querySelector('textarea#output_offerDesc');
var input_answerDesc = document.querySelector('textarea#input_answerDesc');

startButton.onclick = createConnection;
sendButton.onclick = sendData;
closeButton.onclick = closeDataChannels;
testButton.onclick = onTest;

function enableStartButton() {
  startButton.disabled = false;
}

function disableSendButton() {
  sendButton.disabled = true;
}

function cbGotStream(stream) {
  trace('Received local stream');
  vid1.srcObject = stream;
  localstream = stream;
}

navigator.mediaDevices.getUserMedia({
  audio: true,
  video: true
  })
  .then(cbGotStream)
  .catch(function (e) {
      alert('getUserMedia() error: ' + e);
  });

function cbGotRemoteStream(evt) {
  trace('## Received remote stream try');
  if (vid2.srcObject !== evt.streams[0]) {
      vid2.srcObject = evt.streams[0];
      trace('## Received remote stream success');
  }
}


function createConnection() {
  dataChannelSend.placeholder = '';
  pcConstraint = null; //{optional: [{RtpDataChannels: true}]};
  dataConstraint = null;
  trace('Using SCTP based data channels');

  var  servers = {
    iceTransportPolicy: "all", // set to "relay" to force TURN.
    iceServers: [
    ]
  };
  // cfg.iceServers.push({urls: "stun:stun.l.google.com:19302"});

  // Add remoteConnection to global scope to make it visible
  // from the browser console.
  window.remoteConnection = remoteConnection =
      new RTCPeerConnection(servers, pcConstraint);
  trace('Created remote peer connection object remoteConnection');

  remoteConnection.ontrack = cbGotRemoteStream;
  localstream.getTracks().forEach(function (track) {
    remoteConnection.addTrack(
              track,
              localstream
          );
      }
  );

  remoteConnection.onicecandidate = function(e) {
    onIceCandidate(remoteConnection, e);
  };
  remoteConnection.ondatachannel = receiveChannelCallback;

  startButton.disabled = true;
  closeButton.disabled = false;
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}
function onTest() {
  var offer = output_offerDesc.value;
  doRecvOffer(offer);
}

function sendData() {
  var data = dataChannelSend.value;
  receiveChannel.send(data);
  trace('Sent Data: ' + data);
}

function closeDataChannels() {
  trace('Closing data channels');
  receiveChannel.close();
  trace('Closed data channel with label: ' + receiveChannel.label);
  remoteConnection.close();
  remoteConnection = null;
  trace('Closed peer connections');
  startButton.disabled = false;
  sendButton.disabled = true;
  closeButton.disabled = true;
  dataChannelSend.value = '';
  dataChannelReceive.value = '';
  dataChannelSend.disabled = true;
  disableSendButton();
  enableStartButton();
}

function doRecvOffer(desc) {

  var descObject = {
    type: 'offer',
    sdp: desc
  };

  remoteConnection.setRemoteDescription(descObject);
  remoteConnection.createAnswer().then(
    gotDescription2,
    onCreateSessionDescriptionError
  );
}

function gotDescription2(desc) {
  remoteConnection.setLocalDescription(desc);
  trace('Answer from remoteConnection \n' + desc.sdp);  
}

function getOtherPc(pc) {
  return  remoteConnection;
}

function getName(pc) {
  return 'remotePeerConnection';
}

function onIceCandidate(pc, event) {
  if (!event.candidate) {
    input_answerDesc.value = pc.localDescription.sdp;
  }
  
  getOtherPc(pc).addIceCandidate(event.candidate)
  .then(
    function() {
      onAddIceCandidateSuccess(pc);
    },
    function(err) {
      onAddIceCandidateError(pc, err);
    }
  );
  trace(getName(pc) + ' ICE candidate: \n' + (event.candidate ?
      event.candidate.candidate : '(null)'));
}

function onAddIceCandidateSuccess() {
  trace('AddIceCandidate success.');
}

function onAddIceCandidateError(error) {
  trace('Failed to add Ice Candidate: ' + error.toString());
}

function receiveChannelCallback(event) {
  trace('Receive Channel Callback');
  receiveChannel = event.channel;
  receiveChannel.onmessage = onReceiveMessageCallback;
  receiveChannel.onopen = onReceiveChannelStateChange;
  receiveChannel.onclose = onReceiveChannelStateChange;
}

function onReceiveMessageCallback(event) {
  trace('Received Message');
  dataChannelReceive.value = event.data;
}

function onReceiveChannelStateChange() {
  var readyState = receiveChannel.readyState;
  trace('Receive channel state is: ' + readyState);
}
