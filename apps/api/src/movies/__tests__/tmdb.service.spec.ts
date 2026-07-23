import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { BadGatewayException, NotFoundException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AxiosError } from 'axios';
import { TmdbService } from '../tmdb.service';

describe('TmdbService', () => {
  let service: TmdbService;
  let http: { get: jest.Mock };

  const tmdbPage = {
    page: 1,
    total_pages: 42,
    results: [
      {
        id: 603,
        title: 'The Matrix',
        poster_path: '/matrix.jpg',
        release_date: '1999-03-30',
        vote_average: 8.2,
      },
    ],
  };

  const tmdbDetails = {
    id: 603,
    title: 'The Matrix',
    poster_path: '/matrix.jpg',
    release_date: '1999-03-30',
    vote_average: 8.2,
    overview: 'A hacker discovers the truth.',
    genres: [
      { id: 28, name: 'Action' },
      { id: 878, name: 'Science Fiction' },
    ],
    runtime: 136,
    credits: {
      cast: Array.from({ length: 15 }, (_, index) => ({
        id: index,
        name: `Actor ${index}`,
        character: `Character ${index}`,
        profile_path: null,
      })),
    },
  };

  function axiosErrorWithStatus(status: number): AxiosError {
    return { response: { status } } as AxiosError;
  }

  beforeEach(async () => {
    http = { get: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TmdbService,
        { provide: HttpService, useValue: http },
        { provide: ConfigService, useValue: { get: () => 'test-tmdb-key' } },
      ],
    }).compile();

    service = module.get<TmdbService>(TmdbService);
    jest.clearAllMocks();
  });

  describe('getTrending', () => {
    it('maps TMDB payloads to the API response shape', async () => {
      http.get.mockReturnValue(of({ data: tmdbPage }));

      const result = await service.getTrending(1);

      expect(result).toEqual({
        page: 1,
        totalPages: 42,
        results: [
          {
            tmdbId: 603,
            title: 'The Matrix',
            posterPath: '/matrix.jpg',
            year: 1999,
            rating: 8.2,
          },
        ],
      });
    });

    it('sends the API key as a query param so it never reaches the browser', async () => {
      http.get.mockReturnValue(of({ data: tmdbPage }));

      await service.getTrending(2);

      expect(http.get).toHaveBeenCalledWith('https://api.themoviedb.org/3/trending/movie/week', {
        params: { api_key: 'test-tmdb-key', page: 2 },
      });
    });

    it('serves a second identical request from cache without re-calling TMDB', async () => {
      http.get.mockReturnValue(of({ data: tmdbPage }));

      await service.getTrending(1);
      await service.getTrending(1);

      expect(http.get).toHaveBeenCalledTimes(1);
    });

    it('does not reuse the cache entry for a different page', async () => {
      http.get.mockReturnValue(of({ data: tmdbPage }));

      await service.getTrending(1);
      await service.getTrending(2);

      expect(http.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('searchMovies', () => {
    it('passes the query through to TMDB', async () => {
      http.get.mockReturnValue(of({ data: tmdbPage }));

      await service.searchMovies('matrix', 1);

      expect(http.get).toHaveBeenCalledWith('https://api.themoviedb.org/3/search/movie', {
        params: { api_key: 'test-tmdb-key', query: 'matrix', page: 1 },
      });
    });

    it('caches case-insensitively', async () => {
      http.get.mockReturnValue(of({ data: tmdbPage }));

      await service.searchMovies('Matrix', 1);
      await service.searchMovies('matrix', 1);

      expect(http.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('getMovieDetails', () => {
    it('returns details with genres and top-billed cast capped at 10', async () => {
      http.get.mockReturnValue(of({ data: tmdbDetails }));

      const result = await service.getMovieDetails(603);

      expect(result.genres).toEqual(['Action', 'Science Fiction']);
      expect(result.runtime).toBe(136);
      expect(result.releaseDate).toBe('1999-03-30');
      expect(result.cast).toHaveLength(10);
      expect(result.cast[0]).toEqual({
        id: 0,
        name: 'Actor 0',
        character: 'Character 0',
        profilePath: null,
      });
    });

    it('requests credits alongside the movie in a single call', async () => {
      http.get.mockReturnValue(of({ data: tmdbDetails }));

      await service.getMovieDetails(603);

      expect(http.get).toHaveBeenCalledWith('https://api.themoviedb.org/3/movie/603', {
        params: { api_key: 'test-tmdb-key', append_to_response: 'credits' },
      });
    });

    it('handles a movie with no credits payload', async () => {
      const { credits: _credits, ...withoutCredits } = tmdbDetails;
      http.get.mockReturnValue(of({ data: withoutCredits }));

      const result = await service.getMovieDetails(603);

      expect(result.cast).toEqual([]);
    });
  });

  describe('error mapping', () => {
    it('maps a TMDB 404 to a NotFoundException', async () => {
      http.get.mockReturnValue(throwError(() => axiosErrorWithStatus(404)));

      await expect(service.getMovieDetails(999999)).rejects.toThrow(NotFoundException);
    });

    it('maps a TMDB 401 to a clean 502 without leaking upstream detail', async () => {
      http.get.mockReturnValue(throwError(() => axiosErrorWithStatus(401)));

      await expect(service.getTrending(1)).rejects.toThrow(BadGatewayException);
    });

    it('maps a TMDB rate-limit response to a 502', async () => {
      http.get.mockReturnValue(throwError(() => axiosErrorWithStatus(429)));

      await expect(service.getTrending(1)).rejects.toThrow(BadGatewayException);
    });

    it('maps a network failure with no response to a 502', async () => {
      http.get.mockReturnValue(throwError(() => new Error('ECONNREFUSED')));

      await expect(service.getTrending(1)).rejects.toThrow(BadGatewayException);
    });

    it('does not cache failed responses', async () => {
      http.get.mockReturnValueOnce(throwError(() => axiosErrorWithStatus(500)));
      await expect(service.getTrending(1)).rejects.toThrow(BadGatewayException);

      http.get.mockReturnValueOnce(of({ data: tmdbPage }));
      const result = await service.getTrending(1);

      expect(result.results).toHaveLength(1);
      expect(http.get).toHaveBeenCalledTimes(2);
    });
  });
});
