const socket = io();
let peerConnection;
const config = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
  localVideo.srcObject = stream;

  socket.on("peer", async (peerId) => {
    peerConnection = new RTCPeerConnection(config);
    stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

    peerConnection.ontrack = e => {
      remoteVideo.srcObject = e.streams[0];
    };

    peerConnection.onicecandidate = e => {
      if (e.candidate) {
        socket.emit("signal", { to: peerId, signal: { candidate: e.candidate } });
      }
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit("signal", { to: peerId, signal: { offer } });
  });

  socket.on("signal", async ({ from, signal }) => {
    if (!peerConnection) {
      peerConnection = new RTCPeerConnection(config);
      stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

      peerConnection.ontrack = e => {
        remoteVideo.srcObject = e.streams[0];
      };

      peerConnection.onicecandidate = e => {
        if (e.candidate) {
          socket.emit("signal", { to: from, signal: { candidate: e.candidate } });
        }
      };
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
});
