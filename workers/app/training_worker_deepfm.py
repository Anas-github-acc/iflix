import numpy as np
import tensorflow as tf
from tensorflow.keras.layers import Dense, Embedding, Input
from tensorflow.keras.models import Model
import pika
import redis
import json
import os
from .config import REDIS_HOST, REDIS_PORT, REDIS_USERNAME, REDIS_PASSWORD, REDIS_DB

r = redis.Redis(
    host=REDIS_HOST,
    port=REDIS_PORT,
    username=REDIS_USERNAME,
    password=REDIS_PASSWORD,
    db=REDIS_DB,
    decode_responses=True
)

# Initialize model
num_users = len([k for k in r.keys("user_embedding:*")])
num_movies = len([k for k in r.keys("movie_embedding:*")])
embedding_dim = 64


def build_deepfm(num_users, num_movies, embedding_dim):
  user_inputs = Input(shape=(1,), name='user_input')
  movie_inputs = Input(shape=(1,), name='movie_input')

  user_embedding = Embedding(num_users, embedding_dim, name='user_embedding')(user_inputs)
  movie_embedding = Embedding(num_movies, embedding_dim, name='movie_embedding')(movie_inputs)

  fm_input = tf.keras.layers.Concatenate()([user_embedding, movie_embedding]) # Concatenate user and movie embeddings , Concatenate means we are combining the two embeddings into a single tensor
  fm_output = Dense(1, activation='sigmoid')(fm_input) # Output layer with sigmoid activation for binary classification

  deep_input = tf.keras.layers.Flatten()(fm_input)
  deep = Dense(64, activation='relu')(deep_input)
  deep = Dense(32, activation='relu')(deep)
  deep_output = Dense(1, activation='sigmoid')(deep)

  output = Dense(1, activation='sigmoid')(tf.keras.layers.Concatenate()([fm_output, deep_output]))
    
  model = Model(inputs=[user_inputs, movie_inputs], outputs=output)
  model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
  return model

model = build_deepfm(num_users, num_movies, embedding_dim)

# RabbitMQ connection
rabbitmq_host = os.getenv('RABBITMQ_HOST', 'rabbitmq')
connection = pika.BlockingConnection(pika.ConnectionParameters(host=rabbitmq_host, port=5672))
channel = connection.channel()
channel.queue_declare(queue='training_data')

def callback(ch, method, properties, body):
  data = json.loads(body)
  user_id = data['userId']
  movie_id = data['movieId']
  rating = data['rating']

  X_user = np.array([user_id])
  X_movie = np.array([movie_id])
  y = np.array([1 if rating >= 3.5 else 0])

  model.fit([X_user, X_movie], y, epochs=1, verbose=0)

  # Update embeddings in Redis
  user_emb_layer = model.get_layer('user_embedding')
  movie_emb_layer = model.get_layer('movie_embedding')
  r.set(f"user_embedding:{user_id}", json.dumps(user_emb_layer.get_weights()[0][user_id].tolist()))
  r.set(f"movie_embedding:{movie_id}", json.dumps(movie_emb_layer.get_weights()[0][movie_id].tolist()))
  
  print(f"Trained on user {user_id} and movie {movie_id} with rating {rating}.")
  
channel.basic_consume(queue='training_data', on_message_callback=callback, auto_ack=True)
print('Waiting for training data...')
channel.start_consuming()
