# Web Monitor

This project is a web monitoring system that uses `discord.js` to monitor the uptime status of websites and send alerts to a specified Discord channel if a website goes offline. It also provides a real-time alert system via WebSocket and an API endpoint to view the current status of the monitoring system.

**Note: this app works the best with my [web-monitor app](https://github.com/tijnndev/web-monitor-app) to recieve notifications and view the services.**

## Features
- Monitor the uptime status of a list of websites.
- Sends real-time alerts to a Discord channel if a website goes offline.
- Provides an API endpoint to view the current status of the monitoring system.
- WebSocket server to broadcast real-time alerts to connected clients.
- Slash command `/status` in Discord to retrieve the latest website status.

---

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/tijnndev/web-monitor
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure the bot:
   - Create a file named `config.js` in the root directory.
   - Add the following configuration:
     ```js
      module.exports = {
        discord: {
          token: 'YOUR_BOT_TOKEN',
          channelID: 'YOUR_CHANNEL_ID',
          clientId: 'YOUR_CLIENT_ID',
          guildId: 'YOUR_GUILD_ID'
        },
        websites: [
          { name: 'Example Website', url: 'https://example.com' },
          { name: 'Example2 Website', url: 'https://example2.com' }
        ]
      };
     ```

4. Start the bot:
   ```bash
   node index.js
   ```

---

## Usage

### Monitoring
- The bot automatically checks the status of websites periodically (default is daily at midnight using `node-cron`).
- If a website goes offline, the bot sends an alert to the specified Discord channel and notifies connected WebSocket clients.

### Commands
- **/status**: Use this command in Discord to view the current status of all monitored websites.
  - The bot responds with an embed showing the status of each website.

### API
- The API runs on *http://localhost:3000/status*. This endpoint shows the status of all monitored websites and whether they are online or offline.

### WebSocket
- A WebSocket server runs on port `8082` to broadcast real-time alerts. Any connected clients will receive updates when websites go online or offline.

---

## Project Structure
- **index.js**: Main bot logic that handles WebSocket connections and Express API.
- **config.js**: Configuration file for Discord credentials and monitored websites.
- **websiteMonitor.js**: Defines the functions that returns the status of the websites.
- **tokenManager.js**: Defines the functions to manage the FCM Tokens.
- **firebase.js**: Manages the connection with Firebase.
- **discord.js**: Manages the connection with discord.

---

## Dependencies
- [discord.js](https://discord.js.org/) - For building the Discord bot and interacting with Discord APIs.
- [axios](https://github.com/axios/axios) - For making HTTP requests to check the status of websites.
- [node-cron](https://www.npmjs.com/package/node-cron) - For scheduling periodic tasks such as checking website statuses.
- [express](https://expressjs.com/) - For setting up the web API to retrieve the status of monitored websites.
- [ws](https://github.com/websockets/ws) - For managing real-time WebSocket connections.

---

## Example Configuration

**config.js**
```js
module.exports = {
  discord: {
    token: 'YOUR_BOT_TOKEN',
    channelID: 'YOUR_CHANNEL_ID',
    clientId: 'YOUR_CLIENT_ID',
    guildId: 'YOUR_GUILD_ID'
  },
  websites: [
    { name: 'Example Website', url: 'https://example.com' },
    { name: 'Example2 Website', url: 'https://example2.com' }
  ]
};
```

---

## Example Slash Command Interaction

When a user types `/status`, the bot will respond with an embed like:

**Embed Example:**
*Website Status Check:*
- `https://example.com`: ONLINE
- `https://example2.com`: OFFLINE

---

## API Example

To access the status of the monitored websites, you can use the following API endpoint:

**GET** `/status`
- Response example:
  ```json
  {
    "status": "Monitoring active",
    "websites": [
      {
        "name": "Example 1",
        "url": "https://example.com"
      },
      {
        "name": "Example 2",
        "url": "https://example2.com"
      }
    ]
  }
  ```

---

## WebSocket Example

Clients can connect to the WebSocket server running on `ws://localhost:8082`. Once connected, they will receive real-time updates about website status changes.

**Example WebSocket Message:**
```json
{
  "url": "https://example2.com",
  "status": "ONLINE"
}
```

---

## Project Architecture

### 1. **Monitoring & Alerts**
   - The bot uses `node-cron` to schedule website checks.
   - Alerts are sent to a specified Discord channel when a website goes offline.
   - The WebSocket server broadcasts real-time alerts to clients.

### 2. **Discord Bot**
   - The bot sends updates to a Discord channel if any monitored website goes offline.
   - A `/status` slash command provides real-time website status via Discord embeds.

### 3. **API**
   - An Express-based API exposes the current status of monitored websites at `/status`.

### 4. **WebSocket**
   - A WebSocket server broadcasts website status changes to connected clients on port `8082`.

---

## Contributing

1. Fork the repository.
2. Create a new branch: `git checkout -b feature/YourFeature`.
3. Commit your changes: `git commit -m 'Add some feature'`.
4. Push to the branch: `git push origin feature/YourFeature`.
5. Open a pull request.

--- 