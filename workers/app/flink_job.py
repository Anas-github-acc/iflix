from pyflink.datastream import StreamExecutionEnvironment
from pyflink.table import StreamTableEnvironment, EnvironmentSettings
import pika
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def ensure_rabbitmq_queues():
    """Ensure RabbitMQ queues exist."""
    rabbitmq_host = os.getenv('RABBITMQ_HOST', 'rabbitmq')
    try:
        credentials = pika.PlainCredentials('guest', 'guest')
        connection = pika.BlockingConnection(
            pika.ConnectionParameters(host=rabbitmq_host, port=5672, credentials=credentials)
        )
        channel = connection.channel()
        channel.queue_declare(queue='user_actions', durable=True)
        channel.queue_declare(queue='embeddings', durable=True)
        channel.queue_declare(queue='training_data', durable=True)
        channel.queue_declare(queue='recommendation_requests', durable=True)
        logger.info("RabbitMQ queues ensured: user_actions, embeddings, training_data, recommendation_requests")
        connection.close()
    except Exception as e:
        logger.error(f"Failed to ensure RabbitMQ queues: {e}")
        raise

def flink_job():
    # Ensure queues
    ensure_rabbitmq_queues()

    # Flink setup
    env = StreamExecutionEnvironment.get_execution_environment()
    env_settings = EnvironmentSettings.in_streaming_mode()
    t_env = StreamTableEnvironment.create(env, environment_settings=env_settings)

    # Update the JAR path to match the one in Dockerfile
    t_env.get_config().set("pipeline.jars", "file:///app/lib/flink-connector-rabbitmq-3.0.1-1.17.jar")

    rabbitmq_host = os.getenv('RABBITMQ_HOST', 'rabbitmq')
    
    # Define RabbitMQ source for actions
    try:
        t_env.execute_sql(f"""
            CREATE TABLE actions (
                reqId STRING,
                userId INT,
                action STRING,
                movieId INT,
                rating FLOAT
            ) WITH (
                'connector' = 'rabbitmq',
                'uri' = 'amqp://guest:guest@{rabbitmq_host}:5672',
                'queue-name' = 'user_actions',
                'format' = 'json',
                'json.fail-on-missing-field' = 'false',
                'json.ignore-parse-errors' = 'true',
                'scan.startup.mode' = 'latest-offset'
            )
        """)
        logger.info("Created actions table")
    except Exception as e:
        logger.error(f"Failed to create actions table: {e}")
        raise

    # Define RabbitMQ source for embeddings
    try:
        t_env.execute_sql(f"""
            CREATE TABLE embeddings (
                reqId STRING,
                userId INT,
                userEmbedding ARRAY<FLOAT>,
                movieEmbeddings MAP<STRING, ARRAY<FLOAT>>
            ) WITH (
                'connector' = 'rabbitmq',
                'uri' = 'amqp://guest:guest@{rabbitmq_host}:5672',
                'queue-name' = 'embeddings',
                'format' = 'json',
                'json.fail-on-missing-field' = 'false',
                'json.ignore-parse-errors' = 'true',
                'scan.startup.mode' = 'latest-offset'
            )
        """)
        logger.info("Created embeddings table")
    except Exception as e:
        logger.error(f"Failed to create embeddings table: {e}")
        raise

    # Join actions and embeddings
    try:
        joined_table = t_env.sql_query("""
            SELECT a.reqId, a.userId, a.action, a.movieId, a.rating, e.userEmbedding, e.movieEmbeddings
            FROM actions a
            JOIN embeddings e ON a.reqId = e.reqId
        """)
        logger.info("Defined join query")
    except Exception as e:
        logger.error(f"Failed to define join query: {e}")
        raise

    # Define RabbitMQ sink
    try:
        t_env.execute_sql(f"""
            CREATE TABLE training_data (
                reqId STRING,
                userId INT,
                action STRING,
                movieId INT,
                rating FLOAT,
                userEmbedding ARRAY<FLOAT>,
                movieEmbeddings MAP<STRING, ARRAY<FLOAT>>
            ) WITH (
                'connector' = 'rabbitmq',
                'uri' = 'amqp://guest:guest@{rabbitmq_host}:5672',
                'queue-name' = 'training_data',
                'format' = 'json'
            )
        """)
        logger.info("Created training_data table")
    except Exception as e:
        logger.error(f"Failed to create training_data table: {e}")
        raise

    # Execute
    try:
        joined_table.execute_insert("training_data").wait()
        logger.info("Executing Flink job")
    except Exception as e:
        logger.error(f"Failed to execute Flink job: {e}")
        raise

    env.execute("Flink Streaming Job")

if __name__ == "__main__":
    flink_job()
