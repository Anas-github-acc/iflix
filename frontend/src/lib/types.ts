export interface Genre {
  id: number;
  name: string;
}

export interface ProductionCompany {
  id: number;
  logo_path: string | null;
  name: string;
  origin_country: string;
}

export interface ProductionCountry {
  iso_3166_1: string;
  name: string;
}

export interface SpokenLanguage {
  english_name: string;
  iso_639_1: string;
  name: string;
}

export interface Collection {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
}

export interface Movie {
  id: number;
  name?: string;
  title: string;
  overview: string;
  poster_path?: string;
  backdrop_path?: string;
  release_date?: string;
  adult?: boolean;
  budget?: number;
  genres?: Genre[];
  belongs_to_collection?: Collection;
  homepage?: string;
  imdb_id?: string;
  original_language?: string;
  original_title?: string;
  popularity?: number;
  production_companies?: ProductionCompany[];
  production_countries?: ProductionCountry[];
  revenue?: number;
  runtime?: number;
  spoken_languages?: SpokenLanguage[];
  status?: string;
  tagline?: string;
  video?: boolean;
  vote_average?: number;
  vote_count?: number;
}

export interface MovieDetails extends Movie {
  credits: {
    cast: { id: number; name: string; character: string; profile_path?: string }[];
    crew: { id: number; name: string; job: string; department: string }[];
  };
  videos: {
    results: { 
      id: string; 
      key: string; 
      name: string; 
      type: string;
      site: string;
      official: boolean;
    }[];
  };
  images: {
    backdrops: { file_path: string; width: number; height: number }[];
    posters: { file_path: string; width: number; height: number }[];
  };
  recommendations: {
    results: Movie[];
  };
}

export interface MovieResponse {
  page: number;
  results: Movie[];
  total_pages: number;
  total_results: number;
}

export interface Comment {
  user: string;
  text: string;
  timestamp: number;
}

export interface MovieInteractions {
  likes: number;
  ratings: number[];
  comments: Comment[];
}
