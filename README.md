# Discord.js Web Monitor

This project is a web monitoring bot built using `discord.js`. It periodically checks the status of websites and sends alerts to a specified Discord channel if any website goes offline. Additionally, it provides a `/status` command to view the current status of monitored websites.

## Features
- Monitor the uptime status of a list of websites.
- Sends real-time alerts to a Discord channel if a website is offline.
- Provides an API endpoint to view the current status of the monitoring system.
- Includes a WebSocket server to broadcast alerts to connected clients.
- Slash command `/status` to retrieve the latest website status.

---

## Installation

1. Clone the repository:
   *git clone https://github.com/tijnndev/web-monitor*

2. Install dependencies:
   *npm install*

3. Configure the bot:
   - Create a file named `config.js` in the root directory.
   - Add the following configuration:
     ```js
      module.exports = {
         discord: {
           token: 'YOUR_BOT_TOKEN',
           channelID: 'YOUR_CHANNEL_ID',
           clientId: "YOUR_CLIENT_ID",
           guildId: "YOUR_GUILD_ID"
         },
         websites: [
           'https://example.com',
           'https://example2.com',
         ]
       };
     ```

4. Start the bot:
   *node index.js*

---

## Usage

### Monitoring
- The bot automatically checks the status of websites daily at midnight using `node-cron`.
- If a website goes offline, an alert is sent to the specified Discord channel.

### Commands
- **/status**: Use this command in Discord to view the current status of all monitored websites.

### API
- Access the API at *http://localhost:3000/status* to see the status of the monitoring system and the list of monitored websites.

### WebSocket
- A WebSocket server runs on port `8082`. Clients can connect to receive real-time alerts.

---

## Project Structure
- **index.js**: Main bot logic, including monitoring and Discord interactions.
- **config.js**: Configuration file for Discord credentials and monitored websites.

---

## Dependencies
- [discord.js](https://discord.js.org/) - For building the Discord bot.
- [axios](https://github.com/axios/axios) - For making HTTP requests to check website statuses.
- [node-cron](https://www.npmjs.com/package/node-cron) - For scheduling periodic tasks.
- [express](https://expressjs.com/) - For creating a simple web API.
- [ws](https://github.com/websockets/ws) - For WebSocket support.

---

## Example Configuration

**config.js**
```js
module.exports = {
    discord: {
      token: 'YOUR_BOT_TOKEN',
      channelID: 'YOUR_CHANNEL_ID',
      clientId: "YOUR_CLIENT_ID",
      guildId: "YOUR_GUILD_ID"
    },
    websites: [
      'https://example.com',
      'https://example2.com',
    ]
  };
```

---

## Example Slash Command Interaction

When a user types `/status`, the bot will reply with an embed like:

**Embed Example:**
*Website Status Check:*
- https://example.com: ONLINE
- https://example2.com: OFFLINE

---

## Contributing

1. Fork the repository.
2. Create a new branch: *git checkout -b feature/YourFeature*
3. Commit your changes: *git commit -m 'Add some feature'*
4. Push to the branch: *git push origin feature/YourFeature*
5. Open a pull request.

---
