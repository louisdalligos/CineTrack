import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { TmdbService } from './tmdb.service';
import { TrendingQueryDto } from './dto/trending-query.dto';
import { SearchQueryDto } from './dto/search-query.dto';
import type { MovieDetails, PaginatedMovies } from './types';

// No @Public() here — every route below is protected by the global
// JwtAuthGuard from E2-S2, which is what keeps the TMDB proxy from being
// an open relay for anyone on the internet.
@Controller('movies')
export class MoviesController {
  constructor(private readonly tmdbService: TmdbService) {}

  @Get('trending')
  getTrending(@Query() query: TrendingQueryDto): Promise<PaginatedMovies> {
    return this.tmdbService.getTrending(query.page);
  }

  @Get('search')
  searchMovies(@Query() query: SearchQueryDto): Promise<PaginatedMovies> {
    return this.tmdbService.searchMovies(query.q, query.page);
  }

  @Get(':id')
  getMovieDetails(@Param('id', ParseIntPipe) id: number): Promise<MovieDetails> {
    return this.tmdbService.getMovieDetails(id);
  }
}
