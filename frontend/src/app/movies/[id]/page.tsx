'use client';

import { useState, useEffect } from 'react';
import { Play, MessageCircle, Send, Info, Clock, Calendar, Star, Globe, Heart, Film } from 'lucide-react';
import Image from 'next/image';
import { MovieDetails as MovieDetailsType } from '@/lib/types';

interface Comment {
  user: string;
  text: string;
  timestamp: number;
  movieId: string;
}

interface InteractionData {
  userLiked: boolean;
  userRating: number;
  comments: Comment[];
}

export default function MovieDetails({ params }: { params: Promise<{ id: string }> }) {
  const [movie, setMovie] = useState<MovieDetailsType | null>(null);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [userRating, setUserRating] = useState(0);
  const [userLiked, setUserLiked] = useState(false);
  const [userName, setUserName] = useState('');
  const [showNameInput, setShowNameInput] = useState(true);

  const fetchMovieId = async () => {
    const { id } = await params;
    return id;
  }

  const handleSetUsername = (name: string) => {
    if (name.trim()) {
      setUserName(name);
      setShowNameInput(false);
      localStorage.setItem('userName', name);
    }
  };

  const handleInteraction = async (action: 'like' | 'rate' | 'comment', data?: { rating?: number; text?: string }) => {
    if (!userName) return;
    
    const id = await fetchMovieId();
    await fetch(`/api/movies/${id}/interactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        userName,
        ...data
      })
    });

    // Refresh interactions
    fetchInteractions();
  };

  const fetchInteractions = async () => {
    if (!userName) return;
    
    const id = await fetchMovieId();
    const res = await fetch(`/api/movies/${id}/interactions?user=${userName}`);
    const data: InteractionData = await res.json();
    
    setUserRating(data.userRating);
    setComments(data.comments);
    setUserLiked(data.userLiked);
  };

  useEffect(() => {
    const savedName = localStorage.getItem('userName');
    if (savedName) {
      setUserName(savedName);
      setShowNameInput(false);
    }
  }, []);

  useEffect(() => {
    if (userName) {
      fetchInteractions();
    }
  }, [userName]);

  useEffect(() => {
    const fetchMovieDetails = async () => {
      try {
        const id = await fetchMovieId();
        const res = await fetch(`/api/movies/${id}`);
        if (!res.ok) throw new Error('Failed to fetch movie details');
        const data = await res.json();
        setMovie(data);
      } catch (error) {
        console.error('Error fetching movie details:', error);
      }
    };

    fetchMovieDetails();
  }, []);

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (comment.trim() && userName) {
      handleInteraction('comment', { text: comment });
      setComment('');
    }
  };

  if (!movie) return null;

  if (showNameInput) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-md mx-auto bg-gray-900 p-6 rounded-lg">
          <h2 className="text-2xl mb-4">Enter your name to interact</h2>
          <input
            type="text"
            placeholder="Your name"
            className="w-full mb-4 p-2 bg-gray-800 rounded"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSetUsername(userName)}
          />
          <button
            onClick={() => handleSetUsername(userName)}
            className="w-full bg-red-600 p-2 rounded"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4">
        {/* Movie Header */}
        <div className="relative h-[60vh] mb-8">
          <Image
            fill
            priority
            src={`https://image.tmdb.org/t/p/original${movie.backdrop_path}`}
            alt={movie.title}
            className="object-cover rounded-lg"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent rounded-lg" />
          <div className="absolute bottom-0 left-0 p-8">
            <h1 className="text-4xl font-bold mb-4">{movie.title}</h1>
            {movie.tagline && (
              <p className="text-xl text-gray-300 italic mb-4">{movie.tagline}</p>
            )}
            <div className="flex items-center space-x-4 text-sm text-gray-300 mb-4">
              <span className="flex items-center"><Calendar className="w-4 h-4 mr-1" />{movie.release_date?.split('-')[0]}</span>
              <span className="flex items-center"><Clock className="w-4 h-4 mr-1" />{Math.floor((movie.runtime ?? 0) / 60)}h {(movie.runtime ?? 0) % 60}min</span>
              <span className="flex items-center"><Star className="w-4 h-4 mr-1" />{movie.vote_average?.toFixed(1)}/10</span>
              <span className="flex items-center"><Globe className="w-4 h-4 mr-1" />{movie.original_language?.toUpperCase()}</span>
            </div>
            <p className="max-w-2xl mb-6">{movie.overview}</p>
            <div className="flex space-x-4">
              <button className="flex items-center px-8 py-3 bg-red-600 text-white rounded hover:bg-red-700 transition">
                <Play className="w-6 h-6 mr-2" />
                Play
              </button>
              {movie.homepage && (
                <a
                  href={movie.homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center px-8 py-3 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
                >
                  <Info className="w-6 h-6 mr-2" />
                  Website
                </a>
              )}
              <button
                onClick={() => handleInteraction('like')}
                className={`flex items-center px-4 py-2 rounded ${
                  userLiked ? 'bg-red-600' : 'bg-gray-600'
                }`}
              >
                <Heart className="w-4 h-4 mr-2" />
                {userLiked ? 'Liked' : 'Like'}
              </button>
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-6 h-6 cursor-pointer ${
                      userRating >= star ? 'text-yellow-500' : 'text-gray-400'
                    }`}
                    onClick={() => {
                      setUserRating(star);
                      handleInteraction('rate', { rating: star });
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Movie Details */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-6">Movie Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {movie.genres && (
                <div>
                  <h3 className="text-gray-400 mb-2">Genres</h3>
                  <div className="flex flex-wrap gap-2">
                    {movie.genres.map(genre => (
                      <span key={genre.id} className="bg-gray-800 px-3 py-1 rounded-full text-sm">
                        {genre.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {movie.production_companies && (
                <div>
                  <h3 className="text-gray-400 mb-2">Production Companies</h3>
                  <div className="flex flex-wrap gap-2">
                    {movie.production_companies.map(company => (
                      <span key={company.id} className="bg-gray-800 px-3 py-1 rounded-full text-sm">
                        {company.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
{/* 
              {movie.budget > 0 && (
                <div>
                  <h3 className="text-gray-400 mb-2">Budget</h3>
                  <p className="flex items-center">
                    <Money className="w-4 h-4 mr-2" />
                    {formatCurrency(movie.budget)}
                  </p>
                </div>
              )}

              {movie.revenue > 0 && (
                <div>
                  <h3 className="text-gray-400 mb-2">Revenue</h3>
                  <p className="flex items-center">
                    <Money className="w-4 h-4 mr-2" />
                    {formatCurrency(movie.revenue)}
                  </p>
                </div>
              )} */}

              {movie.status && (
                <div>
                  <h3 className="text-gray-400 mb-2">Status</h3>
                  <p className="flex items-center">
                    <Film className="w-4 h-4 mr-2" />
                    {movie.status}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cast Section */}
        {movie.credits?.cast && (
          <div className="max-w-4xl mx-auto mb-8">
            <div className="bg-gray-900 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-6">Cast</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {movie.credits.cast.slice(0, 8).map(actor => (
                  <div key={actor.id} className="text-center">
                    <div className="w-24 h-24 mx-auto mb-2 rounded-full overflow-hidden">
                      <Image
                        width={96}
                        height={96}
                        src={actor.profile_path 
                          ? `https://image.tmdb.org/t/p/w185${actor.profile_path}`
                          : 'https://via.placeholder.com/96x96?text=No+Image'
                        }
                        alt={actor.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="font-semibold">{actor.name}</p>
                    <p className="text-sm text-gray-400">{actor.character}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Comments Section */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-6 flex items-center">
              <MessageCircle className="w-6 h-6 mr-2" />
              Comments
            </h2>
            
            <form onSubmit={handleSubmitComment} className="mb-8">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 bg-gray-800 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button
                  type="submit"
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition flex items-center"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send
                </button>
              </div>
            </form>

            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={`${comment.timestamp}-${comment.user}`} className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{comment.user}</span>
                    <span className="text-sm text-gray-400">
                      {new Date(comment.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-300">{comment.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


