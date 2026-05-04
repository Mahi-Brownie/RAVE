import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists.');
    }

    // Create local user record
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        tier: 'free',
      },
    });

    const tokens = await this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    // For now, just check if user exists and generate tokens
    // In a real implementation, you'd validate credentials properly
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const tokens = await this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const session = await this.prisma.session.findUnique({
        where: { id: payload.sessionId },
        include: { user: true },
      });

      if (!session || session.expiresAt < new Date()) {
        throw new UnauthorizedException('Invalid or expired refresh token.');
      }

      const newTokens = await this.generateTokens(session.user);

      await this.prisma.session.delete({
        where: { id: session.id },
      });

      return {
        user: this.sanitizeUser(session.user),
        ...newTokens,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token.');
    }
  }

  async logout(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      await this.prisma.session.delete({
        where: { id: payload.sessionId },
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token.');
    }
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    return this.sanitizeUser(user);
  }

  private async generateTokens(user: User) {
    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
      },
      {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRY || '15m',
      },
    );

    const sessionId = await this.createSession(user);

    const refreshToken = this.jwtService.sign(
      {
        sub: user.id,
        sessionId,
      },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
      },
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  private async createSession(user: User): Promise<string> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        expiresAt,
        refreshTokenHash: '', // Will be populated when needed
      },
    });

    return session.id;
  }

  private sanitizeUser(user: User) {
    const sanitized = { ...user };
    return sanitized;
  }
}
