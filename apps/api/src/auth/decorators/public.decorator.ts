import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as exempt from the global JwtAuthGuard.
 * Usage: @Public() above a controller method (e.g. /auth/register, /auth/login).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
