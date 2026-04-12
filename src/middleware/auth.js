const env = require('../config/env');
const logger = require('../utils/logger');

const verifySecret = (req, res, next) => {
  const provided = req.headers['x-api-key'];
  const expected = env.BROADCAST_SECRET;

  if (!provided) {
    logger.warn(`API key missing from ${req.ip} - ${req.path}`);
    return res.status(401).json({ error: 'API key required' });
  }

  if (provided !== expected) {
    logger.warn(`Invalid API key from ${req.ip} - ${req.path}`);
    return res.status(403).json({ error: 'Unauthorized' });
  }

  next();
};

module.exports = verifySecret;
