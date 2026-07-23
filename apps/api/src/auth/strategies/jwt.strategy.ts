import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
}

export interface RequestUser {
  userId: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? 'changeme',
    });
  }

  // Whatever this returns becomes `request.user`. Only ever build it from
  // the verified token payload — never trust a client-supplied id (FR17).
  //
  // A correctly signed, unexpired token is not sufficient on its own: the
  // user it names may have been deleted since it was issued (e.g. the dev
  // database was reset while a browser held an old token). Confirming the
  // row exists turns that into a clean 401 instead of a foreign-key crash
  // on the first write.
  async validate(payload: JwtPayload): Promise<RequestUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new UnauthorizedException('Account no longer exists');
    }

    return { userId: user.id, email: user.email };
  }
}
