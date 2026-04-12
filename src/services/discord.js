const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');
const db = require('./database');
const env = require('../config/env');

class DiscordService {
  constructor(config) {
    this.config = config;
    this.client = null;
    this.rest = null;
    this.isReady = false;
    this.enabled = env.DISCORD_ENABLED;
  }

  /**
   * Initialize Discord bot
   */
  async initialize() {
    if (!this.enabled) {
      logger.info('Discord bot disabled via DISCORD_ENABLED environment variable');
      return false;
    }

    if (!this.config?.discord?.token) {
      logger.warn('Discord configuration missing - Discord notifications disabled');
      return false;
    }

    try {
      this.client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent
        ]
      });

      this.rest = new REST({ version: '10' }).setToken(this.config.discord.token);

      this.client.once('ready', async () => {
        logger.info(`Discord bot logged in as ${this.client.user.tag}`);
        this.isReady = true;
        await this.registerCommands();
      });

      this.setupInteractionHandlers();

      await this.client.login(this.config.discord.token);
      return true;
    } catch (error) {
      logger.error('Failed to initialize Discord bot:', error);
      return false;
    }
  }

  /**
   * Register slash commands
   */
  async registerCommands() {
    try {
      const commands = [
        {
          name: 'status',
          description: 'Check the current status of all monitored websites'
        },
        {
          name: 'uptime',
          description: 'Get uptime statistics for a website',
          options: [
            {
              name: 'website',
              type: 3, // STRING type
              description: 'Website name',
              required: true
            },
            {
              name: 'hours',
              type: 4, // INTEGER type
              description: 'Number of hours to calculate uptime (default: 24)',
              required: false
            }
          ]
        },
        {
          name: 'history',
          description: 'Get recent check history for a website',
          options: [
            {
              name: 'website',
              type: 3, // STRING type
              description: 'Website name',
              required: true
            },
            {
              name: 'limit',
              type: 4, // INTEGER type
              description: 'Number of recent checks to show (default: 10)',
              required: false
            }
          ]
        },
        {
          name: 'incidents',
          description: 'Show active or recent incidents'
        }
      ];

      await this.rest.put(
        Routes.applicationGuildCommands(this.config.discord.clientId, this.config.discord.guildId),
        { body: commands }
      );

      logger.info('Discord slash commands registered successfully');
    } catch (error) {
      logger.error('Failed to register Discord commands:', error);
    }
  }

  /**
   * Setup interaction handlers for slash commands
   */
  setupInteractionHandlers() {
    this.client.on('interactionCreate', async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      try {
        switch (interaction.commandName) {
          case 'status':
            await this.handleStatusCommand(interaction);
            break;
          case 'uptime':
            await this.handleUptimeCommand(interaction);
            break;
          case 'history':
            await this.handleHistoryCommand(interaction);
            break;
          case 'incidents':
            await this.handleIncidentsCommand(interaction);
            break;
        }
      } catch (error) {
        logger.error('Error handling Discord command:', error);
        await interaction.reply({ 
          content: 'An error occurred while processing your command.',
          ephemeral: true 
        });
      }
    });
  }

  /**
   * Handle /status command
   */
  async handleStatusCommand(interaction) {
    const statuses = db.getAllStatuses();

    if (statuses.length === 0) {
      await interaction.reply('No websites are currently being monitored.');
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('🌐 Website Monitoring Status')
      .setColor(statuses.every(s => s.is_online) ? 0x00ff00 : 0xff0000)
      .setTimestamp();

    for (const status of statuses) {
      const emoji = status.is_online ? '✅' : '❌';
      const statusText = status.is_online ? 'ONLINE' : 'OFFLINE';
      const lastChecked = status.last_checked ? new Date(status.last_checked).toLocaleString() : 'Never';
      
      embed.addFields({
        name: `${emoji} ${status.website_name}`,
        value: `Status: ${statusText}\nLast checked: ${lastChecked}\nTotal checks: ${status.total_checks}`,
        inline: false
      });
    }

    await interaction.reply({ embeds: [embed] });
  }

  /**
   * Handle /uptime command
   */
  async handleUptimeCommand(interaction) {
    const websiteName = interaction.options.getString('website');
    const hours = interaction.options.getInteger('hours') || 24;

    // Find website by name
    const statuses = db.getAllStatuses();
    const website = statuses.find(s => s.website_name.toLowerCase().includes(websiteName.toLowerCase()));

    if (!website) {
      await interaction.reply({ content: `Website "${websiteName}" not found.`, ephemeral: true });
      return;
    }

    const stats = db.getUptimeStats(website.website_url, hours);

    const embed = new EmbedBuilder()
      .setTitle(`📊 Uptime Statistics: ${website.website_name}`)
      .setColor(stats.uptime_percentage >= 99 ? 0x00ff00 : stats.uptime_percentage >= 95 ? 0xffff00 : 0xff0000)
      .addFields(
        { name: 'Uptime', value: `${stats.uptime_percentage}%`, inline: true },
        { name: 'Period', value: `Last ${hours} hours`, inline: true },
        { name: 'Total Checks', value: `${stats.total_checks}`, inline: true },
        { name: 'Successful', value: `${stats.successful_checks}`, inline: true },
        { name: 'Failed', value: `${stats.total_checks - stats.successful_checks}`, inline: true },
        { name: 'Avg Response Time', value: stats.avg_response_time ? `${Math.round(stats.avg_response_time)}ms` : 'N/A', inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  /**
   * Handle /history command
   */
  async handleHistoryCommand(interaction) {
    const websiteName = interaction.options.getString('website');
    const limit = interaction.options.getInteger('limit') || 10;

    const statuses = db.getAllStatuses();
    const website = statuses.find(s => s.website_name.toLowerCase().includes(websiteName.toLowerCase()));

    if (!website) {
      await interaction.reply({ content: `Website "${websiteName}" not found.`, ephemeral: true });
      return;
    }

    const checks = db.getRecentChecks(website.website_url, Math.min(limit, 25));

    if (checks.length === 0) {
      await interaction.reply('No check history available for this website.');
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`📜 Check History: ${website.website_name}`)
      .setColor(0x0099ff)
      .setTimestamp();

    const history = checks.slice(0, 10).map(check => {
      const emoji = check.is_online ? '✅' : '❌';
      const time = new Date(check.checked_at).toLocaleString();
      const responseTime = check.response_time ? ` (${check.response_time}ms)` : '';
      const statusCode = check.status_code ? ` [${check.status_code}]` : '';
      return `${emoji} ${time}${statusCode}${responseTime}`;
    }).join('\n');

    embed.setDescription(history || 'No history available');

    await interaction.reply({ embeds: [embed] });
  }

  /**
   * Handle /incidents command
   */
  async handleIncidentsCommand(interaction) {
    const activeIncidents = db.getActiveIncidents();

    const embed = new EmbedBuilder()
      .setTitle('🚨 Active Incidents')
      .setColor(activeIncidents.length > 0 ? 0xff0000 : 0x00ff00)
      .setTimestamp();

    if (activeIncidents.length === 0) {
      embed.setDescription('No active incidents. All systems operational! ✅');
    } else {
      for (const incident of activeIncidents) {
        const startedAt = new Date(incident.started_at);
        const duration = Math.round((Date.now() - startedAt.getTime()) / 1000 / 60);
        
        embed.addFields({
          name: `⚠️ ${incident.website_name}`,
          value: `Started: ${startedAt.toLocaleString()}\nDuration: ${duration} minutes\nStatus: Ongoing`,
          inline: false
        });
      }
    }

    await interaction.reply({ embeds: [embed] });
  }

  /**
   * Send alert to Discord channel
   */
  async sendAlert(websiteName, type = 'offline', details = {}) {
    if (!this.isReady || !this.config?.discord?.channelID) {
      logger.warn('Discord not ready or channel not configured');
      return false;
    }

    try {
      const channel = this.client.channels.cache.get(this.config.discord.channelID);
      
      if (!channel) {
        logger.error('Discord channel not found');
        return false;
      }

      let embed;

      if (type === 'offline') {
        embed = new EmbedBuilder()
          .setTitle('🚨 Website Down Alert')
          .setDescription(`**${websiteName}** is currently offline!`)
          .setColor(0xff0000)
          .addFields(
            { name: 'URL', value: details.url || 'N/A', inline: false },
            { name: 'Error', value: details.error || 'Failed to connect', inline: false },
            { name: 'Time', value: new Date().toLocaleString(), inline: true }
          )
          .setTimestamp();
      } else if (type === 'online') {
        embed = new EmbedBuilder()
          .setTitle('✅ Website Recovered')
          .setDescription(`**${websiteName}** is back online!`)
          .setColor(0x00ff00)
          .addFields(
            { name: 'URL', value: details.url || 'N/A', inline: false },
            { name: 'Response Time', value: details.responseTime ? `${details.responseTime}ms` : 'N/A', inline: true },
            { name: 'Time', value: new Date().toLocaleString(), inline: true }
          )
          .setTimestamp();
      }

      await channel.send({ embeds: [embed] });
      logger.info(`Discord alert sent for ${websiteName}: ${type}`);
      return true;
    } catch (error) {
      logger.error('Failed to send Discord alert:', error);
      return false;
    }
  }

  /**
   * Shutdown Discord client
   */
  async shutdown() {
    if (this.client) {
      await this.client.destroy();
      logger.info('Discord client shut down');
    }
  }
}

module.exports = DiscordService;
