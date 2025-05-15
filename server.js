const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let waitingUser = null;

io.on("connection", (socket) => {
  socket.on("ready", () => {
    if (waitingUser) {
      // Pair them
      socket.emit("peer", waitingUser);
      io.to(waitingUser).emit("peer", socket.id);
      waitingUser = null;
    } else {
      waitingUser = socket.id;
    }
  });

  socket.on("signal", ({ to, signal }) => {
    io.to(to).emit("signal", { from: socket.id, signal });
  });

  socket.on("disconnect", () => {
    if (waitingUser === socket.id) {
      waitingUser = null;
    }
  });
});

server.listen(3000, () => {
  console.log("Server listening on http://localhost:3000");
});
