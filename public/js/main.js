$(document).ready(function () {
	var socket = io('//:8000');
	socket.on('qr', function (msg) {
		$('#qrcode').html('');
		var qrcode = new QRCode('qrcode', {
				text : msg,
				colorDark : '#000000',
				colorLight : '#ffffff',
				correctLevel : QRCode.CorrectLevel.H
			})
	});
	socket.on('data', function (msg) {
		console.log(data);
	});
	window.onbeforeunload = function (e) {
		socket.disconnect()
	}
	/*
	$('#btn-refresh').on('click', function () {
		if (socket)
			socket.connect()
	});
	socket.on('connect', function () {
		$('#content-qr').removeClass('hide')
	});
	socket.on('disconnect', function () {
		$('#content-qr').addClass('hide')
	});
	*/
});
