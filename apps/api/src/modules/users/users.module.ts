import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { JwtStrategy } from './jwt.strategy';
import { AstrologyEngine } from '../astrology/astrology-engine.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'astroflow-dev-secret',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, JwtStrategy, AstrologyEngine],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
