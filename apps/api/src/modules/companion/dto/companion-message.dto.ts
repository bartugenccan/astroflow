import { IsString, MaxLength } from 'class-validator';
import { BirthInputDto } from '../../astrology/dto/birth-input.dto';

/** Birth data + the user's chat message. */
export class CompanionMessageDto extends BirthInputDto {
  @IsString()
  @MaxLength(1000)
  message: string;
}
