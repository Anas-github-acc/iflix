import { NextResponse } from 'next/server';
import { getMoviesByGenre, getGenres } from '@/lib/tmdb';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const genreId = searchParams.get('genreId');
    const page = parseInt(searchParams.get('page') || '1', 10);

    // If genreId is provided, fetch movies for that genre
    if (genreId) {
      const movieData = await getMoviesByGenre(genreId, page);
      return NextResponse.json(movieData);
    }

    // If no genreId, return list of all genres
    const genres = await getGenres();
    return NextResponse.json(genres);

  } catch (error) {
    console.error('Genre API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}
