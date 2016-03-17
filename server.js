var express = require('express');
var favicon = require('serve-favicon');
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

app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(express.static(__dirname + '/public'));

app.post('/pair', function (req, res) {
	var token = req.body.token;
	var registration_id = req.body.registration_id;

	if (!pairs[token]) {
		res.json({
			'status' : 'fail',
			'error' : 'E_INVALID_TOKEN'
		});
		return;
	}

	if (pairs[token].registration_id) {
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

	pairs[token].socket.emit('pair', pairs[token].queue);
});

app.post('/unpair', function (req, res) {
	var token = req.body.token;
	var registration_id = req.body.registration_id;

	if (!pairs[token]) {
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

	if (!pairs[token]) {
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
		pairs[token].queue.push(data);
		res.json({
			'status' : 'success',
			'message' : 'Added to notification queue'
		});
	}

	if (pairs[token].push_id) {
		sendGCM(pairs[token].push_id, {
			'message' : data
		}, function (err, response) {
			if (err) {
				console.error(err);
			} else {
				if (response.canonical_ids > 0) {
					pairs[token].push_id = response.results[0].registration_id;
				}
			}
		});
	}
});

app.get('/s', function (req, res) {
	var token = req.cookies.token;
	var message = req.query.m;
	if (message && pairs[token] && pairs[token].registration_id) {
		sendGCM(pairs[token].registration_id, {
			'message' : message
		}, function (err, response) {
			if (err) {
				console.error(err);
			} else {
				if (response.canonical_ids > 0) {
					pairs[token].registration_id = response.results[0].registration_id;
				}
			}
		});
		res.send("");
	} else {
		//res.send("(function(){var s=document.createElement('SCRIPT');s.type='text/javascript';s.src='https://qrsync-bulut.rhcloud.com/js/popup.js?r='+Math.random();document.getElementsByTagName('head')[0].appendChild(s)})()");
		res.send("alert('QRSync: Please pair your device and your browser first.'); window.open('https://qrsync-bulut.rhcloud.com/','_blank');");
	}
});

io.on('connection', function (socket) {
	socket.on('try-remember', function (data) {
		if (data && pairs[data] && pairs[data].registration_id && !pairs[data].socket) {
			socket.token = data;
			pairs[data].socket = socket;
			socket.emit('pair', pairs[data].queue);
			pairs[data].queue = [];
		} else {
			var token = generateToken();
			pairs[token] = {
				'socket' : socket,
				'queue' : []
			};
			socket.token = token;
			socket.emit('qr', token);
		}
	});

	socket.on('push-id', function (data) {
		var token = socket.token;
		pairs[token].push_id = data;
	});

	socket.on('send', function (data) {
		var token = socket.token;

		if (!pairs[token].registration_id) {
			socket.emit('fail', 'E_SOCKET_NOT_PAIRED');
			return;
		}

		sendGCM(pairs[token].registration_id, {
			'message' : data
		}, function (err, response) {
			if (err) {
				socket.emit('fail', err);
				console.error(err);
			} else {
				if (response.canonical_ids > 0) {
					pairs[token].registration_id = response.results[0].registration_id;
				}
			}
		});
	});

	socket.on('disconnect', function () {
		var token = socket.token;
		if (token && pairs[token] && pairs[token].registration_id) {
			/*sendGCM(pairs[token].registration_id, {
			'action' : 'unpair'
			}, function (err, response) {
			delete pairs[token];
			delete socket.token;
			});*/
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
	} while (pairs[token]);
	return token;
}

function sendGCM(registration_id, data, callback) {
	var message = new gcm.Message({
			'priority' : 'high',
			'data' : data
		});

	sender.send(message, {
		registrationTokens : [registration_id]
	}, callback);
}
