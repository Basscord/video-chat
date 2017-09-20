/** @type {SocketIO.Server} */
let _io;
const MAX_CLIENTS = 3;

/** @param {SocketIO.Socket} socket */
function listen(socket) {
  const io = _io;
  const rooms = io.nsps['/'].adapter.rooms;

  socket.on('join', function(room) {

    let numClients = 0;
    if (rooms[room]) {
      numClients = rooms[room].length;
    }
    if (numClients < MAX_CLIENTS) {
      socket.on('ready', function() {
        socket.broadcast.to(room).emit('ready', socket.id);
      });
      socket.on('offer', function (id, message) {
        socket.to(id).emit('offer', socket.id, message);
      });
      socket.on('answer', function (id, message) {
        socket.to(id).emit('answer', socket.id, message);
      });
      socket.on('candidate', function (id, message) {
        socket.to(id).emit('candidate', socket.id, message);
      });
      socket.on('disconnect', function() {
        socket.broadcast.to(room).emit('bye', socket.id);
      });
      socket.join(room);
    } else {
      socket.emit('full', room);
    }
  });
}

/** @param {SocketIO.Server} io */
module.exports = function(io) {
  _io = io;
  return {listen};
};