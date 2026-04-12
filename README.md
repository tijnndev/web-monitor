# Web Monitor 🔍

A professional website uptime monitoring system with Discord alerts, WebSocket notifications, Firebase push notifications, and comprehensive metrics tracking. Built with Node.js, Express, and SQLite.

**Works seamlessly with [web-monitor-app](https://github.com/tijnndev/web-monitor-app)** - a React Native mobile app to receive push notifications and view service status on iOS/Android.

---

## ✨ Features

### Monitoring
- ✅ **Automated Website Checks** - Configurable cron-based scheduling
- 🔄 **Retry Logic** - Configurable retry attempts for transient failures
- 📊 **Response Time Tracking** - Monitor performance metrics
- 🎯 **Smart Alerting** - Only alerts on state changes (no spam)
- 💾 **Historical Data** - SQLite database for complete incident and check history
- 📉 **Incident Tracking** - Automatic incident creation and resolution

### Notifications
- 💬 **Discord Integration** - Rich embeds with slash commands (`/status`, `/uptime`, `/history`, `/incidents`)
- 🔔 **Push Notifications** - Firebase Cloud Messaging for mobile alerts
- 🌐 **WebSocket** - Real-time updates for connected clients

### API & Metrics
- 🔐 **Secure REST API** - API key authentication with rate limiting (100 req/15min)
- 📈 **Detailed Metrics** - Uptime percentages, response times, incident tracking
- 🏥 **Health Endpoints** - Monitor the monitor itself with website counts
- 📜 **Complete History** - Query past checks and incidents
- 📊 **Uptime Statistics** - Configurable time periods for uptime analysis

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

## � Quick Start

Get up and running in 5 minutes:

```bash
# 1. Clone and install
git clone https://github.com/tijnndev/web-monitor
cd web-monitor
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your settings

# 3. Configure websites
cp config.js.example config.js
# Edit config.js and add your websites

# 4. Start monitoring
npm start
```

Your monitor is now running at `http://localhost:8007`

**Test it:**
```bash
# Check health status
curl http://localhost:8007/api/health

# View services (requires API key)
curl -H "x-api-key: your-secret-key" http://localhost:8007/api/services
```

---

## �📦 Installation

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
       token: 'YOUR_BOT_TOKEN',           // Discord bot token
       channelID: 'YOUR_CHANNEL_ID',       // Channel for alerts
       clientId: 'YOUR_CLIENT_ID',         // Discord app client ID
       guildId: 'YOUR_GUILD_ID'            // Discord server ID
     },
     websites: [
       { name: 'Production Site', url: 'https://example.com' },
       { name: 'API Server', url: 'https://api.example.com' },
       { name: 'Dashboard', url: 'https://dashboard.example.com' }
     ]
   };
   ```
   
   Alternatively, you can configure Discord via environment variables in `.env`:
   ```env
   DISCORD_ENABLED=true
   DISCORD_TOKEN=your-bot-token
   DISCORD_CHANNEL_ID=your-channel-id
   DISCORD_CLIENT_ID=your-client-id
   DISCORD_GUILD_ID=your-guild-id
   ```
   
   **Note:** If Discord is configured in both places, `config.js` takes precedence.

5. **Start the server**
   ```bash
   npm start          # Production
   npm run dev        # Development (with nodemon)
   ```

### Discord Bot Setup (Optional)

If you want Discord notifications:

1. **Create a Discord Application**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Click "New Application" and give it a name
   - Navigate to the "Bot" tab and click "Add Bot"
   - Copy the bot token for your `.env` or `config.js`

2. **Configure Bot Permissions**
   - In the Discord Developer Portal, go to "OAuth2" > "URL Generator"
   - Select scopes: `bot`, `applications.commands`
   - Select permissions: `Send Messages`, `Embed Links`, `Read Message History`
   - Copy the generated URL and open it to invite the bot to your server

3. **Get IDs**
   - Enable Developer Mode in Discord: Settings > Advanced > Developer Mode
   - Right-click your server → Copy ID (Guild ID)
   - Right-click the channel for alerts → Copy ID (Channel ID)
   - Copy Application ID from Discord Developer Portal (Client ID)

4. **Configure the bot**
   - Add credentials to your `config.js` or `.env`
   - Restart the server
   - Discord slash commands will be automatically registered

---

## 🚀 Usage

### API Endpoints

All endpoints require `x-api-key` header with your `BROADCAST_SECRET`.

#### Health Check (Public)
```bash
GET /api/health

