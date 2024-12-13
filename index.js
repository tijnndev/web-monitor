const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const express = require('express');
const axios = require('axios');
const cron = require('node-cron');
const WebSocket = require('ws');
const config = require('./config');
const app = express();

const websites = config.websites;
const channelID = config.discord.channelID;
const token = config.discord.token;
const clientId = config.discord.clientId;  // Your bot's client ID
const guildId = config.discord.guildId;  // Optional: Specify a guild ID for testing commands

const wss = new WebSocket.Server({ port: 8082 });

const broadcastToClients = (message) => {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ alert: message }));
    }
  });
};

const checkWebsites = async () => {
  let statusMessage = 'Website Status Check:\n';

  for (let website of websites) {
    try {
      const response = await axios.get(website, { timeout: 5000 });
      if (response.status === 200) {
        statusMessage += `${website}: ONLINE\n`;
      } else {
        statusMessage += `${website}: OFFLINE\n`;
        sendAlertToDiscord(website);  // If the website is offline, send an alert.
      }
    } catch (error) {
      statusMessage += `${website}: OFFLINE\n`;
      sendAlertToDiscord(website);  // If the request fails, send an alert.
    }
  }

  return statusMessage;
};

const sendAlertToDiscord = (website) => {
  const alertMessage = `ALERT: ${website} is offline!`;

  const channel = client.channels.cache.get(channelID);
  if (channel) {
    channel.send(alertMessage);
  }

  broadcastToClients(alertMessage);
};

cron.schedule('0 0 * * *', () => {
  console.log('Checking websites...');
  checkWebsites();
});

app.get('/status', (req, res) => {
  res.json({
    status: 'Monitoring active',
    websites: websites,
  });
});

app.listen(3000, () => {
  console.log('Website monitoring API is running on http://localhost:3000');
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent
  ]
});

const rest = new REST({ version: '10' }).setToken(token);

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),  // Register the command in a specific guild for testing
      {
        body: [
          {
            name: 'status',
            description: 'Check the status of the website monitoring system',
          },
        ],
      }
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'status') {
    await interaction.deferReply();
    const statusMessage = await checkWebsites();
    await interaction.followUp(statusMessage);
  }
});

client.login(token);
