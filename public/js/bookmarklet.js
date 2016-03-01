var s=document.createElement('SCRIPT');
s.type='text/javascript';
s.src='https://qrsync-bulut.rhcloud.com/s?m='+encodeURIComponent(''+window.getSelection()||window.location.href)+'&r='+Math.random();
document.getElementsByTagName('head')[0].appendChild(s);