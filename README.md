# Movie Recommendation System

A real-time recommendation system inspired by Monolith, using Hono, React, Python, RabbitMQ, Redis, and Flink.

## Setup

1. **Install Dependencies**:
   - Node.js (v18+)
   - Python (3.8+)
   - Docker
   - Apache Flink
   


### **How to Run**
1. Start services: `docker-compose up -d`.
2. Preprocess: `cd python && python preprocess.py`.
3. Run workers:
   - `python inference_worker.py`
   - `python training_worker.py`
   - `./bin/flink run python/flink_job.py`
4. Start backend: `cd backend && yarn install && yarn start`.
5. Start frontend: `cd frontend && yarn install && yarn start`.
6. Access: http://localhost:3000.

---

### **Key Features**
- **Redis**: Stores embeddings and metadata, sharded by `userId` and `movieId`.
- **Hono**: Lightweight, type-safe backend framework.
- **Real-Time**: Minute-level updates via Flink and RabbitMQ.
- **Actions**: Supports view, like, rate (0–5), no comments.
- **Recommendations**: Combines trained and popular movies, ranked by similarity.

Let me know if you need further refinements!