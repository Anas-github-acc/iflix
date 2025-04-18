'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Movie } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';

export default function MoviesSection() {
  const router = useRouter();
  const params = useParams();
  const section = params.section as string;
  const [movies, setMovies] = useState<Movie[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef<IntersectionObserver | null>(null);
  const userName = typeof window !== 'undefined' ? localStorage.getItem('userName') : null;

  useEffect(() => {
    const checkAuth = async () => {
      if (!userName) {
        router.push('/auth');
      }
    };
    checkAuth();
  }, [router, userName]);

  const lastMovieElementRef = useCallback(
    (node: HTMLDivElement) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prev) => prev + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, hasMore]
  );

  const fetchMovies = async (pageNum: number) => {
    try {
      setLoading(true);
      let url = '';
      if (section === 'recommended') {
        url = `/api/movies/recommendations?user=${userName}&page=${pageNum}`;
      } else if (section === 'popular') {
        url = `/api/movies/popular?page=${pageNum}`;
      } else if (section === 'trending') {
        url = `/api/movies/trending?page=${pageNum}`;
      } else if (section.startsWith('genre-')) {
        const genreId = section.split('-')[1]; // e.g., genre-28 -> 28
        url = `/api/movies/genres?genreId=${genreId}&page=${pageNum}`;
      } else {
        throw new Error('Invalid section');
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch ${section} movies`);
      const data = await res.json();

      const newMovies = section === 'recommended' ? data.popular : data.results;

      setMovies((prev) => {
        const existingIds = new Set(prev.map((movie) => movie.id));
        const filteredMovies = newMovies.filter((movie: Movie) => !existingIds.has(movie.id));
        return [...prev, ...filteredMovies];
      });

      setHasMore(data.page < data.total_pages);
    } catch (error) {
      console.error(`Error fetching ${section} movies:`, error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userName || section !== 'recommended') {
      fetchMovies(page);
    }
  }, [page, section, userName]);

  const getSectionTitle = () => {
    if (section === 'recommended') return 'Recommended Movies';
    if (section === 'popular') return 'Popular Movies';
    if (section === 'trending') return 'Trending Now';
    if (section.startsWith('genre-')) {
      const genreName = decodeURIComponent(section.split('-')[2] || ''); // e.g., genre-28-Action -> Action
      return `${genreName} Movies`;
    }
    return 'Movies';
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">{getSectionTitle()}</h1>
          <Link href="/" className="text-gray-400 hover:underline">
            Back to Home
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {movies.map((movie, index) => (
            <div
              key={`${movie.id}-${index}`}
              ref={index === movies.length - 1 ? lastMovieElementRef : undefined}
              className="group relative transition duration-300 transform hover:scale-105 cursor-pointer"
              onClick={() => router.push(`/movies/${movie.id}`)}
            >
              <Image
                width={200}
                height={300}
                src={
                  movie.poster_path
                    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                    : 'https://via.placeholder.com/200x300?text=No+Poster'
                }
                alt={movie.title}
                className="w-full h-[300px] object-cover rounded-md"
              />
              <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-md flex flex-col justify-end p-4">
                <h3 className="text-lg font-semibold">{movie.title}</h3>
                <p className="text-sm text-gray-300">
                  Rating: {movie.vote_average ? `${movie.vote_average}/10` : 'N/A'}
                </p>
              </div>
            </div>
          ))}
        </div>
        {loading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div>
          </div>
        )}
        {!hasMore && movies.length > 0 && (
          <p className="text-center text-gray-400 mt-8">No more movies to load</p>
        )}
      </div>
    </div>
  );
}