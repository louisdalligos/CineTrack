import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { RequestUser } from '../strategies/jwt.strategy';

/**
 * Pulls the authenticated user off the request, where JwtStrategy.validate()
 * placed it after verifying the token signature.
 *
 * This is the ONLY sanctioned way to learn who is making a request (FR17).
 * Never read a user id from a route param, query string, or request body.
 */
export const CurrentUser = createParamDecorator(
  (data: keyof RequestUser | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<{ user: RequestUser }>();
    return data ? request.user[data] : request.user;
  },
);
