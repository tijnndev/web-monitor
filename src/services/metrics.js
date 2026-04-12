const db = require('./database');

class MetricsService {
  constructor() {
    this.startTime = Date.now();
    this.lastCheckTime = null;
  }

  /**
   * Get overall metrics
   */
  getOverallMetrics() {
    const dbMetrics = db.getMetrics();
    
    return {
      uptime_seconds: Math.floor((Date.now() - this.startTime) / 1000),
      last_check: this.lastCheckTime,
      ...dbMetrics
    };
  }

  /**
   * Get metrics for all websites
   */
  getAllWebsiteMetrics() {
    const statuses = db.getAllStatuses();
    
    return statuses.map(status => ({
      name: status.website_name,
      url: status.website_url,
      is_online: status.is_online,
      last_checked: status.last_checked,
      total_checks: status.total_checks,
      consecutive_failures: status.consecutive_failures,
      uptime_24h: db.getUptimeStats(status.website_url, 24)
    }));
  }

  /**
   * Update last check time
   */
  updateLastCheckTime() {
    this.lastCheckTime = new Date().toISOString();
  }

  /**
   * Get system health status
   */
  getHealthStatus() {
    const metrics = this.getOverallMetrics();
    const activeIncidents = db.getActiveIncidents();
    const statuses = db.getAllStatuses();
    
    const totalWebsites = statuses.length;
    const onlineWebsites = statuses.filter(s => s.is_online === 1).length;
    const offlineWebsites = statuses.filter(s => s.is_online === 0).length;
    
    return {
      status: activeIncidents.length === 0 ? 'healthy' : 'degraded',
      uptime: metrics.uptime_seconds,
      active_incidents: activeIncidents.length,
      total_websites: totalWebsites,
      online_websites: onlineWebsites,
      offline_websites: offlineWebsites,
      last_check: this.lastCheckTime,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new MetricsService();
