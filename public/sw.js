self.addEventListener('install', function (event) {
	self.skipWaiting();
});
self.addEventListener('push', function (event) {
	var title = 'QRSync';
	event.waitUntil(
		self.registration.showNotification(title, {
			body : 'Click to see the notification queue',
			icon : 'images/icon.png',
			tag : 'qrsync'
		}));
});
self.addEventListener('notificationclick', function (event) {
	event.notification.close();
	var url = 'https://qrsync-bulut.rhcloud.com/';
	event.waitUntil(
		clients.matchAll({
			type : 'window'
		})
		.then(function (windowClients) {
			for (var i = 0; i < windowClients.length; i++) {
				var client = windowClients[i];
				if (client.url === url && 'focus' in client) {
					return client.focus();
				}
			}
			if (clients.openWindow) {
				return clients.openWindow(url);
			}
		}));
});
