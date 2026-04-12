const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const cron = require('node-cron');

// Load configuration and utilities
const env = require('./config/env');
const config = require('../config');
const logger = require('./utils/logger');

// Middleware
const { apiLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Services
const websiteMonitor = require('./services/websiteMonitor');
const DiscordService = require('./services/discord');
const notificationService = require('./services/notification');
const websocketService = require('./services/websocket');
const metricsService = require('./services/metrics');
const db = require('./services/database');

// Routes
const apiRoutes = require('./routes/api');

// Initialize Express app
const app = express();
const port = env.PORT;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for WebSocket compatibility
}));
app.use(cors());
app.use(express.json());

// Rate limiting
app.use('/api', apiLimiter);

// Routes
app.use('/api', apiRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket
websocketService.initialize(server);

// Initialize Discord service
const discordService = new DiscordService(config);
discordService.initialize().catch(error => {
  logger.error('Failed to initialize Discord service:', error);
});

/**
 * Main monitoring logic - called when website state changes
 */
async function handleWebsiteStateChange(websiteName, type, result) {
  logger.info(`Handling state change for ${websiteName}: ${type}`);

  try {
    // Send Discord alert
    await discordService.sendAlert(websiteName, type, result);

    // Send WebSocket alert
    websocketService.sendAlert(websiteName, type, result);

    // Send push notification
    if (type === 'offline') {
      await notificationService.sendWebsiteDownNotification(
        websiteName,
        result.url,
        result.error
      );
    } else if (type === 'online') {
      await notificationService.sendWebsiteRecoveredNotification(
        websiteName,
        result.url,
        result.responseTime
      );
    }
  } catch (error) {
    logger.error('Error in handleWebsiteStateChange:', error);
  }
}

/**
 * Perform website checks
 */
async function performWebsiteChecks() {
  logger.info('Starting scheduled website check');
  
  try {
    const results = await websiteMonitor.checkWebsites(
      config.websites,
      handleWebsiteStateChange
    );

    // Update metrics
    metricsService.updateLastCheckTime();

    // Send status update via WebSocket
    const statuses = db.getAllStatuses();
    websocketService.sendStatusUpdate(statuses);

    logger.info(`Website check completed: ${results.length} websites checked`);
  } catch (error) {
    logger.error('Error during website checks:', error);
  }
}

/**
 * Schedule periodic checks
 */
function scheduleMonitoring() {
  const interval = env.CHECK_INTERVAL;
  logger.info(`Scheduling website checks with interval: ${interval}`);

  cron.schedule(interval, () => {
    performWebsiteChecks();
  });

  // Perform initial check on startup
  setTimeout(() => {
    logger.info('Performing initial website check...');
    performWebsiteChecks();
  }, 5000); // Wait 5 seconds for everything to initialize
}

/**
 * Graceful shutdown
 */
function setupGracefulShutdown() {
  const shutdown = async (signal) => {
    logger.info(`${signal} received, starting graceful shutdown...`);

    try {
      // Close HTTP server
      server.close(() => {
        logger.info('HTTP server closed');
      });

      // Close WebSocket
      websocketService.shutdown();

      // Close Discord client
      await discordService.shutdown();

      // Close database
      db.close();

      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

/**
 * Start the application
 */
function startServer() {
  server.listen(port, () => {
    logger.info('='.repeat(50));
    logger.info(`Web Monitor Server Started`);
    logger.info(`Environment: ${env.NODE_ENV}`);
    logger.info(`HTTP API: http://localhost:${port}`);
    logger.info(`WebSocket: ws://localhost:${port}`);
    logger.info(`Monitoring ${config.websites.length} websites`);
    logger.info(`Check interval: ${env.CHECK_INTERVAL}`);
    logger.info('='.repeat(50));

    // Schedule monitoring
    scheduleMonitoring();

    // Setup graceful shutdown
    setupGracefulShutdown();
  });
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();

module.exports = app; // For testing
