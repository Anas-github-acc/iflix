import numpy as np
import json
import logging
from scipy.sparse import csr_matrix
from sklearn.decomposition import TruncatedSVD
from app.connect.pinecone import PineconeConnection
from app.connect.rabbitmq import RabbitMQConnection

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

pinecone_conn = PineconeConnection()
rabbitmq_conn = RabbitMQConnection()

embedding_dim = 64

def load_user_item_matrix() -> csr_matrix:
    try:
        user_index = pinecone_conn.get_user_index()
        movie_index = pinecone_conn.get_movie_index()
        
        # Get dimensions from index stats
        user_stats = user_index.describe_index_stats()
        movie_stats = movie_index.describe_index_stats()
        
        num_users = user_stats['total_vector_count'] or 1
        num_movies = movie_stats['total_vector_count'] or 1
        
        logger.info(f"Initialized matrix: {num_users}x{num_movies}")
        return csr_matrix((num_users, num_movies), dtype=np.float32)
    except Exception as e:
        logger.error(f"Failed to load user-item matrix: {e}")
        return csr_matrix((1, 1), dtype=np.float32)

def update_embeddings(matrix, num_users, num_movies):
    svd = TruncatedSVD(n_components=embedding_dim, random_state=42)
    user_embeddings = svd.fit_transform(matrix)
    movie_embeddings = svd.components_.T
    
    user_embeddings = user_embeddings[:num_users]
    movie_embeddings = movie_embeddings[:num_movies]
    
    logger.info(f"Updated embeddings: {user_embeddings.shape} users, {movie_embeddings.shape} movies")
    return user_embeddings, movie_embeddings

def callback(ch, method, properties, body):
    try:
        user_index = pinecone_conn.get_user_index()
        movie_index = pinecone_conn.get_movie_index()

        data = json.loads(body)
        user_id = data['userId']
        movie_id = data['movieId']
        rating = data['rating']
        
        logger.info(f"Processing training data: user_id={user_id}, movie_id={movie_id}, rating={rating}")

        # Update matrix and get new embeddings
        matrix = load_user_item_matrix()
        try:
            matrix[user_id, movie_id] = rating
        except IndexError:
            num_users = max(matrix.shape[0], user_id + 1)
            num_movies = max(matrix.shape[1], movie_id + 1)
            new_matrix = csr_matrix((num_users, num_movies), dtype=np.float32)
            new_matrix[:matrix.shape[0], :matrix.shape[1]] = matrix
            new_matrix[user_id, movie_id] = rating
            matrix = new_matrix
            logger.info(f"Expanded matrix to {num_users}x{num_movies}")

        user_embeddings, movie_embeddings = update_embeddings(matrix, matrix.shape[0], matrix.shape[1])

        # Update embeddings in Pinecone
        if user_embeddings.size > 0 and movie_embeddings.size > 0:
            user_index.upsert([(str(user_id), user_embeddings[user_id].tolist())])
            movie_index.upsert([(str(movie_id), movie_embeddings[movie_id].tolist())])
            logger.info(f"Saved embeddings for user_id={user_id}, movie_id={movie_id}")

        ch.basic_ack(delivery_tag=method.delivery_tag)
        logger.info(f"Trained on user_id={user_id}, movie_id={movie_id}, rating={rating}")
    except Exception as e:
        logger.error(f"Error processing training data: {e}")
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

def main():
    try:
        channel = rabbitmq_conn.get_channel()
        for queue in ['training_data', 'user_actions', 'embeddings', 'recommendation_requests']:
            channel.queue_declare(queue=queue, durable=True)
            logger.info(f"Declared queue: {queue}")

        channel.basic_consume(
            queue='training_data',
            on_message_callback=callback,
            auto_ack=False
        )
        logger.info("Training worker started, waiting for messages...")
        channel.start_consuming()
    except KeyboardInterrupt:
        logger.info("Shutting down training worker")
        rabbitmq_conn.close()
        pinecone_conn.close()
    except Exception as e:
        logger.error(f"Failed to start training worker: {e}")
        rabbitmq_conn.close()
        pinecone_conn.close()
        raise

if __name__ == "__main__":
    main()
