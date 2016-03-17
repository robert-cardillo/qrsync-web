(function () {
	alert('QRSync: Please pair your device and your browser first.');
	var f = document.createElement('IFRAME');
	f.src = "https://qrsync-bulut.rhcloud.com/";
	f.width = 300;
	f.height = 370;
	f.style.position = 'fixed';
	f.style.left = '50%';
	f.style.marginLeft = '-150px';
	f.style.marginTop = '-100px';
	document.body.appendChild(f);

	var h = function (e) {
		if (e.keyCode == 27) {
			document.body.removeChild(f);
			document.removeEventListener("keydown", h, false);
		}
	};

	document.addEventListener("keydown", h, false);
})();
