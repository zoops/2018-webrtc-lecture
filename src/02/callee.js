'use strict';

function trace(arg) {
    var now = (window.performance.now() / 1000).toFixed(3);
    console.log(now + ': ', arg);
}

// UI Element Value
var input_offerDesc = document.querySelector('textarea#input_offerDesc');
var output_answerDesc = document.querySelector('textarea#output_answerDesc');

var vid1 = document.querySelector('#vid1');
var vid2 = document.querySelector('#vid2');

var btn_start = document.querySelector('#btn_start');
var btn_receiveOffer = document.querySelector('#btn_receiveOffer');
var btn_finalAnswer = document.querySelector('#btn_finalAnswer');

btn_start.addEventListener('click', onStart);
btn_receiveOffer.addEventListener('click', onReceiveOffer);
btn_finalAnswer.addEventListener('click', onAnswer);
// ---------------------------------------------------------------------------------

// Value
var local_peer = null;
var localstream;
// ---------------------------------------------------------------------------------
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

function onStart() {
    var cfg = {
        iceTransportPolicy: "all", // set to "relay" to force TURN.
        iceServers: [
        ]
    };
    cfg.iceServers.push({urls: "stun:stun.l.google.com:19302"});

    local_peer = new RTCPeerConnection(cfg);    
    local_peer.onicecandidate = function (evt) {
        cbIceCandidate(local_peer, evt);
    };
    local_peer.ontrack = cbGotRemoteStream;

    localstream.getTracks().forEach(function (track) {
            local_peer.addTrack(
                track,
                localstream
            );
        }
    );

    trace('## start success = create RTCPeerConnection and set callback ');
}

function onReceiveOffer() {
    var sdpString = input_offerDesc.value;
    receiveOffer(sdpString);

    trace('## receiveOffer success');
}

function onAnswer() {
    createAnswer();

    trace('## createAnswer success');
}

function cbCreateAnswerError(error) {
    trace('Failed to set createAnswer: ' + error.toString());
    stop();
}

function cbSetLocalDescriptionSuccess() {
    trace('localDescription success.');
}

function cbSetLocalDescriptionError(error) {
    trace('Failed to set setLocalDescription: ' + error.toString());
    stop();
}

function cbCreateProvisionalAnswerDescription(desc) {
    console.log('cbCreateProvisionalAnswerDescription');
    // Provisional answer, set a=inactive & set sdp type to pranswer.
    desc.sdp = desc.sdp.replace(/a=recvonly/g, 'a=inactive');
    desc.type = 'pranswer';
    local_peer.setLocalDescription(desc).then(
        cbSetLocalDescriptionSuccess,
        cbSetLocalDescriptionError
    );
}

function receiveOffer(sdpString) {
    var descObject = {
        type: 'offer',
        sdp: sdpString
    };
    local_peer.setRemoteDescription(descObject);
}

function createAnswer() {
    local_peer.createAnswer().then(
        cbCreateProvisionalAnswerDescription,
        cbCreateAnswerError
    );
}

function stop() {
    trace('Ending Call' + '\n\n');
    local_peer.close();
    local_peer = null;
}

function cbIceCandidate(pc, event) {
    if (event.candidate)
        onCheckIceCandidateAdded(event.candidate);
    else
        onCheckIceCandidateCompleted(pc.localDescription);
}
function onCheckIceCandidateAdded(candidateObject) {
    trace('cbCheckIceCandidateAdded');
    // ICE candidate 가 추가되면 바로바로 연결 시도를 해 볼 수 있다. 
    // 이 예제는 추가가 완료되면 sdp 를 출력하기 때문에 여기서 아무것도 하지 않는다.
}

function onCheckIceCandidateCompleted(descObject) {
    trace('onCheckIceCandidateCompleted');
    output_answerDesc.value = descObject.sdp;
}