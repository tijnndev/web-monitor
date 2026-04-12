const axios = require('axios');
const logger = require('../utils/logger');
const env = require('../config/env');
const db = require('./database');

class WebsiteMonitor {
  constructor() {
    this.websiteStates = new Map(); // Track previous states to detect changes
  }

  /**
   * Check a single website with retry logic
   * @param {Object} website - Website object with name and url
   * @param {number} retries - Number of retry attempts
   * @returns {Object} Check result
   */
  async checkSingleWebsite(website, retries = env.RETRY_ATTEMPTS) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const startTime = Date.now();
        
        const response = await axios.get(website.url, {
          timeout: env.REQUEST_TIMEOUT,
          validateStatus: (status) => status < 500, // Accept 4xx as "online"
          headers: {
            'User-Agent': 'WebMonitor/1.0 (Uptime Monitoring Service)'
          }
        });
        
        const responseTime = Date.now() - startTime;
        const isOnline = response.status >= 200 && response.status < 500;
        
        logger.debug(`${website.name}: ${isOnline ? 'ONLINE' : 'OFFLINE'} (${response.status}) - ${responseTime}ms`, {
          attempt,
          url: website.url
        });
        
        return {
          name: website.name,
          url: website.url,
          isOnline,
          statusCode: response.status,
          responseTime,
          error: null,
          lastChecked: new Date().toISOString(),
          attempts: attempt
        };
      } catch (error) {
        logger.warn(`${website.name}: Check failed (attempt ${attempt}/${retries})`, {
          url: website.url,
          error: error.message
        });
        
        // If this is the last attempt, return offline status
        if (attempt === retries) {
          return {
            name: website.name,
            url: website.url,
            isOnline: false,
            statusCode: null,
            responseTime: null,
            error: error.message,
            lastChecked: new Date().toISOString(),
            attempts: attempt
          };
        }
        
        // Wait before retry (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await this.sleep(delay);
      }
    }
  }

  /**
   * Check all configured websites
   * @param {Array} websites - Array of website objects
   * @param {Function} onStateChange - Callback when website state changes (online <-> offline)
   * @returns {Array} Array of check results
   */
  async checkWebsites(websites, onStateChange) {
    logger.info(`Starting website check for ${websites.length} websites`);
    const results = [];

    for (const website of websites) {
      try {
        const result = await this.checkSingleWebsite(website);
        results.push(result);

        // Record check in database
        db.recordCheck(
          result.name,
          result.url,
          result.isOnline,
          result.statusCode,
          result.responseTime,
          result.error
        );

        // Update website status
        db.updateWebsiteStatus(result.name, result.url, result.isOnline);

        // Check for state change
        const previousState = this.websiteStates.get(website.url);
        const currentState = result.isOnline;

        if (previousState !== undefined && previousState !== currentState) {
          logger.info(`State change detected for ${website.name}: ${previousState ? 'ONLINE' : 'OFFLINE'} -> ${currentState ? 'ONLINE' : 'OFFLINE'}`);
          
          // Only send alerts on state change
          if (onStateChange) {
            if (!currentState) {
              // Website went offline
              await onStateChange(website.name, 'offline', result);
            } else {
              // Website came back online
              await onStateChange(website.name, 'online', result);
            }
          }
        } else if (previousState === undefined && !currentState) {
          // First check and website is offline
          logger.info(`First check for ${website.name}: OFFLINE`);
          if (onStateChange) {
            await onStateChange(website.name, 'offline', result);
          }
        }

        // Update state
        this.websiteStates.set(website.url, currentState);

      } catch (error) {
        logger.error(`Unexpected error checking ${website.name}:`, error);
        results.push({
          name: website.name,
          url: website.url,
          isOnline: false,
          error: error.message,
          lastChecked: new Date().toISOString()
        });
      }
    }

    logger.info(`Website check completed: ${results.filter(r => r.isOnline).length}/${results.length} online`);
    return results;
  }

  /**
   * Generate status message for all websites
   * @param {Array} results - Array of check results
   * @returns {string} Status message
   */
  generateStatusMessage(results) {
    let message = 'Website Status Check:\n';
    
    for (const result of results) {
      const status = result.isOnline ? 'ONLINE' : 'OFFLINE';
      const responseTime = result.responseTime ? ` (${result.responseTime}ms)` : '';
      const statusCode = result.statusCode ? ` [${result.statusCode}]` : '';
      message += `${result.name}: ${status}${statusCode}${responseTime}\n`;
    }
    
    return message;
  }

  /**
   * Get current states of all websites
   * @returns {Map} Website states
   */
  getStates() {
    return this.websiteStates;
  }

  /**
   * Sleep utility
   * @param {number} ms - Milliseconds to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new WebsiteMonitor();
