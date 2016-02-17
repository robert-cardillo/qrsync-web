var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.OPENSHIFT_NODEJS_PORT || 8000;

app.use(express.static(__dirname + '/public'));

app.post('/pair', function (req, res) {
	console.log('pairing..');
});

app.post('/send', function (req, res) {
	console.log('data received');
});


io.on('connection', function (socket) {
	socket.emit('qr', 'qrdata');

	socket.on('send', function (msg) {
		console.log('sending data..');
	});
});

http.listen(port, function () {
	console.log('listening on *:' + port);
});
