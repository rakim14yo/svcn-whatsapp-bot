const express = require('express');
const { getCurrentQR } = require('./bot');

function startKeepAlive() {
  const app = express();
  const port = process.env.PORT || 3000;

  app.get('/', function(req, res) {
    res.json({ status: 'online', service: 'SVCN WhatsApp Bot', time: new Date().toISOString() });
  });

  app.get('/health', function(req, res) {
    res.json({ ok: true });
  });

  app.get('/qr', function(req, res) {
    var qr = getCurrentQR();
    if (!qr) {
      return res.send('<h2>No QR code available. Bot may already be connected.</h2>');
    }
    res.send(
      '<!DOCTYPE html><html><head><title>SVCN Bot QR</title>' +
      '<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script></head>' +
      '<body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#111;color:#fff;">' +
      '<h2>Scan with WhatsApp Bot Number</h2>' +
      '<div id="qrcode" style="background:white;padding:20px;border-radius:10px;"></div>' +
      '<p style="margin-top:20px;color:#aaa;">Refresh page if QR expires</p>' +
      '<script>new QRCode(document.getElementById("qrcode"), { text: "' + qr.replace(/\\/g, '\\\\') + '", width: 300, height: 300 });</script>' +
      '</body></html>'
    );
  });

  app.listen(port, function() {
    console.log('Keep-alive server running on port ' + port);
    console.log('UptimeRobot -> ping: https://your-app.railway.app/health');
  });
}

module.exports = { startKeepAlive };
