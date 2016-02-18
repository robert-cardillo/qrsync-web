var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var fs = require('fs');
var API_KEY = process.env.API_KEY || fs.readFileSync('api.key').toString();
var gcm = require('node-gcm');
var sender = new gcm.Sender(API_KEY);

var port = process.env.OPENSHIFT_NODEJS_PORT || 8000;
var pairs = {};

app.use(bodyParser.json())
app.use(express.static(__dirname + '/public'));

app.post('/pair', function (req, res) {
	var token = req.body.registration_id;
	var registration_id = req.body.registration_id;

	if (pair[token] === undefined) {
		res.json({
			'status' : 'fail',
			'error' : 'E_INVALID_TOKEN'
		});
		return;
	}

	if (pair[token].registration_id !== undefined) {
		res.json({
			'status' : 'fail',
			'error' : 'E_TOKEN_ALREADY_PAIRED'
		});
		return;
	}

	pairs[token].registration_id = registration_id;
	res.json({
		'status' : 'success'
	});
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
		var token = socket.token;
		var registration_id = pairs[token].registration_id;

		if (registration_id === undefined) {
			socket.emit('fail', 'E_SOCKET_NOT_PAIRED');
			return;
		}

		sendGCM(token, {
			'message' : data
		}, function (err, response) {
			if (err)
				socket.emit('fail', err);
		});

	});

	socket.on('disconnect', function () {
		var token = socket.token;
		sendGCM(token, {
			'do' : 'unpair'
		}, function (err, response) {
			delete pairs[token];
			delete socket.token;
		});
	});
});

http.listen(port, function () {
	console.log('listening on *:' + port);
});

function generateToken() {
	do {
		var token = 'QRSYNC' + Math.random().toString(36).substr(2);
	} while (pairs[token] !== undefined);
	return token;
}

function sendGCM(token, data, callback) {
	var registration_id = pairs[token].registration_id;
	var message = new gcm.Message({
			'priority' : 'high',
			'data' : data
		});

	sender.send(message, {
		registrationTokens : [registration_id]
	}, function (err, response) {
		if (err) {
			console.error(err);
		} else {
			if (response.canonical_ids > 0) {
				pairs[token].registration_id = response.results[0].registration_id;
			}
		}
		callback(err, response);
	});
}
