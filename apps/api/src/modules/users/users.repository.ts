import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateUserDto, UpdateUserDto, CreateBirthProfileDto } from './dto/user.dto';

/**
 * Every column a client may see. `passwordHash` is deliberately absent — any
 * query whose result can reach a response must use this select.
 */
export const userPublicSelect = {
  id: true,
  email: true,
  displayName: true,
  avatarUrl: true,
  timezone: true,
  starPoints: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Internal only (login): includes the password hash. Never return it to a client. */
  async findByEmailWithHash(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        ...userPublicSelect,
        birthProfile: true,
        streaks: true,
      },
    });
  }

  async create(dto: CreateUserDto, passwordHash: string) {
    return this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        displayName: dto.displayName,
        timezone: dto.timezone || 'Europe/Istanbul',
      },
      select: userPublicSelect,
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: userPublicSelect,
    });
  }

  async delete(id: string) {
    await this.prisma.user.delete({ where: { id }, select: { id: true } });
  }

  async createBirthProfile(userId: string, dto: CreateBirthProfileDto, chartData: any) {
    return this.prisma.birthProfile.create({
      data: {
        userId,
        // Anchor to UTC midnight so a "YYYY-MM-DD" string can't shift a day
        // under the @db.Date column in a non-UTC timezone.
        birthDate: new Date(`${dto.birthDate}T00:00:00Z`),
        birthTime: dto.birthTime,
        latitude: dto.latitude,
        longitude: dto.longitude,
        sunSign: chartData.sunSign,
        moonSign: chartData.moonSign,
        risingSign: chartData.risingSign,
        risingDegree: chartData.risingDegree,
        dominantElement: chartData.dominantElement || null,
        dominantPlanet: chartData.dominantPlanet || null,
        chartData,
      },
    });
  }

  async getBirthProfile(userId: string) {
    return this.prisma.birthProfile.findUnique({ where: { userId } });
  }

  async initializeFrequencyScore(userId: string) {
    return this.prisma.frequencyScore.create({
      data: {
        userId,
        value: 0,
        trend: 'stable',
        synergyLevel: 'ALPHA',
        breakdown: {
          rituals: 0,
          consistency: 0,
          astro: 0,
          social: 0,
        },
      },
    });
  }
}
