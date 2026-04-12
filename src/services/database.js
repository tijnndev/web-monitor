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
    // Websites configuration table (stores website configurations)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS websites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        url TEXT NOT NULL UNIQUE,
        monitored BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check if we need to migrate old tables
    const needsMigration = this.checkIfMigrationNeeded();

    if (needsMigration) {
      logger.info('Migrating database to use foreign keys...');
      this.migrateTablesToForeignKeys();
    } else {
      // Create new tables with foreign keys
      this.createTablesWithForeignKeys();
    }

    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_checks_website_id ON monitoring_checks(website_id);
      CREATE INDEX IF NOT EXISTS idx_checks_checked_at ON monitoring_checks(checked_at);
      CREATE INDEX IF NOT EXISTS idx_incidents_website_id ON incidents(website_id);
      CREATE INDEX IF NOT EXISTS idx_websites_monitored ON websites(monitored);
    `);

    logger.info('Database tables created successfully');
    
    // Migrate existing config to database if websites table is empty
    this.migrateConfigToDatabase();
  }

  checkIfMigrationNeeded() {
    try {
      // Check if monitoring_checks has website_id column
      const tableInfo = this.db.pragma('table_info(monitoring_checks)');
      const hasWebsiteId = tableInfo.some(col => col.name === 'website_id');
      return !hasWebsiteId && tableInfo.length > 0;
    } catch (error) {
      return false;
    }
  }

  migrateTablesToForeignKeys() {
    // Backup old tables and create new ones with foreign keys
    try {
      // Create new monitoring_checks table with foreign key
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS monitoring_checks_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          website_id INTEGER NOT NULL,
          is_online BOOLEAN NOT NULL,
          status_code INTEGER,
          response_time INTEGER,
          error_message TEXT,
          checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE
        )
      `);

      // Migrate data from old table if it exists
      const oldChecksExist = this.db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='monitoring_checks'`).get();
      if (oldChecksExist) {
        this.db.exec(`
          INSERT INTO monitoring_checks_new (website_id, is_online, status_code, response_time, error_message, checked_at)
          SELECT 
            COALESCE(w.id, 0),
            mc.is_online,
            mc.status_code,
            mc.response_time,
            mc.error_message,
            mc.checked_at
          FROM monitoring_checks mc
          LEFT JOIN websites w ON mc.website_url = w.url
          WHERE w.id IS NOT NULL
        `);
        this.db.exec(`DROP TABLE monitoring_checks`);
      }
      this.db.exec(`ALTER TABLE monitoring_checks_new RENAME TO monitoring_checks`);

      // Create new website_status table with foreign key
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS website_status_new (
          website_id INTEGER PRIMARY KEY,
          is_online BOOLEAN NOT NULL,
          last_checked DATETIME,
          last_online DATETIME,
          last_offline DATETIME,
          consecutive_failures INTEGER DEFAULT 0,
          total_checks INTEGER DEFAULT 0,
          total_uptime_ms INTEGER DEFAULT 0,
          FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE
        )
      `);

      // Migrate data from old table if it exists
      const oldStatusExist = this.db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='website_status'`).get();
      if (oldStatusExist) {
        this.db.exec(`
          INSERT INTO website_status_new (website_id, is_online, last_checked, last_online, last_offline, consecutive_failures, total_checks, total_uptime_ms)
          SELECT 
            w.id,
            ws.is_online,
            ws.last_checked,
            ws.last_online,
            ws.last_offline,
            ws.consecutive_failures,
            ws.total_checks,
            ws.total_uptime_ms
          FROM website_status ws
          INNER JOIN websites w ON ws.website_url = w.url
        `);
        this.db.exec(`DROP TABLE website_status`);
      }
      this.db.exec(`ALTER TABLE website_status_new RENAME TO website_status`);

      // Create new incidents table with foreign key
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS incidents_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          website_id INTEGER NOT NULL,
          started_at DATETIME NOT NULL,
          resolved_at DATETIME,
          duration_minutes INTEGER,
          is_resolved BOOLEAN DEFAULT 0,
          FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE
        )
      `);

      // Migrate data from old table if it exists
      const oldIncidentsExist = this.db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='incidents'`).get();
      if (oldIncidentsExist) {
        this.db.exec(`
          INSERT INTO incidents_new (website_id, started_at, resolved_at, duration_minutes, is_resolved)
          SELECT 
            w.id,
            i.started_at,
            i.resolved_at,
            i.duration_minutes,
            i.is_resolved
          FROM incidents i
          INNER JOIN websites w ON i.website_url = w.url
        `);
        this.db.exec(`DROP TABLE incidents`);
      }
      this.db.exec(`ALTER TABLE incidents_new RENAME TO incidents`);

      logger.info('Database migration to foreign keys completed successfully');
    } catch (error) {
      logger.error('Error during database migration:', error);
      throw error;
    }
  }

  createTablesWithForeignKeys() {
    // Monitoring checks table with foreign key
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS monitoring_checks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        website_id INTEGER NOT NULL,
        is_online BOOLEAN NOT NULL,
        status_code INTEGER,
        response_time INTEGER,
        error_message TEXT,
        checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE
      )
    `);

    // Website status table with foreign key
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS website_status (
        website_id INTEGER PRIMARY KEY,
        is_online BOOLEAN NOT NULL,
        last_checked DATETIME,
        last_online DATETIME,
        last_offline DATETIME,
        consecutive_failures INTEGER DEFAULT 0,
        total_checks INTEGER DEFAULT 0,
        total_uptime_ms INTEGER DEFAULT 0,
        FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE
      )
    `);

    // Incidents table with foreign key
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS incidents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        website_id INTEGER NOT NULL,
        started_at DATETIME NOT NULL,
        resolved_at DATETIME,
        duration_minutes INTEGER,
        is_resolved BOOLEAN DEFAULT 0,
        FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE
      )
    `);
  }

  // Migrate existing config.js websites to database
  migrateConfigToDatabase() {
    const count = this.db.prepare('SELECT COUNT(*) as count FROM websites').get().count;
    
    if (count === 0) {
      try {
        const config = require('../../config');
        if (config.websites && Array.isArray(config.websites)) {
          const stmt = this.db.prepare(`
            INSERT INTO websites (name, url, monitored) 
            VALUES (?, ?, 1)
          `);
          
          for (const website of config.websites) {
            try {
              stmt.run(website.name, website.url);
            } catch (err) {
              logger.warn(`Failed to migrate website ${website.name}: ${err.message}`);
            }
          }
          
          logger.info(`Migrated ${config.websites.length} websites from config to database`);
        }
      } catch (error) {
        logger.warn('No config.js found or migration failed, starting with empty websites table');
      }
    }
  }

  // Record a monitoring check
  recordCheck(websiteName, websiteUrl, isOnline, statusCode, responseTime, errorMessage) {
    // Get website_id from url
    const website = this.getWebsiteByUrl(websiteUrl);
    if (!website) {
      logger.warn(`Cannot record check: website not found for URL ${websiteUrl}`);
      return;
    }

    const stmt = this.db.prepare(`
      INSERT INTO monitoring_checks (website_id, is_online, status_code, response_time, error_message)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    // Convert boolean to integer for SQLite (1 or 0)
    const isOnlineInt = isOnline ? 1 : 0;
    
    // Ensure all values are valid SQLite types (numbers, strings, bigints, buffers, or null)
    stmt.run(
      website.id,
      isOnlineInt, 
      statusCode, 
      responseTime, 
      errorMessage
    );
  }

  // Update website status
  updateWebsiteStatus(websiteName, websiteUrl, isOnline) {
    const now = new Date().toISOString();
    
    // Get website_id from url
    const website = this.getWebsiteByUrl(websiteUrl);
    if (!website) {
      logger.warn(`Cannot update status: website not found for URL ${websiteUrl}`);
      return;
    }
    
    // Convert boolean to integer for SQLite (1 or 0)
    const isOnlineInt = isOnline ? 1 : 0;
    
    const existing = this.db.prepare('SELECT * FROM website_status WHERE website_id = ?').get(website.id);
    
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
        WHERE website_id = ?
      `).run(isOnlineInt, now, isOnlineInt, now, isOnlineInt, now, consecutiveFailures, website.id);
      
      // Check if we need to create or resolve an incident
      if (!isOnline && existing.is_online) {
        this.createIncident(website.id);
      } else if (isOnline && !existing.is_online) {
        this.resolveIncident(website.id);
      }
    } else {
      this.db.prepare(`
        INSERT INTO website_status (website_id, is_online, last_checked, last_online, last_offline, consecutive_failures, total_checks)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `).run(website.id, isOnlineInt, now, isOnline ? now : null, isOnline ? null : now, isOnline ? 0 : 1);
      
      if (!isOnline) {
        this.createIncident(website.id);
      }
    }
  }

  // Create incident
  createIncident(websiteId) {
    const website = this.db.prepare('SELECT * FROM websites WHERE id = ?').get(websiteId);
    if (!website) {
      logger.warn(`Cannot create incident: website not found with ID ${websiteId}`);
      return;
    }

    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO incidents (website_id, started_at, is_resolved)
      VALUES (?, ?, 0)
    `).run(websiteId, now);
    
    logger.info(`Incident created for ${website.name}`);
  }

  // Resolve incident
  resolveIncident(websiteId) {
    const website = this.db.prepare('SELECT * FROM websites WHERE id = ?').get(websiteId);
    if (!website) {
      logger.warn(`Cannot resolve incident: website not found with ID ${websiteId}`);
      return;
    }

    const now = new Date().toISOString();
    
    const incident = this.db.prepare(`
      SELECT * FROM incidents 
      WHERE website_id = ? AND is_resolved = 0 
      ORDER BY started_at DESC 
      LIMIT 1
    `).get(websiteId);
    
    if (incident) {
      const durationMinutes = Math.round((new Date(now) - new Date(incident.started_at)) / 1000 / 60);
      
      this.db.prepare(`
        UPDATE incidents 
        SET resolved_at = ?, duration_minutes = ?, is_resolved = 1
        WHERE id = ?
      `).run(now, durationMinutes, incident.id);
      
      logger.info(`Incident resolved for ${website.name} (duration: ${durationMinutes} minutes)`);
    }
  }

  // Get all website statuses
  getAllStatuses() {
    return this.db.prepare(`
      SELECT 
        ws.*,
        w.name as website_name,
        w.url as website_url
      FROM website_status ws
      INNER JOIN websites w ON ws.website_id = w.id
    `).all();
  }

  // Get recent checks for a website
  getRecentChecks(websiteUrl, limit = 100) {
    const website = this.getWebsiteByUrl(websiteUrl);
    if (!website) {
      return [];
    }

    return this.db.prepare(`
      SELECT 
        mc.*,
        w.name as website_name,
        w.url as website_url
      FROM monitoring_checks mc
      INNER JOIN websites w ON mc.website_id = w.id
      WHERE mc.website_id = ? 
      ORDER BY mc.checked_at DESC 
      LIMIT ?
    `).all(website.id, limit);
  }

  // Get active incidents
  getActiveIncidents() {
    return this.db.prepare(`
      SELECT 
        i.*,
        w.name as website_name,
        w.url as website_url
      FROM incidents i
      INNER JOIN websites w ON i.website_id = w.id
      WHERE i.is_resolved = 0 
      ORDER BY i.started_at DESC
    `).all();
  }

  // Get uptime statistics
  getUptimeStats(websiteUrl, hours = 24) {
    const website = this.getWebsiteByUrl(websiteUrl);
    if (!website) {
      return {
        total_checks: 0,
        successful_checks: 0,
        uptime_percentage: 0,
        avg_response_time: null,
        period_hours: hours
      };
    }

    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    const stats = this.db.prepare(`
      SELECT 
        COUNT(*) as total_checks,
        SUM(CASE WHEN is_online = 1 THEN 1 ELSE 0 END) as successful_checks,
        AVG(CASE WHEN response_time IS NOT NULL THEN response_time ELSE NULL END) as avg_response_time
      FROM monitoring_checks
      WHERE website_id = ? AND checked_at >= ?
    `).get(website.id, since);
    
    const uptimePercentage = stats.total_checks > 0 
      ? ((stats.successful_checks / stats.total_checks) * 100).toFixed(2)
      : 0;
    
    return {
      website_url: websiteUrl,
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

  // ============ WEBSITE MANAGEMENT METHODS ============
  
  // Get all websites (optionally filter by monitored status)
  getAllWebsites(monitoredOnly = false) {
    if (monitoredOnly) {
      return this.db.prepare('SELECT * FROM websites WHERE monitored = 1 ORDER BY name').all();
    }
    return this.db.prepare('SELECT * FROM websites ORDER BY name').all();
  }

  // Get a single website by URL
  getWebsiteByUrl(url) {
    return this.db.prepare('SELECT * FROM websites WHERE url = ?').get(url);
  }

  // Add a new website
  addWebsite(name, url, monitored = true) {
    const monitoredInt = monitored ? 1 : 0;
    const now = new Date().toISOString();
    
    try {
      const stmt = this.db.prepare(`
        INSERT INTO websites (name, url, monitored, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(name, url, monitoredInt, now, now);
      logger.info(`Added website: ${name} (${url})`);
      
      return {
        id: result.lastInsertRowid,
        name,
        url,
        monitored,
        created_at: now,
        updated_at: now
      };
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        throw new Error('A website with this URL already exists');
      }
      throw error;
    }
  }

  // Update a website
  updateWebsite(url, updates) {
    const website = this.getWebsiteByUrl(url);
    if (!website) {
      throw new Error('Website not found');
    }

    const now = new Date().toISOString();
    const { name, monitored } = updates;
    
    const newName = name !== undefined ? name : website.name;
    const newMonitored = monitored !== undefined ? (monitored ? 1 : 0) : website.monitored;
    
    this.db.prepare(`
      UPDATE websites 
      SET name = ?, monitored = ?, updated_at = ?
      WHERE url = ?
    `).run(newName, newMonitored, now, url);
    
    logger.info(`Updated website: ${url}`);
    
    return this.getWebsiteByUrl(url);
  }

  // Toggle website monitoring status
  toggleMonitoring(url, monitored) {
    const monitoredInt = monitored ? 1 : 0;
    const now = new Date().toISOString();
    
    const result = this.db.prepare(`
      UPDATE websites 
      SET monitored = ?, updated_at = ?
      WHERE url = ?
    `).run(monitoredInt, now, url);
    
    if (result.changes === 0) {
      throw new Error('Website not found');
    }
    
    logger.info(`Toggled monitoring for ${url}: ${monitored}`);
    
    return this.getWebsiteByUrl(url);
  }

  // Delete a website
  deleteWebsite(url) {
    const website = this.getWebsiteByUrl(url);
    if (!website) {
      throw new Error('Website not found');
    }

    this.db.prepare('DELETE FROM websites WHERE url = ?').run(url);
    logger.info(`Deleted website: ${url}`);
    
    return website;
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
