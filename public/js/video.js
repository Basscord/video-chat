(function() {
  /** @type {SocketIOClient.Socket} */
  const socket = io('https://video-chat.basscord.co');
  const localVideo = document.querySelector('#localVideo');
  const remoteVideo = document.querySelector('#remoteVideo');
  let room = !location.pathname.substring(1) ? 'home' : location.pathname.substring(1);
  let getUserMediaAttempts = 5;
  let gettingUserMedia = false;
  let otherPersonReady = false;
  let isOfferer = false;
  let offered = false;

  /** @type {RTCPeerConnection} */
  let peerConnection;

  /** @type {RTCConfiguration} */
  const peerConnectionConfig = {
    'iceServers': [{
      'urls': ['stun:stun.l.google.com:19302']
    }]
  };

  /** @type {MediaStreamConstraints} */
  const mediaConstraints = {
    audio: true,
    video: { facingMode: "user" }
  };

  socket.on('created', function(room) {
    isOfferer = true;
  });

  socket.on('full', function(room) {
    alert('Room ' + room + ' is full');
  });

  socket.on('bye', function(room) {
    handleRemoteHangup();
  });

  if (room && !!room) {
    socket.emit('join', room);
  }

  window.onunload = window.onbeforeunload = function() {
    socket.close();
  };

  socket.on('message', function (message) {
    if (message === 'ready') {
      otherPersonReady = true;
      if (everythingReady()) {
        offer();
        offered = true;
      }
    } else if (message.type === 'offer') {
      offered = true;
      peerConnection.setRemoteDescription(message)
      .then(() => peerConnection.createAnswer())
      .then(x => peerConnection.setLocalDescription(x))
      .then(() => socket.emit('message', peerConnection.localDescription))
      .catch(e => console.warn(e));
    } else if (message.type === 'answer') {
      peerConnection.setRemoteDescription(message)
      .catch(e => console.warn(e));
    } else if (message.type === 'candidate') {
      peerConnection.addIceCandidate(new RTCIceCandidate({
        sdpMLineIndex: message.label,
        candidate: message.candidate
      }))
      .catch(e => console.error(e));
    }
  });

  function getUserMediaSuccess(stream) {
    gettingUserMedia = false;
    if (localVideo instanceof HTMLVideoElement) {
      !localVideo.srcObject && (localVideo.srcObject = stream);
    }

    peerConnection.addStream(stream);
    socket.emit('message', 'ready');
    if (everythingReady()) {
      offer();
      offered = true;
    }
  }

  function everythingReady() {
    return Boolean(otherPersonReady && peerConnection && peerConnection.getLocalStreams().length && isOfferer && !offered);
  }

  function getUserMediaError(error) {
    console.error(error);
    gettingUserMedia = false;
    (--getUserMediaAttempts > 0) && setTimeout(getUserMediaDevices, 1000);
  }

  function init() {
    try {
      peerConnection = new RTCPeerConnection(peerConnectionConfig);
      peerConnection.onicecandidate = handleIceCandidate;
      peerConnection.onaddstream = handleRemoteStreamAdded;
    } catch (e) {
      console.error(e);
      alert('Failed to create PeerConnection, exception: ' + e.message);
        return;
    }
    getUserMediaDevices();
  }

  function getUserMediaDevices() {
    if (localVideo instanceof HTMLVideoElement) {
      if (localVideo.srcObject) {
        getUserMediaSuccess(localVideo.srcObject);
      } else if (!gettingUserMedia && !localVideo.srcObject) {
        gettingUserMedia = true;
        navigator.mediaDevices.getUserMedia(mediaConstraints)
        .then(getUserMediaSuccess)
        .catch(getUserMediaError);
      }
    }
  }

  function offer() {
    peerConnection.createOffer()
    .then(x => peerConnection.setLocalDescription(x))
    .then(() => socket.emit('message', peerConnection.localDescription))
    .catch(e => console.warn(e));
  }

  function handleIceCandidate(event) {
    if (event.candidate) {
      socket.emit('message', {
        type: 'candidate',
        label: event.candidate.sdpMLineIndex,
        id: event.candidate.sdpMid,
        candidate: event.candidate.candidate});
    }
  }

  function handleRemoteStreamAdded(event) {
    if (remoteVideo instanceof HTMLVideoElement) {
      remoteVideo.srcObject = event.stream;
    }
  }

  function handleRemoteHangup() {
    isOfferer = true; // You now own the room.
    offered = false;
    otherPersonReady = false;
    peerConnection && peerConnection.close();
    peerConnection = null;
    init();
  }

  init();
})();