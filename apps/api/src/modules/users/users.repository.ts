import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateUserDto, UpdateUserDto, CreateBirthProfileDto } from './dto/user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
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
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }

  async createBirthProfile(userId: string, dto: CreateBirthProfileDto, chartData: any) {
    return this.prisma.birthProfile.create({
      data: {
        userId,
        birthDate: new Date(dto.birthDate),
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
