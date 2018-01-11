'use strict';

function trace(arg) {
    var now = (window.performance.now() / 1000).toFixed(3);
    console.log(now + ': ', arg);
}

// UI Element Value
var vid1 = document.querySelector('#vid1');
var vid2 = document.querySelector('#vid2');

var vid1_nick = document.querySelector('#vid1_nick');
var vid2_nick = document.querySelector('#vid2_nick');

var btn_start = document.querySelector('#btn_start');
var roomId = document.querySelector('#room_id');
var pwd = document.querySelector('#pwd');

btn_start.addEventListener('click', onStart);
// ---------------------------------------------------------------------------------
// Value
var local_peer = null;
var localstream = null;
// var SIGNAL_SERVER_HTTP_URL = 'https://zoops-webrtc-01.herokuapp.com';
// var SIGNAL_SERVER_WS_URL = 'wss://zoops-webrtc-01.herokuapp.com';
var SIGNAL_SERVER_HTTP_URL = 'http://localhost:3001';
var SIGNAL_SERVER_WS_URL = 'ws://localhost:3001';
// ---------------------------------------------------------------------------------
function onChangeNick(){
    g_mc_ws_component.sendMessage(JSON.stringify({
        type : '88', nick : vid1_nick.value
    }));
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

function onWsMessage(messageEvt) {
    console.info(messageEvt);

    var obj = JSON.parse(messageEvt.data);
    if (obj.code == '99') {
        alert(obj.msg);
    }
    else if (obj.code == '01') {
        // start
        console.info('start in onWsMessage');
        onChangeNick();
    }
    else if (obj.code == '00') {
        try {
            var obj2 = JSON.parse(obj.msg);
            if (obj2.type = '88') {
                vid2_nick.value = obj2.nick;
            }
            return;
        } catch (error) {
            
        }
        receiveOffer(obj.msg);
    }    
    else {
        alert('unknown error in onWsMessage');
    }    
}

function onStart() {
    var url = SIGNAL_SERVER_WS_URL + '/room/' + roomId.value + '?pwd=' + pwd.value;
    g_mc_ws_component.connect(url, onWsMessage);

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

    trace('## start success = create RTCPeerConnection and set callback ');
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
    desc.type = 'answer';
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

var app = new Vue({
    el: '#app',
    data: {
        rooms : [
        ],
    },
    methods: {
      onClickRoom : function (id) {
        window.roomId.value = id;
      },
      onUpdateRoomList : function(event) {
          this.$http.get(SIGNAL_SERVER_HTTP_URL + '/roomlist').then(response => {
            this.rooms = response.body;
          }, response => {
            alert(response);
          });          
      },
      onClickChangeNick : function(event) {
          alert('onClickChangeNick');
      }
    }
  })