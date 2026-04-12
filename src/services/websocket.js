const WebSocket = require('ws');
const logger = require('../utils/logger');

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Set();
  }

  /**
   * Initialize WebSocket server
   */
  initialize(server) {
    this.wss = new WebSocket.Server({ server });

    this.wss.on('connection', (ws, req) => {
      const clientIp = req.socket.remoteAddress;
      logger.info(`WebSocket client connected from ${clientIp}`);
      this.clients.add(ws);

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to Web Monitor WebSocket server',
        timestamp: new Date().toISOString()
      }));

      ws.on('close', () => {
        logger.info(`WebSocket client disconnected from ${clientIp}`);
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error:', error);
        this.clients.delete(ws);
      });

      // Handle incoming messages (ping/pong)
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          if (data.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          }
        } catch (error) {
          logger.warn('Invalid WebSocket message received:', error.message);
        }
      });
    });

    logger.info('WebSocket server initialized');
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(message) {
    if (!this.wss) {
      logger.warn('WebSocket server not initialized');
      return;
    }

    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    let sentCount = 0;

    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
        sentCount++;
      }
    });

    logger.debug(`Broadcast sent to ${sentCount} WebSocket clients`);
  }

  /**
   * Send alert notification
   */
  sendAlert(websiteName, type = 'offline', details = {}) {
    const message = {
      type: 'alert',
      alertType: type,
      websiteName,
      details,
      timestamp: new Date().toISOString()
    };

    this.broadcast(message);
    logger.info(`WebSocket alert sent: ${websiteName} - ${type}`);
  }

  /**
   * Send status update
   */
  sendStatusUpdate(statuses) {
    const message = {
      type: 'status_update',
      statuses,
      timestamp: new Date().toISOString()
    };

    this.broadcast(message);
  }

  /**
   * Get connected clients count
   */
  getClientCount() {
    return this.wss ? this.wss.clients.size : 0;
  }

  /**
   * Shutdown WebSocket server
   */
  shutdown() {
    if (this.wss) {
      this.wss.clients.forEach(client => {
        client.close();
      });
      this.wss.close();
      logger.info('WebSocket server shut down');
    }
  }
}

module.exports = new WebSocketService();
