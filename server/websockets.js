/* eslint-disable @typescript-eslint/no-require-imports */
const expressWS = require('express');
const http = require('http');
const socketIo = require('socket.io');
const corsWS = require('cors');

const appWS = expressWS();
appWS.use(corsWS({
  origin: 'http://localhost:3000'
}));
const serverWS = http.createServer(appWS);
const io = socketIo(serverWS, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const clients = new Set();

io.on('connection', (socket) => {
  clients.add(socket);
  console.log('Client connected');

  socket.emit('INIT', { data: 'Connection established' });

  socket.on('message', (message) => {
    console.log(`Received message: ${message}`);
  });

  socket.on('disconnect', () => {
    clients.delete(socket);
    console.log('Client disconnected');
  });
});

function broadcast(data) {
  clients.forEach((client) => {
    if (client.connected) {
			client.emit(data);
      console.log(`Broadcasted with message: ${data}`);
    }
  });
}

serverWS.listen(3002, () => {
  console.log('WebSocket server running on port 3002');
});

module.exports = {
  broadcast
};
