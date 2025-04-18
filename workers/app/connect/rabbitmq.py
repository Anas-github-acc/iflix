import pika
import os
import logging
import time
from typing import Optional, Tuple
from ..config import RABBITMQ_HOST, RABBITMQ_PORT

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RabbitMQConnection:
  def __init__(self):
      self.host = RABBITMQ_HOST
      self.port = RABBITMQ_PORT
      self.connection: Optional[pika.BlockingConnection] = None
      self.channel: Optional[pika.BlockingConnection.channel] = None

  def connect(self, max_retries=2, retry_delay=3) -> Tuple[pika.BlockingConnection, pika.BlockingConnection.channel]:
      credentials = pika.PlainCredentials('guest', 'guest')
      parameters = pika.ConnectionParameters(
          host=self.host,
          port=self.port,
          credentials=credentials
      )

      for attempt in range(max_retries):
          try:
              self.connection = pika.BlockingConnection(parameters)
              self.channel = self.connection.channel()
              # Declare queues
              self.channel.queue_declare(queue='recommendation_requests', durable=True)
              self.channel.queue_declare(queue='embeddings', durable=True)
              logger.info(f"Connected to RabbitMQ at {self.host}:{self.port}, queues initialized")
              return self.connection, self.channel
          except pika.exceptions.AMQPConnectionError as e:
              logger.warning(f"RabbitMQ connection attempt {attempt + 1}/{max_retries} failed: {e}")
              if attempt + 1 == max_retries:
                  logger.error("Max retries reached for RabbitMQ connection")
                  raise
              time.sleep(retry_delay)
          except Exception as e:
              logger.error(f"Unexpected RabbitMQ connection error: {e}")
              raise
      raise pika.exceptions.AMQPConnectionError("Failed to connect to RabbitMQ")
  
  def get_channel(self) -> pika.BlockingConnection.channel:
      if self.connection is None or self.connection.is_closed or self.channel is None or self.channel.is_closed:
          self.connection, self.channel = self.connect()
      if self.channel is None:
          raise pika.exceptions.AMQPConnectionError("RabbitMQ channel not initialized")
      return self.channel
  
  def close(self):
      try:
          if self.channel and not self.channel.is_closed:
              self.channel.close()
              logger.info("RabbitMQ channel closed")
          if self.connection and not self.connection.is_closed:
              self.connection.close()
              logger.info("RabbitMQ connection closed")
      except Exception as e:
          logger.error(f"Error closing RabbitMQ connection: {e}")
      finally:
          self.connection = None
          self.channel = None
