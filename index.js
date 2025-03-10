const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const config = require('./config');
const { checkWebsites } = require('./websiteMonitor');
const { readFcmTokens, writeFcmTokens } = require('./tokenManager');
const { sendAlertToDiscord } = require('./discord');
const { sendPushNotification } = require('./firebase');
const cron = require('node-cron');

const app = express();
const port = 8007;

app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const broadcastToClients = (message) => {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ alert: message }));
    }
  });
};

const sendAlertToClientsAndPushNotifications = (websiteName) => {
  const alertMessage = `ALERT: ${websiteName} is offline!`;

  sendAlertToDiscord(websiteName);

  broadcastToClients(alertMessage);

  const fcmTokens = readFcmTokens();
  fcmTokens.forEach(token => {
    sendPushNotification(token, websiteName);
  });
};

cron.schedule('0 * * * *', () => {
  console.log('Checking websites...');
  checkWebsites(sendAlertToClientsAndPushNotifications);
});

app.get('/status', (req, res) => {
  res.json({
    status: 'Monitoring active',
    websites: config.websites.map(site => ({ name: site.name, url: site.url }))
  });
});

app.get('/services', (req, res) => {
  res.json(config.websites);
});

app.get('/send-notification', (req, res) => {
  const { title, body } = req.body;

  if (!title || !body) {
    return res.status(400).json({ error: 'Title and body are required' });
  }

  const fcmTokens = readFcmTokens();
  if (fcmTokens.length === 0) {
    return res.status(400).json({ error: 'No registered tokens found' });
  }

  fcmTokens.forEach(token => {
    sendPushNotification(token, title, body);
    // sendPushNotification(token, "test", "test");
  });

  res.status(200).json({ message: 'Push notification sent successfully' });
});

app.post('/register-token', (req, res) => {
  const { token } = req.body;

  if (token) {
    const fcmTokens = readFcmTokens();
    if (!fcmTokens.includes(token)) {
      fcmTokens.push(token);
      writeFcmTokens(fcmTokens);
      res.status(200).send('Token registered successfully');
    } else {
      res.status(400).send('Token already registered');
    }
  } else {
    res.status(400).send('No token provided');
  }
});

server.listen(port, () => {
  console.log(`Website monitoring API and WebSocket server are running on http://localhost:${port}`);
});
