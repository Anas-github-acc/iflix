from pinecone import Pinecone
import logging
from app.config import PINECONE_API_KEY, PINECONE_ENVIRONMENT

logger = logging.getLogger(__name__)

class PineconeConnection:
    _instance = None
    _user_index = None
    _movie_index = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(PineconeConnection, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        try:
            self.pc = Pinecone(api_key=PINECONE_API_KEY)
            logger.info("Connected to Pinecone")
        except Exception as e:
            logger.error(f"Failed to connect to Pinecone: {e}")
            raise

    def get_user_index(self):
        if not self._user_index:
            self._user_index = self.pc.Index("user-embeddings")
        return self._user_index

    def get_movie_index(self):
        if not self._movie_index:
            self._movie_index = self.pc.Index("movie-embeddings")
        return self._movie_index

    def close(self):
        # Cleanup if needed
        pass