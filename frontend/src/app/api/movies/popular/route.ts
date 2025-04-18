import { getPopularMovies } from '@/lib/tmdb';
import { NextResponse } from 'next/server';
import { MovieResponse } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const data: MovieResponse = await getPopularMovies(page);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}