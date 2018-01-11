'use strict';

function trace(arg) {
    var now = (window.performance.now() / 1000).toFixed(3);
    console.log(now + ': ', arg);
}

// UI Element Value
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
var localstream;

var receiveChannel = null;
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

function onWsMessage(messageEvt) {
    console.info(messageEvt);

    var obj = JSON.parse(messageEvt.data);
    if (obj.code == '99') {
        alert(obj.msg);
    }
    else if (obj.code == '01') {
        // start
        console.info('start in onWsMessage');
    }
    else if (obj.code == '00') {
        receiveOffer(obj.msg);
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
    localstream.getTracks().forEach(function (track) {
            local_peer.addTrack(
                track,
                localstream
            );
        }
    );
    
    local_peer.ondatachannel = cbDtatChannel;

    var url = 'ws://127.0.0.1:3001/room/' + roodId.value;
    // var url = 'wss://zoops-webrtc-01.herokuapp.com/room/' + roodId.value;
    g_mc_ws_component.connect(url, onWsMessage);

    trace('## start success = create RTCPeerConnection and set callback ');
}

function cbDtatChannel(event) {
    try
    {
        console.info('ondatachannel');

        receiveChannel = event.channel;
        receiveChannel.onmessage = function(event){
            console.info('receiveChannel.onmessage : ' + event.data);
            document.querySelector("div#receive").innerHTML += '<br/>' + event.data;
        };
        receiveChannel.onopen  = cbChannelStateChange;
        receiveChannel.onclose = cbChannelStateChange;
    }catch (e) {
        console.info(e);
    }            
};

function cbChannelStateChange() {
    var readyState = receiveChannel.readyState;
    trace('receiveChannel state is: ' + readyState);
}

function sendDataViaDataChannel(data) {
    receiveChannel.send(data);
    document.querySelector("div#receive").innerHTML += '<br/>' + data;
    trace('Sent Data: ' + data);
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
    // desc.sdp = desc.sdp.replace(/a=recvonly/g, 'a=inactive');
    // desc.type = 'pranswer';
    desc.sdp = desc.sdp.replace(/a=recvonly/g, 'a=inactive');
    desc.sdp = desc.sdp.replace(/BUNDLE audio video/g, 'BUNDLE audio video data');
    
    console.log(desc);
    local_peer.setLocalDescription(desc).then(
        cbSetLocalDescriptionSuccess,
        cbSetLocalDescriptionError
    );
}

function cbSetRemoteDescriptionSuccess() {
    trace('cbSetRemoteDescriptionSuccess success.');

    onAnswer();
}

function cbSetRemoteDescriptionError() {
    trace('cbSetRemoteDescriptionError.');
}

function receiveOffer(sdpString) {
    console.info(sdpString);

    var descObject = {
        type: 'offer',
        sdp: sdpString
    };
    local_peer.setRemoteDescription(descObject).then(
        cbSetRemoteDescriptionSuccess,
        cbSetRemoteDescriptionError,
    );    
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
    g_mc_ws_component.sendMessage(descObject.sdp);
}