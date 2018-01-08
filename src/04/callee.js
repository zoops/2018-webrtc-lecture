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
var audioInputSelect = document.querySelector('select#audioSource');
var audioOutputSelect = document.querySelector('select#audioOutput');
var videoSelect = document.querySelector('select#videoSource');
var selectors = [audioInputSelect, audioOutputSelect, videoSelect];

var btn_desktop = document.querySelector('#btn_desktop');
var btn_toggle_video = document.querySelector('#btn_toggle_video');
var btn_toggle_sound = document.querySelector('#btn_toggle_sound');
var btn_toggle_mic = document.querySelector('#btn_toggle_mic');

btn_desktop.addEventListener('click', onToggleDesktop);
btn_toggle_video.addEventListener('click', onToggleVideo);
btn_toggle_sound.addEventListener('click', onToggleSound);
btn_toggle_mic.addEventListener('click', onToggleMic);

// Value
var local_peer = null;
var localstream = null;
var remotestream = null;
// ---------------------------------------------------------------------------------
function gotDevices(deviceInfos) {
    // Handles being called several times to update labels. Preserve values.
    var values = selectors.map(function(select) {
      return select.value;
    });
    selectors.forEach(function(select) {
      while (select.firstChild) {
        select.removeChild(select.firstChild);
      }
    });
    for (var i = 0; i !== deviceInfos.length; ++i) {
      var deviceInfo = deviceInfos[i];
      var option = document.createElement('option');
      option.value = deviceInfo.deviceId;
      if (deviceInfo.kind === 'audioinput') {
        option.text = deviceInfo.label ||
            'microphone ' + (audioInputSelect.length + 1);
        audioInputSelect.appendChild(option);
      } else if (deviceInfo.kind === 'audiooutput') {
        option.text = deviceInfo.label || 'speaker ' +
            (audioOutputSelect.length + 1);
        audioOutputSelect.appendChild(option);
      } else if (deviceInfo.kind === 'videoinput') {
        option.text = deviceInfo.label || 'camera ' + (videoSelect.length + 1);
        videoSelect.appendChild(option);
      } else {
        console.log('Some other kind of source/device: ', deviceInfo);
      }
    }
    selectors.forEach(function(select, selectorIndex) {
      if (Array.prototype.slice.call(select.childNodes).some(function(n) {
        return n.value === values[selectorIndex];
      })) {
        select.value = values[selectorIndex];
      }
    });
}
function handleError(error) {
    console.log('navigator.getUserMedia error: ', error);
}
navigator.mediaDevices.enumerateDevices().then(gotDevices).catch(handleError);

function attachSinkId(element, sinkId) {
    if (typeof element.sinkId !== 'undefined') {
        element.setSinkId(sinkId)
        .then(function() {
        console.log('Success, audio output device attached: ' + sinkId);
        })
        .catch(function(error) {
        var errorMessage = error;
        if (error.name === 'SecurityError') {
            errorMessage = 'You need to use HTTPS for selecting audio output ' +
                'device: ' + error;
        }
        console.error(errorMessage);
        // Jump back to first output device in the list as it's the default.
        audioOutputSelect.selectedIndex = 0;
        });
    } else {
        console.warn('Browser does not support output device selection.');
    }
}

function changeAudioDestination() {
    var audioDestination = audioOutputSelect.value;
    attachSinkId(vid2, audioDestination);
}

function start() {
    if (window.stream) {
      window.stream.getTracks().forEach(function(track) {
        track.stop();
      });
    }
    var audioSource = audioInputSelect.value;
    var videoSource = videoSelect.value;
    var constraints = {
      audio: {deviceId: audioSource ? {exact: audioSource} : undefined},
      video: {deviceId: videoSource ? {exact: videoSource} : undefined}
    };

    navigator.mediaDevices.getUserMedia(constraints).
        then(cbGotStream).then(gotDevices).catch(handleError);
}

audioInputSelect.onchange = start;
audioOutputSelect.onchange = changeAudioDestination;
videoSelect.onchange = start;

start();
// ---------------------------------------------------------------------------------
function startDesktop() {
    if (window.stream) {
        window.stream.getTracks().forEach(function(track) {
          track.stop();
        });
    }

    getScreenId((error, sourceId, screenConstraints) => {
    if (error === 'not-installed') return alert('The extension is not installed');
    if (error === 'permission-denied') return alert('Permission is denied.');
    if (error === 'not-chrome') return alert('Please use chrome.');

    navigator.mediaDevices.getUserMedia(screenConstraints)
        .then(stream => {
            window.stream = stream;
            vid1.srcObject = stream;
            localstream = stream;
        })
        .catch(err => {
            console.log(err);
        });
    });
}

var isDesktop = false;
function onToggleDesktop(){

    if (isDesktop == false) {
        startDesktop();
    } else {
        start();
    }
    isDesktop = !isDesktop;    
}

function onToggleVideo() {
    if (localstream) {
        var items = localstream.getVideoTracks();
        if (items && items.length > 0)
          items[0].enabled = !items[0].enabled;
    }
  
}
function onToggleSound() {
    if (remotestream) {
        var items = remotestream.getAudioTracks();
        if (items && items.length > 0)
          items[0].enabled = items[0].enabled;
    }
}
function onToggleMic() {
    if (localstream) {
        var items = localstream.getAudioTracks();
        if (items && items.length > 0)
          items[0].enabled = items[0].enabled;
    }
}

function cbGotStream(stream) {
    trace('Received local stream');
    window.stream = stream;
    vid1.srcObject = stream;
    localstream = stream;

    return navigator.mediaDevices.enumerateDevices();
}

function cbGotRemoteStream(evt) {
    trace('## Received remote stream try');
    if (vid2.srcObject !== evt.streams[0]) {
        vid2.srcObject = evt.streams[0];
        remotestream = evt.streams[0];
        trace('## Received remote stream success');
    }
}

function onStart() {
    var cfg = {
        iceTransportPolicy: "all", // set to "relay" to force TURN.
        iceServers: [
        ]
    };
    // cfg.iceServers.push({urls: "stun:stun.l.google.com:19302"});

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