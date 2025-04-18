import { getRandomMovies } from '@/lib/tmdb';
import { NextResponse } from 'next/server';
import { MovieResponse } from '@/lib/types';

export async function GET() {
  try {
    const data: MovieResponse = await getRandomMovies();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}