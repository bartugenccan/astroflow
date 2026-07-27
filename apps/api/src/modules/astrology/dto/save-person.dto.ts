import {
  IsBoolean,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

/** Payload to persist a second person for compatibility checks. */
export class SavePersonDto {
  @IsString()
  @MaxLength(60)
  label: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  relationship?: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'birthDate must be YYYY-MM-DD' })
  birthDate: string;

  @Matches(/^\d{2}:\d{2}$/, { message: 'birthTime must be HH:mm' })
  birthTime: string;

  @IsLatitude()
  latitude: number;

  @IsLongitude()
  longitude: number;

  @IsOptional()
  @IsBoolean()
  unknownTime?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  placeName?: string;
}
