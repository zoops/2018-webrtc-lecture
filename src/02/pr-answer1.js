'use strict';

var output_offerDesc = document.querySelector('textarea#output_offerDesc');
var input_answerDesc = document.querySelector('textarea#input_answerDesc');

var vid1 = document.getElementById('vid1');
var vid2 = document.getElementById('vid2');

var btn_start = document.getElementById('btn_start');
var btn_receiveAnswer = document.getElementById('btn_receiveAnswer');

btn_start.addEventListener('click', start);
btn_receiveAnswer.addEventListener('click', test_receiveAnswer);

function test_receiveAnswer() {
    var sdpString = input_answerDesc.value;
    receiveAnswer(sdpString);
}

var local_peer = null;
var localstream;
var offerOptions = {
    offerToReceiveAudio: 1,
    offerToReceiveVideo: 1
};

function gotStream(stream) {
    trace('Received local stream');
    vid1.srcObject = stream;
    localstream = stream;
}
function gotRemoteStream(e) {
    trace('## Received remote stream try');
    if (vid2.srcObject !== e.streams[0]) {
        vid2.srcObject = e.streams[0];
        trace('## Received remote stream success');
    }
}

navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true
})
    .then(gotStream)
    .catch(function (e) {
        alert('getUserMedia() error: ' + e);
    });

function start() {
    var videoTracks = localstream.getVideoTracks();
    var audioTracks = localstream.getAudioTracks();
    if (videoTracks.length > 0) {
        trace('Using Video device: ' + videoTracks[0].label);
    }
    if (audioTracks.length > 0) {
        trace('Using Audio device: ' + audioTracks[0].label);
    }

    var servers = null;
    local_peer = new RTCPeerConnection(servers);
    local_peer.onicecandidate = function (e) {
        onIceCandidate(local_peer, e);
    };
    local_peer.ontrack = gotRemoteStream;

    localstream.getTracks().forEach(
        function (track) {
            local_peer.addTrack(
                track,
                localstream
            );
        }
    );

    local_peer.createOffer(
        offerOptions
    ).then(
        onCreateOfferSuccess,
        onCreateOfferError
    );
}
function onCreateOfferError(error) {
    trace('Failed to create session description: ' + error.toString());
    stop();
}

function onCreateOfferSuccess(desc) {
    local_peer.setLocalDescription(desc).then(
        onSetLocalDescriptionSuccess,
        onSetLocalDescriptionError
    );
}
function onSetLocalDescriptionSuccess() {
    trace('localDescription success.');
}
function onSetLocalDescriptionError(error) {
    trace('Failed to set setLocalDescription: ' + error.toString());
    stop();
}

function stop() {
    if (local_peer != null)
        local_peer.close();
    local_peer = null;
}

function onIceCandidate(pc, event) {
    if (event.candidate)
        onCheckIcdCandidateAdded(event.candidate);
    else
        onCheckIcdCandidateCompleted(pc.localDescription);
}
function onCheckIcdCandidateAdded(candidateObject) {
}
function onCheckIcdCandidateCompleted(descObject) {
    trace('onCheckIcdCandidateCompleted');
    output_offerDesc.value = descObject.sdp;
}

function receiveAnswer(sdpString) {
    trace('receiveAnswer');
    var descObject = {
        type: 'pranswer',
        sdp: sdpString
    };
    local_peer.setRemoteDescription(descObject);
}