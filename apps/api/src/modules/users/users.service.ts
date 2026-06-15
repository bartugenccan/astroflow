import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersRepository } from './users.repository';
import {
  CreateUserDto,
  UpdateUserDto,
  LoginDto,
  CreateBirthProfileDto,
  UserResponseDto,
} from './dto/user.dto';
import * as bcrypt from 'bcrypt';
import { AstrologyEngine } from '../astrology/astrology-engine.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly astrologyEngine: AstrologyEngine,
  ) {}

  async register(dto: CreateUserDto): Promise<{ user: UserResponseDto; accessToken: string }> {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.usersRepository.create(dto, passwordHash);

    await this.usersRepository.initializeFrequencyScore(user.id);

    const accessToken = this.jwtService.sign({ sub: user.id, email: user.email });

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        timezone: user.timezone,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      accessToken,
    };
  }

  async login(dto: LoginDto): Promise<{ user: UserResponseDto; accessToken: string }> {
    const user = await this.usersRepository.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.jwtService.sign({ sub: user.id, email: user.email });

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        timezone: user.timezone,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      accessToken,
    };
  }

  async getProfile(userId: string) {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, dto: UpdateUserDto) {
    return this.usersRepository.update(userId, dto);
  }

  async deleteAccount(userId: string) {
    return this.usersRepository.delete(userId);
  }

  async setBirthProfile(userId: string, dto: CreateBirthProfileDto) {
    const chartData = this.astrologyEngine.calculateBirthChart(
      dto.birthDate,
      dto.birthTime,
      dto.latitude,
      dto.longitude,
    );

    return this.usersRepository.createBirthProfile(userId, dto, {
      sunSign: chartData.sun.sign,
      moonSign: chartData.moon.sign,
      risingSign: chartData.rising.sign,
      risingDegree: chartData.rising.degree,
      dominantElement: chartData.dominantElement,
      dominantPlanet: chartData.dominantPlanet,
    });
  }

  async getBirthProfile(userId: string) {
    const profile = await this.usersRepository.getBirthProfile(userId);
    if (!profile) {
      throw new NotFoundException('Birth profile not found');
    }
    return profile;
  }
}
