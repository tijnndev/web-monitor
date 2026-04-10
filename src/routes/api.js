const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const verifySecret = require('../middleware/auth');
const notificationService = require('../services/notification');
const metricsService = require('../services/metrics');
const db = require('../services/database');
const logger = require('../utils/logger');

/**
 * GET /api/health
 * Health check endpoint (public)
 */
router.get('/health', asyncHandler(async (req, res) => {
  const health = metricsService.getHealthStatus();
  const statusCode = health.status === 'healthy' ? 200 : 503;
  
  res.status(statusCode).json(health);
}));

/**
 * GET /api/status
 * Get monitoring status
 */
router.get('/status', verifySecret, asyncHandler(async (req, res) => {
  const config = require('../../config');
  
  res.json({
    status: 'Monitoring active',
    websites: config.websites.map(site => ({ 
      name: site.name, 
      url: site.url 
    }))
  });
}));

/**
 * GET /api/services
 * Get all monitored services with current status
 */
router.get('/services', verifySecret, asyncHandler(async (req, res) => {
  const statuses = db.getAllStatuses();
  const config = require('../../config');
  
  // Merge config with database status
  const services = config.websites.map(website => {
    const status = statuses.find(s => s.website_url === website.url);
    return {
      name: website.name,
      url: website.url,
      is_online: status ? status.is_online : null,
      last_checked: status ? status.last_checked : null,
      consecutive_failures: status ? status.consecutive_failures : 0
    };
  });
  
  res.json(services);
}));

/**
 * GET /api/metrics
 * Get detailed metrics
 */
router.get('/metrics', verifySecret, asyncHandler(async (req, res) => {
  const overallMetrics = metricsService.getOverallMetrics();
  const websiteMetrics = metricsService.getAllWebsiteMetrics();
  
  res.json({
    overall: overallMetrics,
    websites: websiteMetrics
  });
}));

/**
 * GET /api/incidents
 * Get active incidents
 */
router.get('/incidents', verifySecret, asyncHandler(async (req, res) => {
  const activeIncidents = db.getActiveIncidents();
  res.json(activeIncidents);
}));

/**
 * GET /api/history/:websiteUrl
 * Get check history for a specific website
 */
router.get('/history/:websiteUrl', verifySecret, asyncHandler(async (req, res) => {
  const websiteUrl = decodeURIComponent(req.params.websiteUrl);
  const limit = parseInt(req.query.limit) || 100;
  
  const checks = db.getRecentChecks(websiteUrl, limit);
  res.json(checks);
}));

/**
 * GET /api/uptime/:websiteUrl
 * Get uptime statistics for a specific website
 */
router.get('/uptime/:websiteUrl', verifySecret, asyncHandler(async (req, res) => {
  const websiteUrl = decodeURIComponent(req.params.websiteUrl);
  const hours = parseInt(req.query.hours) || 24;
  
  const stats = db.getUptimeStats(websiteUrl, hours);
  res.json(stats);
}));

/**
 * POST /api/send-notification
 * Send custom push notification
 */
router.post('/send-notification', verifySecret, asyncHandler(async (req, res) => {
  const { title, body } = req.body;

  if (!title || !body) {
    return res.status(400).json({ error: 'Title and body are required' });
  }

  const success = await notificationService.sendCustomNotification(title, body);

  if (success) {
    logger.info('Custom notification sent via API', { title, body });
    res.status(200).json({ message: 'Push notification sent successfully' });
  } else {
    res.status(500).json({ error: 'Failed to send notification' });
  }
}));

module.exports = router;
