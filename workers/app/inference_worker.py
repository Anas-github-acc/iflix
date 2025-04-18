import numpy as np
import pika
import json
import os
import logging
from app.connect.pinecone import PineconeConnection
from app.connect.rabbitmq import RabbitMQConnection
from app.config import METADATA_FILE, POPULAR_MOVIES_FILE

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

pinecone_conn = PineconeConnection()
rabbitmq_conn = RabbitMQConnection()

def get_recommendations(user_id: int, top_k: int = 10) -> tuple[list, list]:
    try:
        # Load metadata
        with open(METADATA_FILE, 'r') as f:
            metadata = json.load(f)

        # Get user embedding
        user_index = pinecone_conn.get_user_index()
        user_vector = user_index.fetch([str(user_id)])
        if not user_vector['vectors']:
            logger.warning(f"No embedding found for user_id: {user_id}")
            return [], []

        user_embedding = user_vector['vectors'][str(user_id)]['values']

        # Query similar movies
        movie_index = pinecone_conn.get_movie_index()
        query_response = movie_index.query(
            vector=user_embedding,
            top_k=top_k,
            include_values=True
        )

        # Get movie IDs and scores
        trained_movie_ids = [match['id'] for match in query_response['matches']]

        # Load popular movies
        with open(POPULAR_MOVIES_FILE, 'r') as f:
            popular_movies = json.loads(f.read())[:top_k]

        # Combine and rank
        combined_ids = list(set(trained_movie_ids + popular_movies))
        ranked_ids = combined_ids[:top_k]  # Already ranked by Pinecone

        # Get titles
        titles = [
            metadata.get(str(mid), {}).get('title', 'Unknown')
            for mid in ranked_ids
        ]

        return ranked_ids, titles
    except Exception as e:
        logger.error(f"Error generating recommendations for user_id {user_id}: {e}")
        return [], []


def callback(ch, method, properties, body):
  try:
    request = json.loads(body)
    req_id = request['reqId']
    user_id = request['userId']
    logger.info(f"Processing recommendation request: reqId={req_id}, userId={user_id}")

    movie_ids, movie_titles = get_recommendations(user_id)

    # Get embeddings from Pinecone
    user_index = pinecone_conn.get_user_index()
    movie_index = pinecone_conn.get_movie_index()

    user_vector = user_index.fetch([str(user_id)])['vectors'][str(user_id)]['values']
    movie_vectors = {
        mid: movie_index.fetch([str(mid)])['vectors'][str(mid)]['values']
        for mid in movie_ids
    }

    embedding_data = {
        'reqId': req_id,
        'userId': user_id,
        'userEmbedding': user_vector,
        'movieEmbeddings': movie_vectors
    }

    # Publish to embeddings queue
    ch.basic_publish(
        exchange='',
        routing_key='embeddings',
        body=json.dumps(embedding_data),
        properties=pika.BasicProperties(delivery_mode=2)
    )

    ch.basic_ack(delivery_tag=method.delivery_tag)
    logger.info(f"Recommendations for reqId {req_id}: {movie_titles}")
  except Exception as e:
    logger.error(f"Error processing recommendation request: {e}")
    ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)


def main():
  try:
    channel = rabbitmq_conn.get_channel()
    channel.basic_consume(
        queue='recommendation_requests',
        on_message_callback=callback,
        auto_ack=False  # Manual acknowledgment
    )
    logger.info("Waiting for recommendation requests. To exit press CTRL+C")
    channel.start_consuming()
  except KeyboardInterrupt:
    logger.info("Shutting down inference worker")
    rabbitmq_conn.close()
    pinecone_conn.close()
  except Exception as e:
    logger.error(f"Failed to start inference worker: {e}")
    rabbitmq_conn.close()
    pinecone_conn.close()
    raise

if __name__ == "__main__":
    main()
