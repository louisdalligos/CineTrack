// Mirrors the shapes returned by the NestJS API (apps/api/src/movies/types.ts).
// The web app never sees TMDB's raw schema.

export type WatchlistStatus = 'PLANNED' | 'WATCHING' | 'WATCHED';

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
