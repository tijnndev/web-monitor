# Web Monitor 🔍

A professional website uptime monitoring system with Discord alerts, WebSocket notifications, Firebase push notifications, and comprehensive metrics tracking. Built with Node.js, Express, and SQLite.

**Works seamlessly with [web-monitor-app](https://github.com/tijnndev/web-monitor-app)** - a mobile/web companion app to receive notifications and view service status.

---

## ✨ Features

### Monitoring
- ✅ **Automated Website Checks** - Configurable cron-based scheduling
- 🔄 **Retry Logic** - Exponential backoff for transient failures
- 📊 **Response Time Tracking** - Monitor performance metrics
- 🎯 **Smart Alerting** - Only alerts on state changes (no spam)
- 💾 **Historical Data** - SQLite database for incident tracking

### Notifications
- 💬 **Discord Integration** - Rich embeds with slash commands (`/status`, `/uptime`, `/history`, `/incidents`)
- 🔔 **Push Notifications** - Firebase Cloud Messaging support
- 🌐 **WebSocket** - Real-time updates for connected clients

### API & Metrics
- 🔐 **Secure REST API** - API key authentication with rate limiting
- 📈 **Detailed Metrics** - Uptime percentages, response times, incident tracking
- 🏥 **Health Endpoints** - Monitor the monitor itself
- 📜 **Complete History** - Query past checks and incidents

---

## 🏗️ Architecture

```
web-monitor/
├── src/
│   ├── config/         # Configuration with validation
│   ├── middleware/     # Auth, rate limiting, error handling
│   ├── routes/         # API endpoints
│   ├── services/       # Business logic (monitoring, Discord, DB, etc.)
│   └── utils/          # Logger and helpers
├── tests/              # Jest test suites
├── logs/               # Application logs
└── data/               # SQLite database
```

---

## 📦 Installation

### Prerequisites
- Node.js >= 18.0.0
- npm >= 8.0.0

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/tijnndev/web-monitor
   cd web-monitor
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your settings:
   ```env
   PORT=8007
   NODE_ENV=production
   BROADCAST_URL=http://your-firebase-api-url
   BROADCAST_SECRET=your-secret-key
   SERVICE_ID=1
   CHECK_INTERVAL="0 * * * *"  # Every hour
   ```

4. **Configure websites to monitor**
   
   Create `config.js` in the root directory:
   ```javascript
   module.exports = {
     discord: {
       token: 'YOUR_BOT_TOKEN',
       channelID: 'YOUR_CHANNEL_ID',
       clientId: 'YOUR_CLIENT_ID',
       guildId: 'YOUR_GUILD_ID'
     },
     websites: [
       { name: 'Production Site', url: 'https://example.com' },
       { name: 'API Server', url: 'https://api.example.com' }
     ]
   };
   ```

5. **Start the server**
   ```bash
   npm start          # Production
   npm run dev        # Development (with nodemon)
   ```

---

## 🚀 Usage

### API Endpoints

All endpoints require `x-api-key` header with your `BROADCAST_SECRET`.

#### Health Check (Public)
```bash
GET /api/health
```

#### Get All Services
```bash
GET /api/services
Headers: x-api-key: your-secret-key
```

#### Get Metrics
```bash
GET /api/metrics
Headers: x-api-key: your-secret-key
```

#### Get Uptime Stats
```bash
GET /api/uptime/:websiteUrl?hours=24
Headers: x-api-key: your-secret-key
```

#### Get Check History
```bash
GET /api/history/:websiteUrl?limit=100
Headers: x-api-key: your-secret-key
```

#### Send Custom Notification
```bash
POST /api/send-notification
Headers: x-api-key: your-secret-key
Body: { "title": "Alert", "body": "Message" }
```

### Discord Commands

- `/status` - View current status of all websites
- `/uptime <website> [hours]` - Get uptime statistics
- `/history <website> [limit]` - View recent check history
- `/incidents` - Show active incidents

### WebSocket Connection

Connect to `ws://localhost:8007` to receive real-time updates:

```javascript
const ws = new WebSocket('ws://localhost:8007');

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log(message);
  // { type: 'alert', alertType: 'offline', websiteName: 'Example', ... }
});
```

---

## 🧪 Testing

```bash
npm test              # Run tests
npm run test:watch    # Watch mode
npm run lint          # Run ESLint
npm run lint:fix      # Fix linting issues
npm run format        # Format code with Prettier
```

---

## 📊 Database Schema

### Tables

**monitoring_checks** - Individual check records
- website_name, website_url, is_online, status_code, response_time, error_message, checked_at

**website_status** - Current state of each website
- website_url (PK), website_name, is_online, last_checked, last_online, last_offline, consecutive_failures, total_checks

**incidents** - Downtime incidents
- id (PK), website_name, website_url, started_at, resolved_at, duration_minutes, is_resolved

---

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 8007 |
| `NODE_ENV` | Environment (development/production) | development |
| `BROADCAST_URL` | Firebase API endpoint | Required |
| `BROADCAST_SECRET` | API authentication key | Required |
| `SERVICE_ID` | Service identifier | Required |
| `CHECK_INTERVAL` | Cron schedule for checks | `0 * * * *` (hourly) |
| `RETRY_ATTEMPTS` | Number of retries per check | 3 |
| `REQUEST_TIMEOUT` | HTTP timeout (ms) | 10000 |
| `DB_PATH` | SQLite database path | ./data/monitoring.db |

### Cron Schedule Examples

```
*/5 * * * *    # Every 5 minutes
0 * * * *      # Every hour
0 */2 * * *    # Every 2 hours
0 0 * * *      # Daily at midnight
0 9-17 * * *   # Every hour from 9 AM to 5 PM
```

---

## 🔒 Security Features

- ✅ Helmet.js for secure HTTP headers
- ✅ Rate limiting (100 requests per 15 minutes)
- ✅ API key authentication
- ✅ Input validation with Joi
- ✅ Environment variable validation
- ✅ Structured logging with Winston

---

## 📝 License

ISC

---

## 🤝 Contributing

Contributions welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📞 Support

For issues or questions, please open an issue on GitHub.

---

**Made with ❤️ by tijnndev**

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