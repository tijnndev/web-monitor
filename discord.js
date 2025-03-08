const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder } = require('discord.js');
const config = require('./config');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const rest = new REST({ version: '10' }).setToken(config.discord.token);

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
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

const sendAlertToDiscord = (websiteName) => {
  const alertMessage = `ALERT: ${websiteName} is offline!`;

  const channel = client.channels.cache.get(config.discord.channelID);
  if (channel) {
    channel.send(alertMessage);
  }
};

module.exports = { sendAlertToDiscord };
