$(document).ready(function () {
	if (window.location.protocol == "http:") {
		window.location = "https:" + window.location.host;
		return;
	}

	$('#send').hide();
	$('#sendForm').submit(function (e) {
		e.preventDefault();
		var data = $('#data').val();
		if (data.length > 0) {
			socket.emit('send', data);
			$('#data').val('').focus();
		}
	});

	var socket = io('//:8443');
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
		setCookie("token", data, 30);
	});
	socket.on('pair', function (queue) {
		$('#qrcode').hide();
		$('#send').show();
		queue.forEach(function (data) {
			data = escapeHtml(data);
			data = extractLinks(data);
			$("#history").prepend($('<li>').html(data));
		});
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.register('sw.js').then(function (reg) {
				reg.pushManager.subscribe({
					userVisibleOnly : true
				}).then(function (sub) {
					socket.emit('push-id', sub.endpoint.split("/").slice(-1) + '');
				});
			}).catch (function (err) {
				console.log(err);
			});
		}
		Notification.requestPermission();
	});
	socket.on('data', function (data) {
		data = escapeHtml(data);
		data = extractLinks(data);
		$("#history").prepend($('<li>').html(data));
	});
	socket.on('fail', function (data) {
		alert('ERROR: ' + data);
	});
	socket.on('disconnect', function () {
		window.location.reload();
	});
	window.onbeforeunload = function (e) {
		socket.disconnect();
	}

	socket.emit('try-remember', getCookie("token"));
});
