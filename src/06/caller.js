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

// ---------------------------------------------------------------------------------
// Value
var local_peer = null;
// var SIGNAL_SERVER_HTTP_URL = 'https://zoops-webrtc-01.herokuapp.com';
// var SIGNAL_SERVER_WS_URL = 'wss://zoops-webrtc-01.herokuapp.com';
var SIGNAL_SERVER_HTTP_URL = 'http://localhost:3001';
var SIGNAL_SERVER_WS_URL = 'ws://localhost:3001';

// ---------------------------------------------------------------------------------
function onChangeNick(){
    g_mc_ws_component.sendMessage(JSON.stringify(
        { type : '88', nick : vid1_nick.value }
    ));
}

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
        onOffer();
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
        receiveAnswer(obj.msg);
    }    
    else {
        alert('unknown error in onWsMessage');
    }    
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

function cbGotStream(stream) {
    trace('Received local stream');
    app.$data.localstream = stream;
    vid1.srcObject = stream;
};

var app = new Vue({
    el: '#app',
    data: {
        localstream : null, 
        rooms : [
        ],
        roomId : '',
        pwd : ''
    },
    created: function () {
        navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true
            })
            .then(cbGotStream)
            .catch(function (e) {
                alert('getUserMedia() error: ' + e);
            });
    },
    methods: {
        onClickRoom : function (id) {
        app.roomId = id;
        },
        onUpdateRoomList : function(event) {
            app.$http.get(window.SIGNAL_SERVER_HTTP_URL + '/roomlist').then(response => {
            app.rooms = response.body;
            }, response => {
            alert(response);
            });          
        },
        onClickChangeNick : function(event) {
            alert('onClickChangeNick');
        },
        onStart : function() {
            var url = SIGNAL_SERVER_WS_URL + '/room/' + app.roomId + '?pwd=' + app.pwd;
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

            app.localstream.getTracks().forEach(
                function (track) {
                    local_peer.addTrack(
                        track,
                        app.localstream
                    );
                }
            );        
            trace('## start success = create RTCPeerConnection and set callback ');
        }      
    }
  });


