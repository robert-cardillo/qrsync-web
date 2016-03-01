var express = require('express');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var fs = require('fs');
var API_KEY = process.env.API_KEY || fs.readFileSync('api.key').toString();
var gcm = require('node-gcm');
var sender = new gcm.Sender(API_KEY);

var port = process.env.OPENSHIFT_NODEJS_PORT || 8443;
var ip = process.env.OPENSHIFT_NODEJS_IP || '192.168.137.1';
var pairs = {};

app.use(cookieParser());
app.use(bodyParser.json());
app.use(express.static(__dirname + '/public'));

app.post('/pair', function (req, res) {
	var token = req.body.token;
	var registration_id = req.body.registration_id;

	if (pairs[token] === undefined) {
		res.json({
			'status' : 'fail',
			'error' : 'E_INVALID_TOKEN'
		});
		return;
	}

	if (pairs[token].registration_id !== undefined) {
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

	pairs[token].socket.emit('pair');
});

app.post('/unpair', function (req, res) {
	var token = req.body.token;
	var registration_id = req.body.registration_id;

	if (pairs[token] === undefined) {
		res.json({
			'status' : 'success'
		});
		return;
	}

	if (pairs[token].registration_id !== registration_id) {
		res.json({
			'status' : 'fail',
			'error' : 'E_MISSMATCHED_REGID'
		});
		return;
	}

	if (pairs[token].socket) {
		delete pairs[token].socket.token;
		pairs[token].socket.disconnect();
	}
	delete pairs[token];

	res.json({
		'status' : 'success'
	});
});

app.post('/send', function (req, res) {
	var token = req.body.token;
	var registration_id = req.body.registration_id;
	var data = req.body.data;

	if (pairs[token] === undefined) {
		res.json({
			'status' : 'fail',
			'error' : 'E_INVALID_TOKEN'
		});
		return;
	}

	if (pairs[token].registration_id !== registration_id) {
		res.json({
			'status' : 'fail',
			'error' : 'E_MISSMATCHED_REGID'
		});
		return;
	}

	if (pairs[token].socket) {
		pairs[token].socket.emit('data', data);
		res.json({
			'status' : 'success',
			'message' : 'Send successful'
		});
	} else {
		res.json({
			'status' : 'success',
			'message' : 'Please open the webpage first!'
		});
	}
});

app.get('/s', function (req, res) {
	var token = req.cookies.token;
	var message = req.query.m;
	if (message && pairs[token] && pairs[token].registration_id) {
		sendGCM(token, {
			'message' : message
		}, function (err, response) {});
		res.send("");
	} else {
		res.send("alert('QRSync: Please pair your device and your browser first.'); window.open('https://qrsync-bulut.rhcloud.com/','_blank');");
	}
});

io.on('connection', function (socket) {
	socket.on('try-remember', function (data) {
		if (data && pairs[data] && pairs[data].registration_id && !pairs[data].socket) {
			socket.token = data;
			pairs[data].socket = socket;
			socket.emit('pair');
		} else {
			var token = generateToken();
			pairs[token] = {
				'socket' : socket
			};
			socket.token = token;
			socket.emit('qr', token);
		}
	});

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
		if (token && pairs[token] && pairs[token].registration_id !== undefined) {
			/*
			sendGCM(token, {
			'action' : 'unpair'
			}, function (err, response) {
			delete pairs[token];
			delete socket.token;
			});
			 */
			delete pairs[token].socket;
			delete socket.token;
		} else {
			delete pairs[token];
			delete socket.token;
		}
	});
});

http.listen(port, ip);

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
