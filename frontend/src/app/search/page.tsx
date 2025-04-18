'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Movie } from '@/lib/types';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function SearchResults() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('query');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!query) return;

      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`api/movies/serach?query=${encodeURIComponent(query)}`);
        
        if (!res.ok) {
          throw new Error('Failed to fetch search results');
        }

        const data = await res.json();
        setMovies(data.results);
      } catch (err) {
        setError('Failed to load search results');
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSearchResults();
  }, [query]);

  if (!query) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <h1 className="text-2xl font-bold mb-4">No search query provided</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-2xl font-bold mb-4">
        Search Results for: {query}
      </h1>

      {loading && (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      )}

      {error && (
        <div className="text-red-500 mb-4">
          {error}
        </div>
      )}

      {!loading && !error && movies.length === 0 && (
        <div className="text-gray-400">
          No results found for &quot;{query}&quot;
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {movies.map((movie) => (
          <div
            key={movie.id}
            className="group relative transition duration-300 transform hover:scale-105 cursor-pointer"
            onClick={() => router.push(`/movies/${movie.id}`)}
          >
            <Image
              width={300}
              height={450}
              src={
                movie.poster_path
                  ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                  : 'https://via.placeholder.com/300x450?text=No+Poster'
              }
              alt={movie.title}
              className="w-full h-[450px] object-cover rounded-md"
            />
            <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-md flex flex-col justify-end p-4">
              <h3 className="text-lg font-semibold">{movie.title}</h3>
              <p className="text-sm text-gray-300">
                Rating: {movie.vote_average ? `${movie.vote_average.toFixed(1)}/10` : 'N/A'}
              </p>
              <p className="text-sm text-gray-300">
                Release: {movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}