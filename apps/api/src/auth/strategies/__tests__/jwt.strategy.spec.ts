import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from '../jwt.strategy';
import { PrismaService } from '../../../prisma/prisma.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prisma: { user: { findUnique: jest.Mock } };

  const payload = { sub: 'user-1', email: 'demo@example.com' };

  beforeEach(() => {
    prisma = { user: { findUnique: jest.fn() } };
    const config = { get: () => 'test-secret' } as unknown as ConfigService;

    strategy = new JwtStrategy(config, prisma as unknown as PrismaService);
  });

  it('resolves the request user from the token payload', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'demo@example.com' });

    await expect(strategy.validate(payload)).resolves.toEqual({
      userId: 'user-1',
      email: 'demo@example.com',
    });
  });

  it('looks the user up by the token subject, not by anything client-supplied', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'demo@example.com' });

    await strategy.validate(payload);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { id: true, email: true },
    });
  });

  it('rejects a validly signed token whose user no longer exists', async () => {
    // Reproduces the dev-database-reset case: the signature and expiry are
    // fine, but the account is gone. Must be a 401, not a downstream foreign
    // key crash on the first write.
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
  });

  it('trusts the database record over the email embedded in the token', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'changed@example.com' });

    const result = await strategy.validate({ sub: 'user-1', email: 'stale@example.com' });

    expect(result.email).toBe('changed@example.com');
  });
});
