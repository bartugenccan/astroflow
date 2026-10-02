import {
  IsBoolean,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';

/** Birth data payload for chart + interpretation endpoints. */
export class BirthInputDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'birthDate must be YYYY-MM-DD' })
  birthDate: string;

  @Matches(/^\d{2}:\d{2}$/, { message: 'birthTime must be HH:mm' })
  birthTime: string;

  @IsLatitude()
  latitude: number;

  @IsLongitude()
  longitude: number;

  @IsOptional()
  @IsInt()
  @Min(-720)
  @Max(720)
  utcOffsetMin?: number;

  @IsOptional()
  @IsBoolean()
  unknownTime?: boolean;
}
