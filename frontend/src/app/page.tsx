'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Movie } from '@/lib/types';
import { Play, Info, TrendingUp, Film } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import ChatWidget from '@/components/ChatWidget';

interface Genre {
  id: number;
  name: string;
}

export default function Home() {
  const router = useRouter();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [featuredMovie, setFeaturedMovie] = useState<Movie | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [recommendations, setRecommendations] = useState<{ personalized: Movie[]; popular: Movie[] }>({ personalized: [], popular: [] });
  const [genreMovies, setGenreMovies] = useState<Record<string, Movie[]>>({});
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [page, setPage] = useState(1);
  const [recPage, setRecPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef<IntersectionObserver | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const storedUserName = localStorage.getItem('userName');
    setUserName(storedUserName);
    if (!storedUserName) {
      router.push('/auth');
    }
  }, [router]);

  const lastMovieElementRef = useCallback(
    (node: HTMLDivElement) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setRecPage((prev) => prev + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, hasMore]
  );

  const fetchGenres = async () => {
    try {
      const res = await fetch('/api/movies/genres');
      if (!res.ok) throw new Error('Failed to fetch genres');
      const data = await res.json();
      setGenres(data);
    } catch (error) {
      console.error('Error fetching genres:', error);
    }
  };

  const fetchPopularMovies = async (pageNum: number) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/movies/popular?page=${pageNum}`);
      if (!res.ok) throw new Error('Failed to fetch popular movies');
      const data = await res.json();
      if (pageNum === 1) {
        setMovies(data.results);
        setFeaturedMovie(data.results[0]);
      } else {
        setMovies((prev) => {
          const existingIds = new Set(prev.map((movie) => movie.id));
          const newMovies = data.results.filter((movie: Movie) => !existingIds.has(movie.id));
          return [...prev, ...newMovies];
        });
      }
      setHasMore(data.page < data.total_pages);
    } catch (error) {
      console.error('Error fetching popular movies:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async (pageNum: number) => {
    if (!userName) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/movies/recommendations?user=${userName}&page=${pageNum}`);
      if (!res.ok) throw new Error('Failed to fetch recommendations');
      const data = await res.json();
      if (pageNum === 1) {
        setRecommendations(data);
      } else {
        setRecommendations((prev) => ({
          personalized: prev.personalized,
          popular: [
            ...prev.popular,
            ...data.popular.filter((movie: Movie) => !prev.popular.some((m) => m.id === movie.id)),
          ],
        }));
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGenreMovies = async (genreId: string, genreName: string) => {
    try {
      const res = await fetch(`/api/movies/genres?genreId=${genreId}`);
      if (!res.ok) throw new Error(`Failed to fetch ${genreName} movies`);
      const data = await res.json();
      if (data.results.length > 0) {
        setGenreMovies((prev) => ({
          ...prev,
          [genreName]: data.results,
        }));
      }
    } catch (error) {
      console.error(`Error fetching ${genreName} movies:`, error);
    }
  };

  const fetchTrendingMovies = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/movies/trending?page=1');
      if (!res.ok) throw new Error('Failed to fetch trending movies');
      const data = await res.json();
      setTrendingMovies(data.results);
    } catch (error) {
      console.error('Error fetching trending movies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    // Redirect to search results page with the query
    router.push(`/search?query=${encodeURIComponent(searchQuery.trim())}`);
  };

  useEffect(() => {
    if (userName) {
      fetchPopularMovies(page);
      fetchRecommendations(recPage);
      fetchGenres();
    }
  }, [page, recPage, userName]);

  useEffect(() => {
    if (genres.length > 0) {
      genres.forEach((genre) => {
        fetchGenreMovies(genre.id.toString(), genre.name);
      });
      fetchTrendingMovies();
    }
  }, [genres]);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      {featuredMovie && (
        <div className="relative h-[80vh]">
          <div className="absolute inset-0">
            <Image
              fill
              priority
              src={`https://image.tmdb.org/t/p/original${featuredMovie.backdrop_path}`}
              alt={featuredMovie.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent" />
          </div>
          <div className="relative h-full flex items-center">
            <div className="container mx-auto px-4 space-y-4 max-w-3xl">
              <h1 className="text-5xl font-bold">{featuredMovie.title}</h1>
              <p className="text-lg text-gray-200">{featuredMovie.overview}</p>
              <div className="flex gap-4 mt-6">
                <button className="flex items-center gap-2 bg-white text-black px-6 py-2 rounded-md hover:bg-gray-200 transition">
                  <Play className="w-5 h-5" />
                  Play
                </button>
                <button className="flex items-center gap-2 bg-gray-600/80 text-white px-6 py-2 rounded-md hover:bg-gray-700/80 transition">
                  <Info className="w-5 h-5" />
                  More Info
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Search Section */}
        <form onSubmit={handleSearch} className="mb-8 flex gap-2 max-w-2xl">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search movies..."
            className="flex-grow bg-gray-800 text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 transition"
          >
            Search
          </button>
        </form>

        {/* Recommendations Section */}
        <div className="space-y-8">
          {recommendations.personalized.length > 0 ? (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Film className="w-6 h-6" />
                  Recommended for You
                </h2>
                <Link href="/recommended" className="text-gray-400 hover:underline">
                  Show More
                </Link>
              </div>
              <div className="flex overflow-x-auto space-x-4 pb-4 scrollbar-thin scrollbar-thumb-gray-700">
                {recommendations.personalized.map((movie) => (
                  <div
                    key={movie.id}
                    className="group relative min-w-[200px] transition duration-300 transform hover:scale-105 cursor-pointer"
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
            </div>
          ) : (
            <p className="text-gray-400">Rate some movies to get personalized recommendations!</p>
          )}

          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <TrendingUp className="w-6 h-6" />
                Popular Movies
              </h2>
              <Link href="/popular" className="text-gray-400 hover:underline">
                Show More
              </Link>
            </div>
            <div className="flex overflow-x-auto space-x-4 pb-4 scrollbar-thin scrollbar-thumb-gray-700">
              {recommendations.popular.map((movie, index) => (
                <div
                  key={`${movie.id}-${index}`}
                  ref={index === recommendations.popular.length - 1 ? lastMovieElementRef : undefined}
                  className="group relative min-w-[200px] transition duration-300 transform hover:scale-105 cursor-pointer"
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
          </div>
        </div>

        {/* Genre Sections */}
        {Object.entries(genreMovies)
          .sort(([a], [b]) => a.localeCompare(b)) // Sort genres alphabetically
          .map(([genreName, movies]) => (
            <div key={genreName} className="mt-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Film className="w-6 h-6" />
                  {genreName} Movies
                </h2>
                <Link
                  href={`/genre-${genres.find((g) => g.name === genreName)?.id || ''}-${encodeURIComponent(genreName)}`}
                  className="text-gray-400 hover:underline"
                >
                  Show More
                </Link>
              </div>
              <div className="flex overflow-x-auto space-x-4 pb-4 scrollbar-thin scrollbar-thumb-gray-700">
                {movies.map((movie) => (
                  <div
                    key={movie.id}
                    className="group relative min-w-[200px] transition duration-300 transform hover:scale-105 cursor-pointer"
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
            </div>
          ))}

        {/* Trending All Section */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="w-6 h-6" />
              Trending Now
            </h2>
            <Link href="/movies/trending" className="text-gray-400 hover:underline">
              Show More
            </Link>
          </div>
          <div className="flex overflow-x-auto space-x-4 pb-4 scrollbar-thin scrollbar-thumb-gray-700">
            {trendingMovies.map((movie) => (
              <div
                key={movie.id}
                className="group relative min-w-[200px] transition duration-300 transform hover:scale-105 cursor-pointer"
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
        </div>

        {loading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div>
          </div>
        )}
      </div>
      {userName && <ChatWidget />}
    </div>
  );
}

