import { PrismaClient, WatchlistStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEMO_EMAIL = 'demo@example.com';
const DEMO_PASSWORD = 'Password123!';
const BCRYPT_SALT_ROUNDS = 10; // matches AuthService

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

interface SeedMovie {
  tmdbId: number;
  /** Fallback metadata, used when TMDB cannot be reached at seed time. */
  title: string;
  genres: string[];
  status: WatchlistStatus;
  rating?: number;
  /** Days back from today; only meaningful for WATCHED items. */
  watchedDaysAgo?: number;
}

/**
 * Ten titles spanning every status, a spread of ratings, and enough genre
 * overlap that the dashboard's top-3 genres are non-trivial (E6-S1 AC).
 */
const SEED_MOVIES: SeedMovie[] = [
  {
    tmdbId: 603,
    title: 'The Matrix',
    genres: ['Action', 'Science Fiction'],
    status: WatchlistStatus.WATCHED,
    rating: 9,
    watchedDaysAgo: 3,
  },
  {
    tmdbId: 27205,
    title: 'Inception',
    genres: ['Action', 'Science Fiction', 'Adventure'],
    status: WatchlistStatus.WATCHED,
    rating: 10,
    watchedDaysAgo: 8,
  },
  {
    tmdbId: 157336,
    title: 'Interstellar',
    genres: ['Adventure', 'Drama', 'Science Fiction'],
    status: WatchlistStatus.WATCHED,
    rating: 8,
    watchedDaysAgo: 14,
  },
  {
    tmdbId: 155,
    title: 'The Dark Knight',
    genres: ['Action', 'Crime', 'Drama'],
    status: WatchlistStatus.WATCHED,
    rating: 9,
    watchedDaysAgo: 120, // deliberately outside this month
  },
  {
    tmdbId: 680,
    title: 'Pulp Fiction',
    genres: ['Crime', 'Drama'],
    status: WatchlistStatus.WATCHED,
    rating: 7,
    watchedDaysAgo: 200,
  },
  {
    tmdbId: 496243,
    title: 'Parasite',
    genres: ['Comedy', 'Thriller', 'Drama'],
    status: WatchlistStatus.WATCHING,
  },
  {
    tmdbId: 129,
    title: 'Spirited Away',
    genres: ['Animation', 'Family', 'Fantasy'],
    status: WatchlistStatus.WATCHING,
  },
  {
    tmdbId: 278,
    title: 'The Shawshank Redemption',
    genres: ['Drama', 'Crime'],
    status: WatchlistStatus.PLANNED,
  },
  {
    tmdbId: 238,
    title: 'The Godfather',
    genres: ['Drama', 'Crime'],
    status: WatchlistStatus.PLANNED,
  },
  {
    tmdbId: 13,
    title: 'Forrest Gump',
    genres: ['Comedy', 'Drama', 'Romance'],
    status: WatchlistStatus.PLANNED,
  },
];

interface TmdbMetadata {
  title: string;
  posterPath: string | null;
  genres: string[];
}

/**
 * Poster paths are opaque TMDB hashes that cannot be hardcoded reliably, so
 * they are fetched at seed time. TMDB is also treated as the source of truth
 * for title and genres when reachable.
 *
 * Every failure path returns null and the caller falls back to the hardcoded
 * metadata: the seed must never break `docker compose up` (NFR1) just because
 * TMDB is unreachable or no API key was supplied.
 */
async function fetchTmdbMetadata(tmdbId: number): Promise<TmdbMetadata | null> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey || apiKey === 'changeme') return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${apiKey}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = (await response.json()) as {
      title?: string;
      poster_path?: string | null;
      genres?: Array<{ name: string }>;
    };

    return {
      title: data.title ?? '',
      posterPath: data.poster_path ?? null,
      genres: data.genres?.map((genre) => genre.name) ?? [],
    };
  } catch {
    return null;
  }
}

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

async function main() {
  console.log('Seeding database…');

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_SALT_ROUNDS);

  // Idempotent: re-running updates the demo user rather than failing on the
  // unique email constraint.
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { passwordHash },
    create: { email: DEMO_EMAIL, passwordHash },
  });

  console.log(`Demo user ready: ${user.email}`);

  let enriched = 0;

  for (const movie of SEED_MOVIES) {
    const metadata = await fetchTmdbMetadata(movie.tmdbId);
    if (metadata) enriched += 1;

    const data = {
      title: metadata?.title || movie.title,
      posterPath: metadata?.posterPath ?? null,
      genres: metadata?.genres.length ? metadata.genres : movie.genres,
      status: movie.status,
      rating: movie.rating ?? null,
      // watchedAt is what the "watched this month" stat counts on, so it is
      // set explicitly here rather than relying on the API's status-change
      // logic, which the seed bypasses.
      watchedAt:
        movie.status === WatchlistStatus.WATCHED && movie.watchedDaysAgo !== undefined
          ? daysAgo(movie.watchedDaysAgo)
          : null,
    };

    await prisma.watchlistItem.upsert({
      where: { userId_tmdbId: { userId: user.id, tmdbId: movie.tmdbId } },
      update: data,
      create: { userId: user.id, tmdbId: movie.tmdbId, ...data },
    });
  }

  console.log(
    `Seeded ${SEED_MOVIES.length} watchlist items ` +
      `(${enriched} enriched from TMDB, ${SEED_MOVIES.length - enriched} using fallback metadata).`,
  );
}

main()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
