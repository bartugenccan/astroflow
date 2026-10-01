import { Type } from 'class-transformer';
import {
  IsIn,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { BirthInputDto } from '../../astrology/dto/birth-input.dto';
import { ELECTION_EVENT_IDS, ElectionEventId } from '../election.types';

export class ElectionPlaceDto {
  @IsString()
  @MaxLength(80)
  name: string;

  @IsLatitude()
  latitude: number;

  @IsLongitude()
  longitude: number;
}

/** Birth data + what the event is (picked or typed) + where it happens. */
export class ElectionBaseDto extends BirthInputDto {
  @IsOptional()
  @IsIn(ELECTION_EVENT_IDS as unknown as string[])
  eventId?: ElectionEventId;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  eventText?: string;

  @ValidateNested()
  @Type(() => ElectionPlaceDto)
  place: ElectionPlaceDto;
}

export class ElectionCheckDto extends ElectionBaseDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date: string;
}

export class ElectionSearchDto extends ElectionBaseDto {
  @Matches(/^\d{4}-\d{2}$/, { message: 'from must be YYYY-MM' })
  from: string;

  @Matches(/^\d{4}-\d{2}$/, { message: 'to must be YYYY-MM' })
  to: string;
}
