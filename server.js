const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let waitingUser = null;

io.on("connection", (socket) => {
  if (waitingUser) {
    // Pair the users
    socket.to(waitingUser).emit("peer", socket.id);
    socket.emit("peer", waitingUser);
    waitingUser = null;
  } else {
    waitingUser = socket.id;
  }

  socket.on("signal", (data) => {
    io.to(data.to).emit("signal", { from: socket.id, signal: data.signal });
  });

  socket.on("disconnect", () => {
    if (waitingUser === socket.id) {
      waitingUser = null;
    }
    socket.broadcast.emit("peer-disconnected", socket.id);
  });
});

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