# Returns:
{
  "status": "healthy" | "degraded",
  "uptime": 3600,
  "active_incidents": 0,
  "total_websites": 3,
  "online_websites": 2,
  "offline_websites": 1,
  "last_check": "2026-04-12T10:00:00.000Z",
  "timestamp": "2026-04-12T10:00:00.000Z"
}
```
**Note:** Returns HTTP 200 when healthy, 503 when degraded

#### Get Monitoring Status
```bash
GET /api/status
Headers: x-api-key: your-secret-key

# Returns:
{
  "status": "Monitoring active",
  "websites": [
    { "name": "Production Site", "url": "https://example.com" }
  ]
}
```

#### Get All Services
```bash
GET /api/services
Headers: x-api-key: your-secret-key

# Returns array of services with current status:
[
  {
    "name": "Production Site",
    "url": "https://example.com",
    "is_online": true,
    "last_checked": "2026-04-12T10:00:00.000Z",
    "consecutive_failures": 0
  }
]
```

#### Get Metrics
```bash
GET /api/metrics
Headers: x-api-key: your-secret-key

# Returns:
{
  "overall": {
    "uptime_seconds": 86400,
    "last_check": "2026-04-12T10:00:00.000Z",
    "total_checks": 1440,
    "failed_checks": 12,
    "active_incidents": 1,
    "uptime_percentage": "99.17"
  },
  "websites": [...]
}
```

#### Get Active Incidents
```bash
GET /api/incidents
Headers: x-api-key: your-secret-key

# Returns array of unresolved incidents:
[
  {
    "id": 1,
    "website_name": "API Server",
    "website_url": "https://api.example.com",
    "started_at": "2026-04-12T09:30:00.000Z",
    "resolved_at": null,
    "duration_minutes": null,
    "is_resolved": 0
  }
]
```

#### Get Uptime Stats
```bash
GET /api/uptime/:websiteUrl?hours=24
Headers: x-api-key: your-secret-key

# Example:
GET /api/uptime/https%3A%2F%2Fexample.com?hours=24

# Returns:
{
  "total_checks": 24,
  "successful_checks": 23,
  "avg_response_time": 245.5,
  "uptime_percentage": 95.83,
  "period_hours": 24
}
```

#### Get Check History
```bash
GET /api/history/:websiteUrl?limit=100
Headers: x-api-key: your-secret-key

# Returns array of recent checks:
[
  {
    "id": 1,
    "website_url": "https://example.com",
    "checked_at": "2026-04-12T10:00:00.000Z",
    "is_online": true,
    "response_time": 234,
    "status_code": 200,
    "error_message": null
  }
]
```

#### Send Custom Notification
```bash
POST /api/send-notification
Headers: 
  x-api-key: your-secret-key
  Content-Type: application/json
Body: 
{
  "title": "Custom Alert",
  "body": "Your custom message here"
}

# Returns:
{
  "message": "Push notification sent successfully"
}
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

