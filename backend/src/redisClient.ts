import { createClient } from 'redis';
import type { RedisClientType } from 'redis';

import { config } from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: path.resolve(__dirname, '../.env') });


let client: RedisClientType | null = null;

async function initRedis() {
  const redisHost = process.env.REDIS_HOST || 'localhost';
  const redisPort = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379 ;
  const redisUsername = process.env.REDIS_USERNAME || 'default';
  const redisPassword = process.env.REDIS_PASSWORD || 'default';

  const url = `redis://${redisUsername}:${redisPassword}@${redisHost}:${redisPort}`;

  try {
    client = createClient({ url });
    client.on('error', (err) => console.error('Redis Client Error:', err));
    client.on('connect', () => console.log('Redis Client Connecting..'));
    client.on('ready', () => console.log('Redis Client Ready'));
    client.on('end', () => console.log('Redis Client Disconnected'));

    await client.connect();
    console.log(`Connected to Redis at ${redisHost}:${redisPort}`);

    // Verify connection
    await client.ping();
    console.log('Redis PING successful');
  } catch (error) {
    console.error(`Failed to connect to Redis at ${redisHost}:${redisPort}:`, error);
    throw error;
  }
}

export async function getRedisClient(): Promise<RedisClientType> {
  if (!client) {
    await initRedis();
  }
  if (!client) {
    throw new Error('Redis client not initialized');
  }
  return client;
}

export async function closeRedis() {
  if (client) {
    await client.quit();
    client = null;
    console.log('Redis connection closed');
  }
}

export default initRedis;


