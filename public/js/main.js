var socket;

$(document).ready(function () {
	socket = io('//:8000');
	socket.on('qr', function (data) {
		$('#qrcode').html('');
		var qrcode = new QRCode('qrcode', {
				text : data,
				width : 256,
				height : 256,
				colorDark : '#000000',
				colorLight : '#ffffff',
				correctLevel : QRCode.CorrectLevel.H
			});
	});
	socket.on('data', function (data) {
		console.log(data);
	});
	window.onbeforeunload = function (e) {
		socket.disconnect();
	}
});
