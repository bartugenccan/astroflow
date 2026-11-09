import { IsEmail, IsIn, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

export class AppleSignInDto {
  @IsString()
  @MaxLength(4096)
  identityToken: string;

  /** The raw nonce the app generated; Apple signs its SHA-256. */
  @IsString()
  @Length(16, 128)
  rawNonce: string;

  /** One-time code → refresh token (needed to revoke on deletion). */
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  authorizationCode?: string;

  /** Apple shares the name only on the very first authorization. */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  givenName?: string;
}

export class GoogleSignInDto {
  @IsString()
  @MaxLength(4096)
  idToken: string;
}

export class EmailStartDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsOptional()
  @IsIn(['en', 'tr'])
  locale?: 'en' | 'tr';
}

export class EmailVerifyDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @Matches(/^\d{6}$/, { message: 'code must be 6 digits' })
  code: string;
}

export const PROVIDER_PARAMS = ['apple', 'google', 'email'] as const;
export type ProviderParam = (typeof PROVIDER_PARAMS)[number];
