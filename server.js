var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var fs = require('fs');
var API_KEY = process.env.API_KEY || fs.readFileSync('api.key').toString();
var gcm = require('node-gcm');
var sender = new gcm.Sender(API_KEY);

var port = process.env.OPENSHIFT_NODEJS_PORT || 8000;
var pairs = {};

app.use(express.static(__dirname + '/public'));

app.post('/pair', function (req, res) {
	// TODO: if token exists, add registration_id to pairs[token]
});

app.post('/unpair', function (req, res) {
	// TODO: unpair socket and registration_id
});

app.post('/send', function (req, res) {
	// TODO: send received data to pairs[token].socket
});

io.on('connection', function (socket) {
	var token = generateToken();
	pairs[token] = {
		'socket' : socket
	};
	socket.token = token;
	socket.emit('qr', token);

	socket.on('send', function (data) {
		var registration_id = pairs[socket.token].registration_id;

		if (registration_id === undefined) {
			socket.emit('error', 'E_SOCKET_NOT_PAIRED');
			return;
		}

		var message = new gcm.Message({
				'priority' : 'high',
				'data' : {
					'message' : data
				}
			});

		sender.send(message, {
			registrationTokens : [registration_id]
		}, function (err, response) {
			if (err) {
				console.error(err);
			} else {
				if (response.canonical_ids > 0) {
					pairs[socket.token].registration_id = response.results[0].registration_id;
				}
			}
		});

	});

	socket.on('disconnect', function () {
		var token = socket.token;
		var registration_id = pairs[token].registration_id;
		delete pairs[token];
		delete socket['token'];
		// TODO: push unpair event to registration_id
	});
});

http.listen(port, function () {
	console.log('listening on *:' + port);
});

function generateToken() {
	do {
		var token = Math.random().toString(36).substr(2);
	} while (pairs[token] !== undefined);
	return token;
}
