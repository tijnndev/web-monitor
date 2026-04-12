const websiteMonitor = require('../src/services/websiteMonitor');

describe('WebsiteMonitor Service', () => {
  describe('checkSingleWebsite', () => {
    it('should return online status for valid website', async () => {
      const website = { name: 'Google', url: 'https://www.google.com' };
      const result = await websiteMonitor.checkSingleWebsite(website, 1);
      
      expect(result).toHaveProperty('name', 'Google');
      expect(result).toHaveProperty('isOnline');
      expect(result).toHaveProperty('url', 'https://www.google.com');
    }, 30000);

    it('should return offline status for invalid website', async () => {
      const website = { name: 'Invalid', url: 'https://invalid-website-that-does-not-exist-12345.com' };
      const result = await websiteMonitor.checkSingleWebsite(website, 1);
      
      expect(result).toHaveProperty('name', 'Invalid');
      expect(result.isOnline).toBe(false);
      expect(result).toHaveProperty('error');
    }, 30000);
  });

  describe('generateStatusMessage', () => {
    it('should generate proper status message', () => {
      const results = [
        { name: 'Site1', isOnline: true, responseTime: 100, statusCode: 200 },
        { name: 'Site2', isOnline: false, error: 'Connection failed' }
      ];
      
      const message = websiteMonitor.generateStatusMessage(results);
      
      expect(message).toContain('Site1: ONLINE');
      expect(message).toContain('Site2: OFFLINE');
      expect(message).toContain('100ms');
    });
  });
});
