import { NextResponse } from 'next/server';
import { getNowPlayingMovies, getTopRatedMovies, getUpcomingMovies, getTVShows } from '@/lib/tmdb';
import { Movie } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');

    const [nowPlaying, topRated, upcoming, tvShows] = await Promise.all([
      getNowPlayingMovies(page),
      getTopRatedMovies(page),
      getUpcomingMovies(page),
      getTVShows(page),
    ]);

    // Combine and deduplicate
    const seen = new Set<number>();
    const trending: Movie[] = [];

    const addMovies = (movies: Movie[]) => {
      for (const movie of movies) {
        if (!seen.has(movie.id)) {
          seen.add(movie.id);
          // Normalize TV show data to match Movie type
          trending.push({
            ...movie,
            title: movie.name || movie.title, // TV shows use 'name'
          });
        }
      }
    };

    addMovies(nowPlaying.results.slice(0, 5));
    addMovies(topRated.results.slice(0, 5));
    addMovies(upcoming.results.slice(0, 5));
    addMovies(tvShows.results.slice(0, 5));

    return NextResponse.json({
      results: trending,
      page,
      total_pages: Math.min(
        nowPlaying.total_pages,
        topRated.total_pages,
        upcoming.total_pages,
        tvShows.total_pages
      ),
    });
  } catch (error) {
    console.error('Trending movies error:', error);
    return NextResponse.json({ error: 'Failed to fetch trending movies' }, { status: 500 });
  }
}