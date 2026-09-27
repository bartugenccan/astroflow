import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { BirthInputDto } from '../../astrology/dto/birth-input.dto';
import { TAROT_CARD_IDS } from '../tarot.deck';
import { TAROT_CATEGORIES, TarotCategory } from '../tarot.types';

export class TarotDrawnCardDto {
  @IsIn(TAROT_CARD_IDS)
  cardId: string;

  @IsBoolean()
  reversed: boolean;
}

/** Birth data + the three drawn cards (index = spread position). */
export class TarotSpreadDto extends BirthInputDto {
  @IsIn(TAROT_CATEGORIES as unknown as string[])
  category: TarotCategory;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  question?: string;

  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => TarotDrawnCardDto)
  cards: TarotDrawnCardDto[];
}

export class TarotCardDto extends TarotSpreadDto {
  @IsInt()
  @Min(0)
  @Max(2)
  index: number;
}
