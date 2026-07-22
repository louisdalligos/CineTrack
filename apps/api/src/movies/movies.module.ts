import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MoviesController } from './movies.controller';
import { TmdbService } from './tmdb.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 8000,
      maxRedirects: 3,
    }),
  ],
  controllers: [MoviesController],
  providers: [TmdbService],
  exports: [TmdbService],
})
export class MoviesModule {}
