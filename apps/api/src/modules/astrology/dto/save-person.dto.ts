import {
  IsBoolean,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { IsCalendarDate, IsClockTime } from '../../../common/validation/calendar.validators';

/** Payload to persist a second person for compatibility checks. */
export class SavePersonDto {
  @IsString()
  @MaxLength(60)
  label: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  relationship?: string;

  @IsCalendarDate()
  birthDate: string;

  @IsClockTime()
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
