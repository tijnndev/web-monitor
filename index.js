const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const config = require('./config');
const { checkWebsites } = require('./websiteMonitor');
const { sendAlertToDiscord } = require('./discord');
const cron = require('node-cron');
const dotenv = require('dotenv');
const axios = require('axios');
dotenv.config();

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

const sendBroadcast = async (title, body) => {
  const broadcastURL = process.env.BROADCAST_URL;
  const secret = process.env.BROADCAST_SECRET;
  const serviceId = parseFloat(process.env.SERVICE_ID);

  if (!broadcastURL) {
    console.error('Broadcast URL is not configured');
    return;
  }

  const payload = {
    title,
    body,
    serviceId,
    secret
  };

  try {
    const response = await axios.post(`${broadcastURL}/services/broadcast`, payload);
    console.log(`Broadcast sent: ${response.statusText}`);
  } catch (error) {
    console.error('Failed to send broadcast:', error.message);
  }
};

const sendAlertToClientsAndPushNotifications = async (websiteName) => {
  const alertMessage = `ALERT: ${websiteName} is offline!`;

  sendAlertToDiscord(websiteName);

  broadcastToClients(alertMessage);

  let title = `Website Down: ${websiteName}`
  let body = `${websiteName} is currently offline.`
  await sendBroadcast(title, body);
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

  sendBroadcast(title, body);

  res.status(200).json({ message: 'Push notification sent successfully' });
});

server.listen(port, () => {
  console.log(`Website monitoring API and WebSocket server are running on http://localhost:${port}`);
});
