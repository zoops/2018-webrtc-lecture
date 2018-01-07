'use strict';

function trace(arg) {
    var now = (window.performance.now() / 1000).toFixed(3);
    console.log(now + ': ', arg);
}

var input_offerDesc = document.querySelector('textarea#input_offerDesc');
var output_answerDesc = document.querySelector('textarea#output_answerDesc');

var vid1 = document.querySelector('#vid1');
var vid2 = document.querySelector('#vid2');

var btn_start = document.querySelector('#btn_start');
var btn_receiveOffer = document.querySelector('#btn_receiveOffer');
var btn_createAnswer = document.querySelector('#btn_createAnswer');
var btn_finalAnswer = document.querySelector('#btn_finalAnswer');

btn_start.addEventListener('click', start);
btn_receiveOffer.addEventListener('click', test_receiveOffer);
btn_createAnswer.addEventListener('click', createAnswer);
btn_finalAnswer.addEventListener('click', test_final_answer);

function test_receiveOffer() {
    var sdpString = input_offerDesc.value;
    receiveOffer(sdpString);
}
function test_final_answer() {
    createFinalAnswer();
}

var local_peer = null;
var localstream;

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

    var servers = {
        iceTransportPolicy: "all", // set to "relay" to force TURN.
        iceServers: [
        ]
    };
    servers.iceServers.push({urls: "stun:stun.l.google.com:19302"});
    servers.iceServers.push({
                    urls: "turn:webrtc.moberan.com",
                    username: "zoops", credential: "1234"
                });

    var pcConstraints = {
        'optional': []
    };

    local_peer = new RTCPeerConnection(servers, pcConstraints);    
    local_peer.onicecandidate = function (e) {
        onIceCandidate(local_peer, e);
    };
    local_peer.ontrack = gotRemoteStream;

    localstream.getTracks().forEach(function (track) {
            local_peer.addTrack(
                track,
                localstream
            );
        }
    );
}

function onCreateAnswerError(error) {
    trace('Failed to set createAnswer: ' + error.toString());
    stop();
}
function onSetLocalDescriptionSuccess() {
    trace('localDescription success.');
}
function onSetLocalDescriptionError(error) {
    trace('Failed to set setLocalDescription: ' + error.toString());
    stop();
}

function onCreateProvisionalAnswerDescription(desc) {
    console.log('onCreateProvisionalAnswerDescription');
    // Provisional answer, set a=inactive & set sdp type to pranswer.
    desc.sdp = desc.sdp.replace(/a=recvonly/g, 'a=inactive');
    desc.type = 'pranswer';
    local_peer.setLocalDescription(desc).then(
        onSetLocalDescriptionSuccess,
        onSetLocalDescriptionError
    );
    //output_answerDesc.value = desc.sdp;
}

function onCreateFinalAnswerDescription(desc) {
    console.log('--onCreateFinalAnswerDescription');
    // Final answer, setting a=recvonly & sdp type to answer.
    desc.sdp = desc.sdp.replace(/a=inactive/g, 'a=recvonly');
    desc.type = 'answer';
    local_peer.setLocalDescription(desc).then(
        onSetLocalDescriptionSuccess,
        onSetLocalDescriptionError
    );
    //output_answerDesc.value = desc.sdp;
}

function receiveOffer(sdpString) {
    var descObject = {
        type: 'offer',
        sdp: sdpString
    };
    local_peer.setRemoteDescription(descObject);

    createAnswer();
}
function createAnswer() {
    local_peer.createAnswer().then(
        onCreateProvisionalAnswerDescription,
        onCreateAnswerError
    );
}
function createFinalAnswer() {
    local_peer.createAnswer().then(
        onCreateFinalAnswerDescription,
        onCreateAnswerError
    );
}

function stop() {
    trace('Ending Call' + '\n\n');
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
    output_answerDesc.value = descObject.sdp;
}