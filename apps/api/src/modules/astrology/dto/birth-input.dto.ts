import {
  IsBoolean,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { IsCalendarDate, IsClockTime } from '../../../common/validation/calendar.validators';

/** Birth data payload for chart + interpretation endpoints. */
export class BirthInputDto {
  @IsCalendarDate()
  birthDate: string;

  @IsClockTime()
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