ws.on('open', () => {
  console.log('Connected to Web Monitor WebSocket');
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('Received update:', message);
  
  // Message types:
  // - alert: Website status change
  // - check_complete: Check finished
  
  if (message.type === 'alert') {
    console.log(`${message.websiteName} is now ${message.alertType}`);
    // message.websiteName, message.websiteUrl, message.alertType ('offline' | 'online')
  }
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

ws.on('close', () => {
  console.log('Disconnected from Web Monitor');
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

## � Deployment

### Production Checklist

1. Set `NODE_ENV=production` in `.env`
2. Use a strong `BROADCAST_SECRET` (min 16 characters)
3. Configure proper `CHECK_INTERVAL` for your needs
4. Set up log rotation for `logs/` directory
5. Configure firewall to allow incoming connections on your `PORT`
6. Set up process manager (PM2, systemd, Docker)
7. Regular database backups of `data/monitoring.db`

### Using PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start the monitor
pm2 start src/index.js --name web-monitor

# Configure auto-restart on system boot
pm2 startup
pm2 save

# Monitor logs
pm2 logs web-monitor

# Restart after config changes
pm2 restart web-monitor
```

### Using Docker (Basic Example)

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 8007

CMD ["node", "src/index.js"]
```

```bash
docker build -t web-monitor .
docker run -d \
  --name web-monitor \
  -p 8007:8007 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  -v $(pwd)/.env:/app/.env \
  -v $(pwd)/config.js:/app/config.js \
  web-monitor
```

### Using systemd (Linux)

Create `/etc/systemd/system/web-monitor.service`:

```ini
[Unit]
Description=Web Monitor Service
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/web-monitor
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable web-monitor
sudo systemctl start web-monitor
sudo systemctl status web-monitor
```

---

## �🔧 Troubleshooting

### Common Issues

**Database locked error**
- Ensure only one instance of the monitor is running
- Check file permissions on the `data/` directory
- Try deleting `data/monitoring.db` to reset (will lose history)

**Discord bot not responding**
- Verify bot token is correct in `config.js` or `.env`
- Ensure bot has proper permissions in the Discord channel
- Check that Guild ID and Channel ID are correct
- Look for error messages in console logs

**Push notifications not working**
- Verify `BROADCAST_URL` is accessible
- Check `BROADCAST_SECRET` matches between monitor and Firebase API
- Ensure Firebase API is running and configured correctly
- Check network connectivity between services

**Websites showing as offline incorrectly**
- Increase `REQUEST_TIMEOUT` for slow sites
- Check if website blocks automated requests (User-Agent)
- Verify website URL is accessible from server
- Review error messages in check history: `GET /api/history/:websiteUrl`

**High memory usage**
- Reduce check history retention by clearing old records
- Adjust `CHECK_INTERVAL` to check less frequently
- Monitor database size in `data/monitoring.db`

### Logs

Logs are stored in the `logs/` directory:
- `combined.log` - All logs
- `error.log` - Error logs only

View logs in real-time:
```bash
tail -f logs/combined.log
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

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | 8007 | No |
| `NODE_ENV` | Environment (development/production) | development | No |
| `BROADCAST_URL` | Firebase API endpoint for push notifications | - | Yes* |
| `BROADCAST_SECRET` | API authentication key (min 16 chars) | - | Yes |
| `SERVICE_ID` | Service identifier for Firebase | 1 | Yes* |
| `CHECK_INTERVAL` | Cron schedule for checks | `0 * * * *` (hourly) | No |
| `RETRY_ATTEMPTS` | Number of retries per check | 3 | No |
| `REQUEST_TIMEOUT` | HTTP timeout in milliseconds | 10000 | No |
| `DB_PATH` | SQLite database path | ./data/monitoring.db | No |
| `DISCORD_ENABLED` | Enable Discord notifications | false | No |
| `DISCORD_TOKEN` | Discord bot token | - | If Discord enabled |
| `DISCORD_CHANNEL_ID` | Discord channel ID for alerts | - | If Discord enabled |
| `DISCORD_CLIENT_ID` | Discord app client ID | - | If Discord enabled |
| `DISCORD_GUILD_ID` | Discord server (guild) ID | - | If Discord enabled |

\* Only required if using Firebase push notifications

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

## ❓ FAQ

**Q: Can I monitor websites that require authentication?**  
A: Currently, the monitor performs simple HTTP GET requests without authentication. For authenticated endpoints, consider monitoring a public health check endpoint instead.

**Q: How often should I check my websites?**  
A: It depends on your needs:
- Critical services: Every 1-5 minutes (`*/1 * * * *` or `*/5 * * * *`)
- Production sites: Every 15-30 minutes (`*/15 * * * *` or `*/30 * * * *`)
- Less critical: Every hour or daily (`0 * * * *` or `0 0 * * *`)

**Q: What happens if the monitor itself goes down?**  
A: The monitor won't be able to send alerts while it's down. Consider:
- Running it on a reliable server/VPS
- Using a process manager (PM2, systemd) for auto-restart
- Setting up monitoring for the monitor itself (meta-monitoring)

**Q: Can I monitor non-HTTP services?**  
A: Currently, only HTTP/HTTPS endpoints are supported. The monitor checks if the website returns a successful status code (200-299).

**Q: How much disk space does the database use?**  
A: Database size depends on check frequency and retention. A typical setup checking 10 sites hourly uses ~10-50 MB per month. You can periodically clean old records if needed.

**Q: Can I use this with the mobile app?**  
A: Yes! Check out [web-monitor-app](https://github.com/tijnndev/web-monitor-app) for a React Native companion app with push notifications.

**Q: Is there a limit to how many websites I can monitor?**  
A: No hard limit, but consider:
- Check duration: More sites = longer check cycles
- System resources: Database size, memory usage
- Discord rate limits: If using Discord notifications

**Q: How do I export/backup my monitoring data?**  
A: The SQLite database is a single file at `data/monitoring.db`. Simply copy this file to back it up. You can query it with any SQLite client.

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

Please ensure your code:
- Passes all tests (`npm test`)
- Follows the linting rules (`npm run lint`)
- Is properly formatted (`npm run format`)

---

## 📞 Support

For issues or questions, please [open an issue on GitHub](https://github.com/tijnndev/web-monitor/issues).

---

**Made with ❤️ by [tijnndev](https://github.com/tijnndev)**