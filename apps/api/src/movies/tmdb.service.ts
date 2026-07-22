import { BadGatewayException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { TtlCache } from '../common/cache/ttl-cache';
import type { CastMember, MovieDetails, MovieSummary, PaginatedMovies } from './types';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const CACHE_TTL_MS = 5 * 60 * 1000; // NFR6

// Minimal shapes for the parts of TMDB's payloads we actually read.
interface TmdbMovie {
  id: number;
  title: string;
  poster_path: string | null;
  release_date?: string;
  vote_average: number;
}

interface TmdbPaginated {
  page: number;
  total_pages: number;
  results: TmdbMovie[];
}

interface TmdbMovieDetails extends TmdbMovie {
  overview: string;
  genres: Array<{ id: number; name: string }>;
  runtime: number | null;
  credits?: {
    cast: Array<{
      id: number;
      name: string;
      character: string;
      profile_path: string | null;
    }>;
  };
}

@Injectable()
export class TmdbService {
  private readonly logger = new Logger(TmdbService.name);
  private readonly cache = new TtlCache<unknown>(CACHE_TTL_MS);
  private readonly apiKey: string;

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.apiKey = config.get<string>('TMDB_API_KEY') ?? '';
  }

  async getTrending(page = 1): Promise<PaginatedMovies> {
    const data = await this.fetchCached<TmdbPaginated>(`trending:${page}`, '/trending/movie/week', {
      page,
    });
    return this.toPaginatedMovies(data);
  }

  async searchMovies(query: string, page = 1): Promise<PaginatedMovies> {
    const data = await this.fetchCached<TmdbPaginated>(
      `search:${query.toLowerCase()}:${page}`,
      '/search/movie',
      { query, page },
    );
    return this.toPaginatedMovies(data);
  }

  async getMovieDetails(tmdbId: number): Promise<MovieDetails> {
    const data = await this.fetchCached<TmdbMovieDetails>(`details:${tmdbId}`, `/movie/${tmdbId}`, {
      append_to_response: 'credits',
    });

    return {
      ...this.toMovieSummary(data),
      overview: data.overview ?? '',
      genres: (data.genres ?? []).map((genre) => genre.name),
      runtime: data.runtime ?? null,
      releaseDate: data.release_date ?? null,
      cast: this.toTopBilledCast(data),
    };
  }

  private async fetchCached<T>(
    cacheKey: string,
    path: string,
    params: Record<string, unknown>,
  ): Promise<T> {
    const cached = this.cache.get(cacheKey) as T | undefined;
    if (cached) return cached;

    try {
      const response = await firstValueFrom(
        this.http.get<T>(`${TMDB_BASE_URL}${path}`, {
          params: { api_key: this.apiKey, ...params },
        }),
      );

      this.cache.set(cacheKey, response.data);
      return response.data;
    } catch (error) {
      throw this.toHttpException(error, path);
    }
  }

  // TMDB failures never leak upstream detail to the client — a missing movie
  // is a clean 404, everything else is a 502 (E3-S1 AC).
  private toHttpException(error: unknown, path: string): Error {
    const axiosError = error as AxiosError;
    const status = axiosError.response?.status;

    if (status === 404) {
      return new NotFoundException('Movie not found');
    }

    this.logger.error(`TMDB request failed for ${path}: ${status ?? 'no response'}`);
    return new BadGatewayException('Movie service is temporarily unavailable');
  }

  private toPaginatedMovies(data: TmdbPaginated): PaginatedMovies {
    return {
      page: data.page,
      totalPages: data.total_pages,
      results: (data.results ?? []).map((movie) => this.toMovieSummary(movie)),
    };
  }

  private toMovieSummary(movie: TmdbMovie): MovieSummary {
    return {
      tmdbId: movie.id,
      title: movie.title,
      posterPath: movie.poster_path,
      year: movie.release_date ? Number(movie.release_date.slice(0, 4)) : null,
      rating: movie.vote_average,
    };
  }

  private toTopBilledCast(data: TmdbMovieDetails): CastMember[] {
    return (data.credits?.cast ?? []).slice(0, 10).map((member) => ({
      id: member.id,
      name: member.name,
      character: member.character,
      profilePath: member.profile_path,
    }));
  }
}
