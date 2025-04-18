import axios from 'axios';
import { MovieResponse, MovieDetails } from './types';

const TMDB = axios.create({
  baseURL: process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3',
  headers: {
    Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

export const getGenres = async () => {
  try {
    const response = await TMDB.get('/genre/movie/list');
    return response.data.genres; // [{ id: 28, name: 'Action' }, ...]
  } catch (error) {
    console.error('Get genres error:', error);
    throw new Error('Failed to fetch genres');
  }
};

export const searchMovies = async (query: string, page: number = 1): Promise<MovieResponse> => {
  try {
    if (!query.trim()) {
      throw new Error('Search query cannot be empty');
    }
    const response = await TMDB.get('/search/movie', {
      params: {
        query,
        page,
        include_adult: false, // Optional: exclude adult content
      },
    });
    return response.data;
  } catch (error: unknown) {
    console.error('Search movies error:', error);
    throw new Error('Failed to search movies');
  }
};

export const getMoviesByGenre = async (genreId: string, page: number = 1): Promise<MovieResponse> => {
  try {
    console.log(`Fetching movies for genre ID: ${genreId}`);
    const response = await TMDB.get('/discover/movie', {
      params: {
        with_genres: genreId.toString(),
        page,
        sort_by: 'popularity.desc',
        include_adult: false,
      },
    });

    return response.data;
  } catch (error: unknown) {
    console.error('Get movies by genre error:', error);
    throw new Error('Failed to fetch movies by genre');
  }
};

export const getRandomMovies = async (): Promise<MovieResponse> => {
  try {
    const randomPage = Math.floor(Math.random() * 100) + 1;
    const response = await TMDB.get('/discover/movie', {
      params: {
        page: randomPage,
        sort_by: 'popularity.desc',
        include_adult: false,
      },
    });
    return response.data;
  } catch (error: unknown) {
    console.error('Get random movies error:', error);
    throw new Error('Failed to fetch random movies');
  }
};

export const getMovieDetails = async (movieId: string): Promise<MovieDetails> => {
  try {
    if (!movieId) {
      throw new Error('Movie ID is required');
    }

    const response = await TMDB.get(`/movie/${movieId}`, {
      params: {
        append_to_response: 'credits,videos,images,recommendations',
        include_image_language: 'en,null',
      },
    });
    
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      console.error(`Movie with ID ${movieId} not found`);
      throw new Error(`Movie not found`);
    }
    console.error('Get movie details error:', error);
    throw new Error('Failed to fetch movie details');
  }
};

export const getPopularMovies = async (page: number = 1): Promise<MovieResponse> => {
  try {
    const response = await TMDB.get('/movie/popular', {
      params: {
        page,
        include_adult: false,
      },
    });
    return response.data;
  } catch (error: unknown) {
    console.error('Get popular movies error:', error);
    throw new Error('Failed to fetch popular movies');
  }
};

export const getMovieRecommendations = async (movieId: string): Promise<MovieResponse> => {
  try {
    const response = await TMDB.get(`/movie/${movieId}/similar`, {
      params: {
        include_adult: false,
      },
    });
    return response.data;
  } catch (error: unknown) {
    console.error(`Get movie recommendations error for movie ${movieId}:`, error);
    throw new Error('Failed to fetch movie recommendations');
  }
};

export const getNowPlayingMovies = async (page: number = 1): Promise<MovieResponse> => {
  try {
    const response = await TMDB.get('/movie/now_playing', {
      params: { page, include_adult: false },
    });
    return response.data;
  } catch (error) {
    console.error('Get now playing movies error:', error);
    throw new Error('Failed to fetch now playing movies');
  }
};

export const getTopRatedMovies = async (page: number = 1): Promise<MovieResponse> => {
  try {
    const response = await TMDB.get('/movie/top_rated', {
      params: { page, include_adult: false },
    });
    return response.data;
  } catch (error) {
    console.error('Get top rated movies error:', error);
    throw new Error('Failed to fetch top rated movies');
  }
};

export const getUpcomingMovies = async (page: number = 1): Promise<MovieResponse> => {
  try {
    const response = await TMDB.get('/movie/upcoming', {
      params: { page, include_adult: false },
    });
    return response.data;
  } catch (error) {
    console.error('Get upcoming movies error:', error);
    throw new Error('Failed to fetch upcoming movies');
  }
};

export const getTVShows = async (page: number = 1): Promise<MovieResponse> => {
  try {
    const response = await TMDB.get('/discover/tv', {
      params: { page, sort_by: 'popularity.desc', include_adult: false },
    });
    return response.data;
  } catch (error) {
    console.error('Get TV shows error:', error);
    throw new Error('Failed to fetch TV shows');
  }
};

// New endpoints

export const searchMulti = async (query: string, page: number = 1): Promise<MovieResponse> => {
  try {
    if (!query.trim()) throw new Error('Search query cannot be empty');
    const response = await TMDB.get('/search/multi', {
      params: { query, page, include_adult: false },
    });
    return response.data;
  } catch (error) {
    console.error('Multi search error:', error);
    throw new Error('Failed to perform multi search');
  }
};

export const getMovieCredits = async (movieId: string): Promise<MovieResponse> => {
  try {
    const response = await TMDB.get(`/movie/${movieId}/credits`);
    return response.data;
  } catch (error) {
    console.error('Get movie credits error:', error);
    throw new Error('Failed to fetch movie credits');
  }
};

export const getSimilarMovies = async (movieId: string, page: number = 1): Promise<MovieResponse> => {
  try {
    const response = await TMDB.get(`/movie/${movieId}/similar`, {
      params: { page, include_adult: false },
    });
    return response.data;
  } catch (error) {
    console.error('Get similar movies error:', error);
    throw new Error('Failed to fetch similar movies');
  }
};

export const getMovieVideos = async (movieId: string): Promise<MovieResponse> => {
  try {
    const response = await TMDB.get(`/movie/${movieId}/videos`);
    return response.data;
  } catch (error) {
    console.error('Get movie videos error:', error);
    throw new Error('Failed to fetch movie videos');
  }
};
