'use strict';

function trace(arg) {
    var now = (window.performance.now() / 1000).toFixed(3);
    console.log(now + ': ', arg);
}

// UI Element Value
var output_offerDesc = document.querySelector('textarea#output_offerDesc');
var input_answerDesc = document.querySelector('textarea#input_answerDesc');

var vid1 = document.querySelector('#vid1');
var vid2 = document.querySelector('#vid2');

var btn_start = document.querySelector('#btn_start');
var btn_receiveAnswer = document.querySelector('#btn_receiveAnswer');

btn_start.addEventListener('click', onStart);
btn_receiveAnswer.addEventListener('click', onReceiveAnswer);
// ---------------------------------------------------------------------------------

// Value
var local_peer = null;
var localstream = null;
// ---------------------------------------------------------------------------------

function onReceiveAnswer() {
    var sdpString = input_answerDesc.value;
    receiveAnswer(sdpString);
}

function cbGotStream(stream) {
    trace('Received local stream');
    vid1.srcObject = stream;
    localstream = stream;
}

function cbGotRemoteStream(e) {
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
    .then(cbGotStream)
    .catch(function (e) {
        alert('getUserMedia() error: ' + e);
    });

function onStart() {
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

    var pcConstraints = {
        'optional': []
    };

    local_peer = new RTCPeerConnection(servers, pcConstraints);
    local_peer.onicecandidate = function (evt) {
        cbIceCandidate(local_peer, evt);
    };
    local_peer.ontrack = cbGotRemoteStream;

    localstream.getTracks().forEach(
        function (track) {
            local_peer.addTrack(
                track,
                localstream
            );
        }
    );

    var offerOptions = {
        offerToReceiveAudio: 1,
        offerToReceiveVideo: 1
    };

    local_peer.createOffer(
        offerOptions
    ).then(
        cbCreateOfferSuccess,
        cbCreateOfferError
    );
}
function cbCreateOfferError(error) {
    trace('Failed to create session description: ' + error.toString());
    stop();
}

function cbCreateOfferSuccess(desc) {
    local_peer.setLocalDescription(desc).then(
        cbSetLocalDescriptionSuccess,
        cbSetLocalDescriptionError
    );
}
function cbSetLocalDescriptionSuccess() {
    trace('localDescription success.');
}
function cbSetLocalDescriptionError(error) {
    trace('Failed to set setLocalDescription: ' + error.toString());
    stop();
}

function stop() {
    if (local_peer != null)
        local_peer.close();
    local_peer = null;
}

function cbIceCandidate(pc, event) {
    if (event.candidate)
        cbCheckIceCandidateAdded(event.candidate);
    else
        cbCheckIceCandidateCompleted(pc.localDescription);
}
function cbCheckIceCandidateAdded(candidateObject) {
    trace('cbCheckIceCandidateAdded');
    // ICE candidate 가 추가되면 바로바로 연결 시도를 해 볼 수 있다. 
    // 이 예제는 추가가 완료되면 sdp 를 출력하기 때문에 여기서 아무것도 하지 않는다.
}

function cbCheckIceCandidateCompleted(descObject) {
    trace('cbCheckIceCandidateCompleted');
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