import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from '../jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: JwtAuthGuard;

  const mockContext = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new JwtAuthGuard(reflector as unknown as Reflector);
  });

  describe('canActivate', () => {
    it('allows the request through without checking the token on @Public() routes', () => {
      reflector.getAllAndOverride.mockReturnValue(true);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('delegates to the passport jwt strategy on protected routes', () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const superCanActivate = jest
        .spyOn(AuthGuard('jwt').prototype, 'canActivate')
        .mockReturnValue(true);

      const result = guard.canActivate(mockContext);

      expect(superCanActivate).toHaveBeenCalledWith(mockContext);
      expect(result).toBe(true);

      superCanActivate.mockRestore();
    });
  });

  describe('handleRequest', () => {
    it('returns the user when the token is valid', () => {
      const user = { userId: 'user-1', email: 'demo@example.com' };

      expect(guard.handleRequest(null, user)).toEqual(user);
    });

    it('throws UnauthorizedException when the token is missing or expired (no user)', () => {
      expect(() => guard.handleRequest(null, false)).toThrow(UnauthorizedException);
    });

    it('rethrows whatever error the strategy produced', () => {
      const strategyError = new Error('jwt malformed');

      expect(() => guard.handleRequest(strategyError, false)).toThrow(strategyError);
    });
  });
});
