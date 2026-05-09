const express = require('express');

function startKeepAlive() {
  const app = express();
  const port = process.env.PORT || 3000;

  app.get('/', (req, res) => {
    res.json({
      status: 'online',
      service: 'SVCN WhatsApp Bot',
      time: new Date().toISOString()
    });
  });

  app.get('/health', (req, res) => {
    res.json({ ok: true });
  });

  app.listen(port, () => {
    console.log(`🌐 Keep-alive server running on port ${port}`);
    console.log(`   UptimeRobot → ping: https://your-app.railway.app/health`);
  });
}

module.exports = { startKeepAlive };
