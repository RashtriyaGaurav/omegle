const socket = io();
let localStream;
let peerConnection;
const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

// Step 1: Get local media
navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
  localStream = stream;
  localVideo.srcObject = stream;
  
  socket.emit("ready"); // Signal to server: I'm ready to connect
});

socket.on("peer", async (peerId) => {
  createPeerConnection(peerId);

  // Add local stream tracks
  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  // Create and send offer
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit("signal", { to: peerId, signal: { offer } });
});

socket.on("signal", async ({ from, signal }) => {
  if (!peerConnection) {
    createPeerConnection(from);
    // Add local tracks if needed
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });
  }

  if (signal.offer) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit("signal", { to: from, signal: { answer } });
  }

  if (signal.answer) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.answer));
  }

  if (signal.candidate) {
    await peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
  }
});

function createPeerConnection(peerId) {
  peerConnection = new RTCPeerConnection(config);

  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      socket.emit("signal", { to: peerId, signal: { candidate: event.candidate } });
    }
  };

  peerConnection.ontrack = event => {
    remoteVideo.srcObject = event.streams[0];
  };
}
