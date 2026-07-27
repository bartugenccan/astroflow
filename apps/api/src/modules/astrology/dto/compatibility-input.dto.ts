import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { BirthInputDto } from './birth-input.dto';

/** Two-chart payload for the synastry/compatibility endpoints. */
export class CompatibilityInputDto {
  @ValidateNested()
  @Type(() => BirthInputDto)
  self: BirthInputDto;

  @ValidateNested()
  @Type(() => BirthInputDto)
  other: BirthInputDto;

  @IsOptional()
  @IsString()
  savedPersonId?: string;
}
