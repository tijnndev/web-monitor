const axios = require('axios');
const config = require('./config');

const checkWebsites = async (sendAlertToClientsAndPushNotifications) => {
  let statusMessage = 'Website Status Check:\n';

  for (let website of config.websites) {
    try {
      const response = await axios.get(website.url, { timeout: 5000 });
      if (response.status === 200) {
        statusMessage += `${website.name}: ONLINE\n`;
      } else {
        statusMessage += `${website.name}: OFFLINE\n`;
        sendAlertToClientsAndPushNotifications(website.name);
      }
    } catch (error) {
      statusMessage += `${website.name}: OFFLINE\n`;
      sendAlertToClientsAndPushNotifications(website.name);
    }
  }

  return statusMessage;
};

module.exports = { checkWebsites };
