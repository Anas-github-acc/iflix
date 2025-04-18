import { createClient, RedisClientType } from 'redis';

// Singleton Redis client instance
let client: RedisClientType | null = null;

async function initRedis(): Promise<void> {
  if (client) {
    return; 
  }

  const redisHost = process.env.NEXT_PUBLIC_REDIS_HOST || 'localhost';
  const redisPort = process.env.NEXT_PUBLIC_REDIS_PORT ? parseInt(process.env.NEXT_PUBLIC_REDIS_PORT, 10) : 6379;
  const redisUsername = process.env.NEXT_PUBLIC_REDIS_USERNAME || undefined;
  const redisPassword = process.env.NEXT_PUBLIC_REDIS_PASSWORD || undefined;

  // Construct Redis URL
  const url =
    redisUsername && redisPassword
      ? `redis://${redisUsername}:${redisPassword}@${redisHost}:${redisPort}`
      : `redis://${redisHost}:${redisPort}`;

  try {
    client = createClient({
      url,
      // Optional: configure connection retry
      socket: {
        reconnectStrategy: (retries: number) => {
          if (retries > 10) return new Error('Max retries reached');
          return Math.min(retries * 100, 3000); // Retry with increasing delay, max 3s
        },
      },
    });

    // Event listeners for connection status
    client.on('error', (err) => {
      console.error('Redis Client Error:', err);
      client = null; // Reset client on persistent errors
    });
    client.on('connect', () => console.log('Redis Client Connecting...'));
    client.on('ready', () => console.log('Redis Client Ready'));
    client.on('end', () => {
      console.log('Redis Client Disconnected');
      client = null; // Reset client on disconnection
    });

    // Connect to Redis
    await client.connect();
    console.log(`Connected to Redis at ${redisHost}:${redisPort}`);

    // Verify connection
    const pingResponse = await client.ping();
    console.log('Redis PING response:', pingResponse);
  } catch (error) {
    console.error(`Failed to connect to Redis at ${redisHost}:${redisPort}:`, error);
    client = null;
    throw new Error('Redis connection failed');
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

export async function closeRedisClient(): Promise<void> {
  if (client) {
    try {
      await client.quit();
      console.log('Redis connection closed');
    } catch (error) {
      console.error('Error closing Redis connection:', error);
    } finally {
      client = null;
    }
  }
}
