import { getMovieDetails } from '@/lib/tmdb';
import { NextRequest, NextResponse } from 'next/server';
import { MovieDetails } from '@/lib/types';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    console.log(`Fetching details for movie ID: ${id}`);

    if (!id) {
      return NextResponse.json({ error: 'Movie ID is required' }, { status: 400 });
    }

    const data: MovieDetails = await getMovieDetails(id);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}