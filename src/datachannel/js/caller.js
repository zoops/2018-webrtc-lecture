/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

var localConnection;
var sendChannel;
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
var localstream = null;

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
  localstream = stream;
  vid1.srcObject = stream;
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
  pcConstraint = null; // {optional: [{RtpDataChannels: true}]};
  dataConstraint = null;
  trace('Using SCTP based data channels');

  var  servers = {
    iceTransportPolicy: "all", // set to "relay" to force TURN.
    iceServers: [
    ]
  };
  // cfg.iceServers.push({urls: "stun:stun.l.google.com:19302"});

  // SCTP is supported from Chrome 31 and is supported in FF.
  // No need to pass DTLS constraint as it is on by default in Chrome 31.
  // For SCTP, reliable and ordered is true by default.
  // Add localConnection to global scope to make it visible
  // from the browser console.
  window.localConnection = localConnection =
      new RTCPeerConnection(servers, pcConstraint);
  trace('Created local peer connection object localConnection');

  sendChannel = localConnection.createDataChannel('sendDataChannel',
      dataConstraint);
  trace('Created send data channel');

  localConnection.ontrack = cbGotRemoteStream;
  localstream.getTracks().forEach(
      function (track) {
            localConnection.addTrack(
              track,
              localstream
          );
      }
  );

  localConnection.onicecandidate = function(e) {
    onIceCandidate(localConnection, e);
  };
  sendChannel.onopen = onSendChannelStateChange;
  sendChannel.onclose = onSendChannelStateChange;
  sendChannel.onmessage = function(e) {
    console.info(e);
  };
  
  localConnection.createOffer().then(
    gotDescription1,
    onCreateSessionDescriptionError
  );
  startButton.disabled = true;
  closeButton.disabled = false;
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}
function onTest() {
  var answer = input_answerDesc.value;
  doAnswer(answer);
}

function sendData() {
  var data = dataChannelSend.value;
  sendChannel.send(data);
  trace('Sent Data: ' + data);
}

function closeDataChannels() {
  trace('Closing data channels');
  sendChannel.close();
  trace('Closed data channel with label: ' + sendChannel.label);
  localConnection.close();
  localConnection = null;
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

function gotDescription1(desc) {
  localConnection.setLocalDescription(desc);
  trace('Offer from localConnection \n' + desc.sdp);
}

function doAnswer(desc) {
  trace('receiveAnswer');
  var descObject = {
      type: 'answer',
      sdp: desc
  };
  localConnection.setRemoteDescription(descObject);
}

function getOtherPc(pc) {
  return localConnection;
}

function getName(pc) {
  return 'localPeerConnection';
}

function onIceCandidate(pc, event) {
  if (!event.candidate) {
    output_offerDesc.value = pc.localDescription.sdp;
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

function onAddIceCandidateSuccess(pc) {
  trace('AddIceCandidate success.');
}

function onAddIceCandidateError(error) {
  trace('Failed to add Ice Candidate: ' + error.toString());
}

function onSendChannelStateChange() {
  var readyState = sendChannel.readyState;
  trace('Send channel state is: ' + readyState);
  if (readyState === 'open') {
    dataChannelSend.disabled = false;
    dataChannelSend.focus();
    sendButton.disabled = false;
    closeButton.disabled = false;
  } else {
    dataChannelSend.disabled = true;
    sendButton.disabled = true;
    closeButton.disabled = true;
  }
}
