const axios = require('axios');
const logger = require('../utils/logger');
const env = require('../config/env');

class NotificationService {
  /**
   * Send broadcast notification via external API
   */
  async sendBroadcast(title, body) {
    const broadcastURL = env.BROADCAST_URL;
    const secret = env.BROADCAST_SECRET;
    const serviceId = env.SERVICE_ID;

    if (!broadcastURL) {
      logger.error('Broadcast URL is not configured');
      return false;
    }

    const payload = {
      title,
      body,
      serviceId,
      secret
    };

    try {
      const response = await axios.post(`${broadcastURL}/services/broadcast`, payload, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      logger.info(`Broadcast notification sent: ${title}`, {
        status: response.status,
        statusText: response.statusText
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to send broadcast notification:', {
        error: error.message,
        title,
        url: broadcastURL
      });
      return false;
    }
  }

  /**
   * Send website down notification
   */
  async sendWebsiteDownNotification(websiteName, websiteUrl, errorMessage) {
    const title = `🚨 Website Down: ${websiteName}`;
    const body = `${websiteName} (${websiteUrl}) is currently offline. Error: ${errorMessage || 'Connection failed'}`;
    
    return await this.sendBroadcast(title, body);
  }

  /**
   * Send website recovered notification
   */
  async sendWebsiteRecoveredNotification(websiteName, websiteUrl, responseTime) {
    const title = `✅ Website Recovered: ${websiteName}`;
    const body = `${websiteName} (${websiteUrl}) is back online. Response time: ${responseTime}ms`;
    
    return await this.sendBroadcast(title, body);
  }

  /**
   * Send custom notification
   */
  async sendCustomNotification(title, body) {
    return await this.sendBroadcast(title, body);
  }
}

module.exports = new NotificationService();
