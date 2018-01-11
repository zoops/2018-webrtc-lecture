'use strict';

function trace(arg) {
    var now = (window.performance.now() / 1000).toFixed(3);
    console.log(now + ': ', arg);
}

// UI Element Value
var input_answerDesc = document.querySelector('textarea#input_answerDesc');

var vid1 = document.querySelector('#vid1');
var vid2 = document.querySelector('#vid2');

var btn_start = document.querySelector('#btn_start');

var input_message = document.querySelector('#message');
var btn_send = document.querySelector('#btn_send');

var roodId = document.querySelector('#room_id');

btn_start.addEventListener('click', onStart);
btn_send.addEventListener('click', onSend);
// ---------------------------------------------------------------------------------
function onSend(){
    sendDataViaDataChannel(input_message.value);
}
// ---------------------------------------------------------------------------------

// Value
var local_peer = null;
var localstream = null;

var sendChannel = null;
// ---------------------------------------------------------------------------------
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

function onWsMessage(messageEvt) {
    console.info(messageEvt);

    var obj = JSON.parse(messageEvt.data);
    if (obj.code == '99') {
        alert(obj.msg);
    }
    else if (obj.code == '01') {
        // start
        console.info('start in onWsMessage');
        onOffer();
    }
    else if (obj.code == '00') {
        receiveAnswer(obj.msg);
    }    
    else {
        alert('unknown error in onWsMessage');
    }    
}

function onStart() {
    var cfg = {
        iceTransportPolicy: "all", // set to "relay" to force TURN.
        iceServers: [
        ]
    };
    // cfg.iceServers.push({urls: "stun:stun.l.google.com:19302"});
    // cfg.iceServers.push({
    //     urls: "turn:webrtc.moberan.com",
    //     username: "zoops", credential: "1234"
    // });

    local_peer = new RTCPeerConnection(cfg);
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

    var dataConstraint = {
        reliable: false
    };
    sendChannel = local_peer.createDataChannel('sendDataChannel', dataConstraint);
    trace('Created send data channel');
    console.log("Channel state: " + sendChannel.readyState);

    sendChannel.onopen  = cbChannelStateChange;
    sendChannel.onclose = cbChannelStateChange;
    sendChannel.onmessage = function(event){
        console.info('sendChannel.onmessage : ' + event.data);
        document.querySelector("div#receive").innerHTML += '<br/>' + event.data;
    };

    var url = 'ws://127.0.0.1:3001/room/' + roodId.value;
    // var url = 'wss://zoops-webrtc-01.herokuapp.com/room/' + roodId.value;
    g_mc_ws_component.connect(url, onWsMessage);
    
    trace('## start success = create RTCPeerConnection and set callback ');
}

function cbChannelStateChange() {
    var readyState = sendChannel.readyState;
    trace('sendChannel state is: ' + readyState);
}

function sendDataViaDataChannel(data) {
    sendChannel.send(data);
    document.querySelector("div#receive").innerHTML += '<br/>' + data;
    trace('Sent Data: ' + data);
}

function onOffer() {
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

    trace('## createOffer success');
}

function receiveAnswer(sdpString) {
    trace('receiveAnswer');
    var descObject = {
        type: 'answer',
        sdp: sdpString
    };
    local_peer.setRemoteDescription(descObject);
}

function cbCreateOfferError(error) {
    trace('Failed to create session description: ' + error.toString());
    stop();
}

function cbCreateOfferSuccess(desc) {
    console.info(desc);

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
    if (sendChannel != null)
        sendChannel.close();
    sendChannel = null;

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
    g_mc_ws_component.sendMessage(descObject.sdp);
}
