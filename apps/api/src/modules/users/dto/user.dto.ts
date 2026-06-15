import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  displayName: string;

  @IsString()
  timezone?: string = 'Europe/Istanbul';
}

export class UpdateUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  displayName?: string;

  @IsString()
  timezone?: string;

  @IsString()
  avatarUrl?: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class CreateBirthProfileDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'birthDate must be YYYY-MM-DD format' })
  birthDate: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'birthTime must be HH:mm format' })
  birthTime: string;

  latitude: number;
  longitude: number;
}

export class UserResponseDto {
  id: string;
  email: string;
  displayName: string;
  timezone: string;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class BirthProfileResponseDto {
  id: string;
  birthDate: string;
  birthTime: string;
  latitude: number;
  longitude: number;
  sunSign: string;
  moonSign: string;
  risingSign: string;
  risingDegree: number;
  dominantElement: string | null;
  dominantPlanet: string | null;
}
