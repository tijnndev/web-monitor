const Joi = require('joi');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Define validation schema
const envSchema = Joi.object({
  // Server Configuration
  PORT: Joi.number().default(8007),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  
  // Broadcast Configuration
  BROADCAST_URL: Joi.string().uri().required(),
  BROADCAST_SECRET: Joi.string().min(16).required(),
  SERVICE_ID: Joi.number().required(),
  
  // Monitoring Configuration
  CHECK_INTERVAL: Joi.string().default('0 * * * *'), // Default: hourly
  RETRY_ATTEMPTS: Joi.number().default(3),
  REQUEST_TIMEOUT: Joi.number().default(10000),
  
  // Database Configuration
  DB_PATH: Joi.string().default('./data/monitoring.db'),
  
  // Discord Configuration (from config.js, but could be env vars)
  DISCORD_TOKEN: Joi.string().optional(),
  DISCORD_CHANNEL_ID: Joi.string().optional(),
  DISCORD_CLIENT_ID: Joi.string().optional(),
  DISCORD_GUILD_ID: Joi.string().optional(),
}).unknown(); // Allow other env vars

// Validate environment variables
const { error, value: validatedEnv } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Environment validation error: ${error.message}`);
}

module.exports = validatedEnv;
