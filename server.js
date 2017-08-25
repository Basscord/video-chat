const fs = require('fs');
const https = require('https');
const express = require('express');
const app = express();
const port = 443;

const credentials = {
    key: fs.readFileSync('/path/to/your/privkey.pem', 'utf8'),
    cert: fs.readFileSync('/path/to/your/fullchain.pem', 'utf8')
};

const server = https.createServer(credentials, app);
const io = require('socket.io')(server);
const RoomService = require('./RoomService')(io);
io.sockets.on('connection', RoomService.listen);
io.sockets.on('error', e => console.log(e));
app.use(express.static(__dirname + '/public'));
app.get('*', function(req, res) {
    res.sendFile(`${__dirname}/public/index.html`);
});
server.listen(port, () => console.log(`Server is running on port ${port}`));
