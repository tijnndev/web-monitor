const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const env = require('../config/env');
const logger = require('../utils/logger');

class DatabaseService {
  constructor() {
    this.db = null;
    this.initialize();
  }

  initialize() {
    try {
      // Ensure data directory exists
      const dbDir = path.dirname(env.DB_PATH);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Initialize database
      this.db = new Database(env.DB_PATH);
      this.db.pragma('journal_mode = WAL');
      
      logger.info('Database initialized successfully');
      
      // Create tables
      this.createTables();
    } catch (error) {
      logger.error('Failed to initialize database:', error);
      throw error;
    }
  }

  createTables() {
    // Monitoring checks table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS monitoring_checks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        website_name TEXT NOT NULL,
        website_url TEXT NOT NULL,
        is_online BOOLEAN NOT NULL,
        status_code INTEGER,
        response_time INTEGER,
        error_message TEXT,
        checked_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Website status table (current state)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS website_status (
        website_url TEXT PRIMARY KEY,
        website_name TEXT NOT NULL,
        is_online BOOLEAN NOT NULL,
        last_checked DATETIME,
        last_online DATETIME,
        last_offline DATETIME,
        consecutive_failures INTEGER DEFAULT 0,
        total_checks INTEGER DEFAULT 0,
        total_uptime_ms INTEGER DEFAULT 0
      )
    `);

    // Incidents table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS incidents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        website_name TEXT NOT NULL,
        website_url TEXT NOT NULL,
        started_at DATETIME NOT NULL,
        resolved_at DATETIME,
        duration_minutes INTEGER,
        is_resolved BOOLEAN DEFAULT 0
      )
    `);

    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_checks_website_url ON monitoring_checks(website_url);
      CREATE INDEX IF NOT EXISTS idx_checks_checked_at ON monitoring_checks(checked_at);
      CREATE INDEX IF NOT EXISTS idx_incidents_website_url ON incidents(website_url);
    `);

    logger.info('Database tables created successfully');
  }

  // Record a monitoring check
  recordCheck(websiteName, websiteUrl, isOnline, statusCode, responseTime, errorMessage) {
    const stmt = this.db.prepare(`
      INSERT INTO monitoring_checks (website_name, website_url, is_online, status_code, response_time, error_message)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(websiteName, websiteUrl, isOnline, statusCode, responseTime, errorMessage);
  }

  // Update website status
  updateWebsiteStatus(websiteName, websiteUrl, isOnline) {
    const now = new Date().toISOString();
    
    const existing = this.db.prepare('SELECT * FROM website_status WHERE website_url = ?').get(websiteUrl);
    
    if (existing) {
      const consecutiveFailures = isOnline ? 0 : (existing.consecutive_failures + 1);
      
      this.db.prepare(`
        UPDATE website_status 
        SET is_online = ?, 
            last_checked = ?,
            last_online = CASE WHEN ? = 1 THEN ? ELSE last_online END,
            last_offline = CASE WHEN ? = 0 THEN ? ELSE last_offline END,
            consecutive_failures = ?,
            total_checks = total_checks + 1
        WHERE website_url = ?
      `).run(isOnline, now, isOnline, now, isOnline, now, consecutiveFailures, websiteUrl);
      
      // Check if we need to create or resolve an incident
      if (!isOnline && existing.is_online) {
        this.createIncident(websiteName, websiteUrl);
      } else if (isOnline && !existing.is_online) {
        this.resolveIncident(websiteUrl);
      }
    } else {
      this.db.prepare(`
        INSERT INTO website_status (website_name, website_url, is_online, last_checked, last_online, last_offline, consecutive_failures, total_checks)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      `).run(websiteName, websiteUrl, isOnline, now, isOnline ? now : null, isOnline ? null : now, isOnline ? 0 : 1);
      
      if (!isOnline) {
        this.createIncident(websiteName, websiteUrl);
      }
    }
  }

  // Create incident
  createIncident(websiteName, websiteUrl) {
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO incidents (website_name, website_url, started_at, is_resolved)
      VALUES (?, ?, ?, 0)
    `).run(websiteName, websiteUrl, now);
    
    logger.info(`Incident created for ${websiteName}`);
  }

  // Resolve incident
  resolveIncident(websiteUrl) {
    const now = new Date().toISOString();
    
    const incident = this.db.prepare(`
      SELECT * FROM incidents 
      WHERE website_url = ? AND is_resolved = 0 
      ORDER BY started_at DESC 
      LIMIT 1
    `).get(websiteUrl);
    
    if (incident) {
      const durationMinutes = Math.round((new Date(now) - new Date(incident.started_at)) / 1000 / 60);
      
      this.db.prepare(`
        UPDATE incidents 
        SET resolved_at = ?, duration_minutes = ?, is_resolved = 1
        WHERE id = ?
      `).run(now, durationMinutes, incident.id);
      
      logger.info(`Incident resolved for ${incident.website_name} (duration: ${durationMinutes} minutes)`);
    }
  }

  // Get all website statuses
  getAllStatuses() {
    return this.db.prepare('SELECT * FROM website_status').all();
  }

  // Get recent checks for a website
  getRecentChecks(websiteUrl, limit = 100) {
    return this.db.prepare(`
      SELECT * FROM monitoring_checks 
      WHERE website_url = ? 
      ORDER BY checked_at DESC 
      LIMIT ?
    `).all(websiteUrl, limit);
  }

  // Get active incidents
  getActiveIncidents() {
    return this.db.prepare(`
      SELECT * FROM incidents 
      WHERE is_resolved = 0 
      ORDER BY started_at DESC
    `).all();
  }

  // Get uptime statistics
  getUptimeStats(websiteUrl, hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    const stats = this.db.prepare(`
      SELECT 
        COUNT(*) as total_checks,
        SUM(CASE WHEN is_online = 1 THEN 1 ELSE 0 END) as successful_checks,
        AVG(CASE WHEN response_time IS NOT NULL THEN response_time ELSE NULL END) as avg_response_time
      FROM monitoring_checks
      WHERE website_url = ? AND checked_at >= ?
    `).get(websiteUrl, since);
    
    const uptimePercentage = stats.total_checks > 0 
      ? ((stats.successful_checks / stats.total_checks) * 100).toFixed(2)
      : 0;
    
    return {
      ...stats,
      uptime_percentage: parseFloat(uptimePercentage),
      period_hours: hours
    };
  }

  // Get metrics for all websites
  getMetrics() {
    const totalChecks = this.db.prepare('SELECT COUNT(*) as count FROM monitoring_checks').get().count;
    const failedChecks = this.db.prepare('SELECT COUNT(*) as count FROM monitoring_checks WHERE is_online = 0').get().count;
    const activeIncidents = this.db.prepare('SELECT COUNT(*) as count FROM incidents WHERE is_resolved = 0').get().count;
    
    return {
      total_checks: totalChecks,
      failed_checks: failedChecks,
      active_incidents: activeIncidents,
      uptime_percentage: totalChecks > 0 ? (((totalChecks - failedChecks) / totalChecks) * 100).toFixed(2) : 100
    };
  }

  close() {
    if (this.db) {
      this.db.close();
      logger.info('Database connection closed');
    }
  }
}

// Export singleton instance
module.exports = new DatabaseService();
