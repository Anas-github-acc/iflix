import { getMoviesByGenre } from '@/lib/tmdb';
import { NextResponse } from 'next/server';
import { MovieResponse } from '@/lib/types';

export async function GET(request: Request, { params }: { params: Promise<{ genreId: string }> }) {
  // try {
    const { genreId } = await params;
    console.log(`---> : ${genreId}`);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');

    const data: MovieResponse = await getMoviesByGenre(genreId, page);
    return NextResponse.json({
      ...data,
      results: data.results.slice(0, 10),
    });
  // } catch (error) {
  //   return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  // }
}