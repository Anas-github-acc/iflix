import { NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';
import { getPopularMovies, getMovieRecommendations, getMovieDetails } from '@/lib/tmdb';
import { Movie } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userName = searchParams.get('user');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const ITEMS_PER_PAGE = 20;

    if (!userName) {
      const popularMoviesData = await getPopularMovies(page);
      return NextResponse.json({
        personalized: [],
        popular: popularMoviesData.results,
        page: popularMoviesData.page,
        total_pages: popularMoviesData.total_pages,
        has_more_personalized: false,
      });
    }

    const redis = await getRedisClient();
    const sortedSetKey = 'movie:recommendations';
    let personalizedMovies: Movie[] = [];
    const seen = new Set<number>();

    // Get user's rated movies from sorted set
    const ratings = await redis.ZRANGE_WITHSCORES(sortedSetKey, 0, -1);
    const userRatings: { movieId: string; score: number }[] = [];

    // Extract user's ratings
    for (const item of ratings) {
      const member = item.value;
      const score = item.score;
      const [movieId, memberUserName] = member.split(':');
      if (memberUserName === userName && movieId) {
        userRatings.push({ movieId, score });
      }
    }

    // Sort by score (descending)
    userRatings.sort((a, b) => b.score - a.score);

    // Fetch rated movies' details and add to personalized
    const ratedMovieIds = userRatings.map((r) => r.movieId);
    for (const movieId of ratedMovieIds) {
      try {
        const movie = await getMovieDetails(movieId);
        if (movie && !seen.has(movie.id)) {
          seen.add(movie.id);
          personalizedMovies.push(movie);
        }
      } catch (error) {
        console.error(`Error fetching movie ${movieId}:`, error);
        // Skip invalid movies
      }
    }

    // Generate recommendations based on top-rated movies
    const topMovieIds = ratedMovieIds
    const recommendationMovies: Movie[] = [];

    if (topMovieIds.length > 0) {
      const recommendationPromises = topMovieIds.map((movieId) =>
        getMovieRecommendations(movieId)
      );
      const recommendationResults = await Promise.all(recommendationPromises);

      // Combine and deduplicate recommendations
      for (const result of recommendationResults) {
        for (const movie of result.results) {
          if (!seen.has(movie.id)) {
            seen.add(movie.id);
            recommendationMovies.push(movie);
          }
        }
      }
    }

    // Paginate recommendations
    const startIdx = (page - 1) * ITEMS_PER_PAGE;
    const endIdx = startIdx + ITEMS_PER_PAGE;
    const paginatedRecommendations = recommendationMovies.slice(startIdx, endIdx);

    // Combine rated movies and recommendations
    personalizedMovies = [...personalizedMovies, ...paginatedRecommendations];

    // Fetch popular movies, excluding seen movies
    const popularMoviesData = await getPopularMovies(page);
    const popularMovies = popularMoviesData.results.filter(
      (movie) => !seen.has(movie.id)
    );

    return NextResponse.json({
      personalized: personalizedMovies,
      popular: popularMovies,
      page: popularMoviesData.page,
      total_pages: popularMoviesData.total_pages,
      has_more_personalized: recommendationMovies.length > endIdx,
    });
  } catch (error) {
    console.error('Recommendations error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recommendations' },
      { status: 500 }
    );
  }
}