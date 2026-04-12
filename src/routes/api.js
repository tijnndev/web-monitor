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
  const websites = db.getAllWebsites(); // Get all websites from database
  
  // Merge database websites with their status
  const services = websites.map(website => {
    const status = statuses.find(s => s.website_url === website.url);
    return {
      id: website.id,
      name: website.name,
      url: website.url,
      monitored: website.monitored === 1,
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
  
  if (!checks || checks.length === 0) {
    // Check if website exists
    const website = db.getWebsiteByUrl(websiteUrl);
    if (!website) {
      return res.status(404).json({ error: 'Website not found' });
    }
  }
  
  res.json(checks);
}));

/**
 * GET /api/uptime/:websiteUrl
 * Get uptime statistics for a specific website
 */
router.get('/uptime/:websiteUrl', verifySecret, asyncHandler(async (req, res) => {
  const websiteUrl = decodeURIComponent(req.params.websiteUrl);
  const hours = parseInt(req.query.hours) || 24;
  
  // Check if website exists first
  const website = db.getWebsiteByUrl(websiteUrl);
  if (!website) {
    return res.status(404).json({ error: 'Website not found' });
  }
  
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

/**
 * POST /api/websites
 * Add a new website to monitor
 */
router.post('/websites', verifySecret, asyncHandler(async (req, res) => {
  const { name, url, monitored = true } = req.body;

  if (!name || !url) {
    return res.status(400).json({ error: 'Name and URL are required' });
  }

  // Basic URL validation
  try {
    new URL(url);
  } catch (error) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  const website = db.addWebsite(name, url, monitored);
  logger.info('Website added via API', { name, url, monitored });
  
  res.status(201).json(website);
}));

/**
 * PUT /api/websites/:url
 * Update a website (name or monitoring status)
 */
router.put('/websites/:url', verifySecret, asyncHandler(async (req, res) => {
  const websiteUrl = decodeURIComponent(req.params.url);
  const { name, monitored } = req.body;

  if (name === undefined && monitored === undefined) {
    return res.status(400).json({ error: 'At least one field (name or monitored) must be provided' });
  }

  const updates = {};
  if (name !== undefined) updates.name = name;
  if (monitored !== undefined) updates.monitored = monitored;

  try {
    const website = db.updateWebsite(websiteUrl, updates);
    logger.info('Website updated via API', { url: websiteUrl, updates });
    res.json(website);
  } catch (error) {
    if (error.message === 'Website not found') {
      return res.status(404).json({ error: 'Website not found' });
    }
    throw error;
  }
}));

/**
 * PATCH /api/websites/:url/toggle
 * Toggle website monitoring on/off
 */
router.patch('/websites/:url/toggle', verifySecret, asyncHandler(async (req, res) => {
  const websiteUrl = decodeURIComponent(req.params.url);
  const { monitored } = req.body;

  if (typeof monitored !== 'boolean') {
    return res.status(400).json({ error: 'Monitored must be a boolean value' });
  }

  try {
    const website = db.toggleMonitoring(websiteUrl, monitored);
    logger.info('Website monitoring toggled via API', { url: websiteUrl, monitored });
    res.json(website);
  } catch (error) {
    if (error.message === 'Website not found') {
      return res.status(404).json({ error: 'Website not found' });
    }
    throw error;
  }
}));

/**
 * DELETE /api/websites/:url
 * Delete a website from monitoring
 */
router.delete('/websites/:url', verifySecret, asyncHandler(async (req, res) => {
  const websiteUrl = decodeURIComponent(req.params.url);

  try {
    const website = db.deleteWebsite(websiteUrl);
    logger.info('Website deleted via API', { url: websiteUrl });
    res.json({ message: 'Website deleted successfully', website });
  } catch (error) {
    if (error.message === 'Website not found') {
      return res.status(404).json({ error: 'Website not found' });
    }
    throw error;
  }
}));

module.exports = router;
