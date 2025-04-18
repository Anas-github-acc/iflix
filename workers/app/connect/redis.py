import redis
import os
import logging
import time
from typing import Optional
from ..config import REDIS_HOST, REDIS_PORT, REDIS_USERNAME, REDIS_PASSWORD, REDIS_DB

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RedisConnection:
    def __init__(self):
        self.host = REDIS_HOST
        self.port = REDIS_PORT
        self.username = REDIS_USERNAME
        self.password = REDIS_PASSWORD
        self.db = REDIS_DB
        self.client: Optional[redis.Redis] = None

    def connect(self, max_retries=3, retry_delay=3) -> redis.Redis:
        for attempt in range(max_retries):
            try:
                self.client = redis.Redis(
                    host=self.host,
                    port=self.port,
                    username=self.username,
                    password=self.password,
                    db=self.db,
                    decode_responses=True
                )
                # Verify connection
                self.client.ping()
                logger.info(f"Connected to Redis at {self.host}:{self.port}")
                return self.client
            except redis.ConnectionError as e:
                logger.warning(f"Redis connection attempt {attempt + 1}/{max_retries} failed: {e}")
                if attempt + 1 == max_retries:
                    logger.error("Max retries reached for Redis connection")
                    raise
                time.sleep(retry_delay)
            except Exception as e:
                logger.error(f"Unexpected Redis connection error: {e}")
                raise
        raise redis.ConnectionError("Failed to connect to Redis")
    
    def get_client(self) -> redis.Redis:
        if self.client is None or not self.client.ping():
            return self.connect()
        return self.client
    
    def close(self):
        """Close the Redis connection."""
        if self.client:
            try:
                self.client.close()
                logger.info("Redis connection closed")
            except Exception as e:
                logger.error(f"Error closing Redis connection: {e}")
            finally:
                self.client = None