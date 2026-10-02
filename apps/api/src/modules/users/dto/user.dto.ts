import {
  IsEmail,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/** IANA zone names such as "Europe/Istanbul" or "America/Argentina/Buenos_Aires". */
const IANA_TZ = /^[A-Za-z]+(?:\/[A-Za-z0-9_+-]+){1,2}$/;

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

  @IsOptional()
  @IsString()
  @Matches(IANA_TZ, { message: 'timezone must be an IANA zone name' })
  timezone?: string = 'Europe/Istanbul';
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  displayName?: string;

  @IsOptional()
  @IsString()
  @Matches(IANA_TZ, { message: 'timezone must be an IANA zone name' })
  timezone?: string;

  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(500)
  avatarUrl?: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MaxLength(100)
  password: string;
}

export class CreateBirthProfileDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'birthDate must be YYYY-MM-DD format' })
  birthDate: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'birthTime must be HH:mm format' })
  birthTime: string;

  @IsLatitude()
  latitude: number;

  @IsLongitude()
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
