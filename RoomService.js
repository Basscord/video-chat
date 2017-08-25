/** @type {SocketIO.Server} */
let _io;
const MAX_CLIENTS = 2;

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

      socket.on('disconnect', function() {
        socket.broadcast.to(room).emit('bye');
      });

      socket.on('message', function (message) {
        socket.broadcast.to(room).emit('message', message);
      });

      socket.join(room);

      if (numClients === 0) {
        socket.emit('created', room);
      }

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