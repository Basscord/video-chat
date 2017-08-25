# Video Chat

Define your RTCConfiguration. This is passed into your RTCPeerConnection, and contains your ice servers
```javascript
  /** @type {RTCConfiguration} */
  const peerConnectionConfig = {
    'iceServers': [{
      'urls': ['stun:stun.l.google.com:19302']
    }]
  };
```
Use your RTCConfig when instantiating RTCPeerConnection:
```javascript
  /** @type {RTCPeerConnection} */
  peerConnection = new RTCPeerConnection(peerConnectionConfig);
  peerConnection.onicecandidate = handleIceCandidate;
  peerConnection.onaddstream = handleRemoteStreamAdded; // deprecated but well supported
```
Define your media constraints:
```javascript
  /** @type {MediaStreamConstraints} */
  const mediaConstraints = {
    video: {
      facingMode: "user" // "user" | "environment"
    },
    audio: true
  };
```
Get user's media devices:
```javascript
  navigator.mediaDevices.getUserMedia(mediaConstraints)
  .then(getUserMediaSuccess)
  .catch(getUserMediaError);
```
Display local media on browser:
```javascript
  function getUserMediaSuccess(stream) {
    if (localVideo instanceof HTMLVideoElement) {
      localVideo.srcObject = stream;
    }
```
Add the stream to your RTCPeerConnection instance, and signal that you are ready:
```javascript
    peerConnection.addStream(stream);
    socket.emit('message', 'ready');
  }
```
On the other client:
```javascript
  socket.on('message', function (message) {
    if (message === 'ready') {
      otherPersonReady = true;
      if (everythingReady()) {
        offer();
        offered = true;
      }
    }
```
Everything ready?
```javascript
  function everythingReady() {
    return Boolean(otherPersonReady && peerConnection && peerConnection.getLocalStreams().length && isOfferer && !offered);
  }
```
Offer:
```javascript
  function offer() {
    peerConnection.createOffer()
    .then(x => peerConnection.setLocalDescription(x))
    .then(() => socket.emit('message', peerConnection.localDescription))
    .catch(e => console.error(e));
  }
```
On the other client:
```javascript
  socket.on('message', function (message) {
    if (message.type === 'offer') {
      offered = true;
      peerConnection.setRemoteDescription(message)
      .then(() => peerConnection.createAnswer())
      .then(x => peerConnection.setLocalDescription(x))
      .then(() => socket.emit('message', peerConnection.localDescription))
      .catch(e => console.error(e));
    }
```
Back on the first client:
```javascript
  socket.on('message', function (message) {
    if (message.type === 'answer' && offered) {
      peerConnection.setRemoteDescription(message);
      .catch(e => console.error(e));
    }
```
And:
```javascript
  peerConnection = new RTCPeerConnection(peerConnectionConfig);
  peerConnection.onaddstream = handleRemoteStreamAdded;
  // ...
  function handleRemoteStreamAdded(event) {
    if (remoteVideo instanceof HTMLVideoElement) {
      remoteVideo.srcObject = event.stream;
    }
  }
```
As soon as you set local description, ice candidates started gathering
```javascript
  peerConnection = new RTCPeerConnection(peerConnectionConfig);
  peerConnection.onicecandidate = handleIceCandidate;
  // ...
  function handleIceCandidate(event) {
    if (event.candidate) {
      socket.emit('message', {
        type: 'candidate',
        label: event.candidate.sdpMLineIndex,
        id: event.candidate.sdpMid,
        candidate: event.candidate.candidate});
    }
  }
```
And on the other side:
```javascript
  socket.on('message', function (message) {
    if (message.type === 'candidate') {
      peerConnection.addIceCandidate(new RTCIceCandidate({
        sdpMLineIndex: message.label,
        candidate: message.candidate
      }))
      .catch(e => console.error(e));
    }
```
