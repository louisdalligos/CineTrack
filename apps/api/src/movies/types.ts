// Response shapes the API exposes to the web app. Deliberately mapped from
// TMDB's raw payloads so the frontend never depends on TMDB's schema.

export interface MovieSummary {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  year: number | null;
  rating: number;
}

export interface PaginatedMovies {
  page: number;
  totalPages: number;
  results: MovieSummary[];
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profilePath: string | null;
}

export interface MovieDetails extends MovieSummary {
  overview: string;
  genres: string[];
  runtime: number | null;
  releaseDate: string | null;
  cast: CastMember[];
}
