import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder
import json
from app.connect.redis import RedisConnection

print("Connecting to Redis...")
redis_conn = RedisConnection()
r = redis_conn.get_client()

user_embeddings_exist = bool(r.keys("user_embedding:*"))
movie_embeddings_exist = bool(r.keys("movie_embedding:*"))
movie_metadata_exist = bool(r.keys("movie_metadata:*"))
popular_movies_exist = bool(r.get("popular_movies"))

if user_embeddings_exist and movie_embeddings_exist and movie_metadata_exist and popular_movies_exist:
    print("Starting preprocessing...")

    ratings_df = pd.read_csv("./data/ratings.csv")
    movies_df = pd.read_csv("./data/movies_metadata.csv", low_memory=False)

    # Select relevant columns
    movies_df = movies_df[['id', 'title', 'genres']].rename(columns={'id': 'movieId'})
    ratings_df = ratings_df[['userId', 'movieId', 'rating']]

    # Convert movieId to numeric
    movies_df['movieId'] = pd.to_numeric(movies_df['movieId'], errors='coerce')
    ratings_df['movieId'] = pd.to_numeric(ratings_df['movieId'], errors='coerce')

    # Drop NaN movieId
    movies_df = movies_df.dropna(subset=['movieId'])
    ratings_df = ratings_df.dropna(subset=['movieId'])

    # Merge datasets
    movie_data = ratings_df.merge(movies_df, on='movieId')

    user_encoder = LabelEncoder()
    movie_encoder = LabelEncoder()
    movie_data['userId'] = user_encoder.fit_transform(movie_data['userId'])
    movie_data['movieId'] = movie_encoder.fit_transform(movie_data['movieId'])

    # Initialize embeddings
    np.random.seed(42)
    num_users = movie_data['userId'].nunique()
    num_movies = movie_data['movieId'].nunique()
    embedding_dim = 64
    print(f"Initializing embeddings for {num_users} users and {num_movies} movies")

    user_embeddings = np.random.normal(0, 0.1, (num_users, embedding_dim))
    movie_embeddings = np.random.normal(0, 0.1, (num_movies, embedding_dim))

    print("Storing embeddings in Redis...")
    for user_id in range(num_users):
        key = f"user_embedding:{user_id}"
        if not r.exists(key):
            r.set(key, json.dumps(user_embeddings[user_id].tolist()))
        if user_id % 1000 == 0:
            print(f"Processed {user_id}/{num_users} user embeddings")

    for movie_id in range(num_movies):
        key = f"movie_embedding:{movie_id}"
        if not r.exists(key):
            r.set(key, json.dumps(movie_embeddings[movie_id].tolist()))

    unique_movies = movie_data.drop_duplicates(subset=['movieId'])
    for idx, row in enumerate(unique_movies.iterrows()):
        key = f"movie_metadata:{row[1]['movieId']}"
        if not r.exists(key):
            r.set(key, json.dumps({
                'title': row[1]['title'],
                'genres': row[1]['genres']
            }))

    # Store popular movies (top 100 by rating count)
    if not r.exists("popular_movies"):
        popular_movies = movie_data.groupby('movieId').size().sort_values(ascending=False).head(100).index.tolist()
        r.set("popular_movies", json.dumps(popular_movies))

    print("Preprocessing complete!")
    print(f"Summary:")
    print(f"- Users processed: {num_users}")
    print(f"- Movies processed: {num_movies}")
    print(f"- Total ratings: {len(movie_data)}")
    print(f"- Popular movies stored: {len(popular_movies)}")

else:
    print("Preprocessing already done and we found embeddings in Redis.")
