import { IsIn, IsInt, IsOptional, IsString, Max, Min, MaxLength } from 'class-validator';
import { BirthInputDto } from '../../astrology/dto/birth-input.dto';

const AREAS = ['love', 'career', 'money', 'energy'] as const;

/** Birth data (for the chart-framed affirmation) + the goal. */
export class CreateIntentionDto extends BirthInputDto {
  @IsString()
  @MaxLength(120)
  goalText: string;

  @IsString()
  @MaxLength(40)
  category: string;

  @IsOptional()
  @IsIn(AREAS)
  lifeArea?: (typeof AREAS)[number];

  @IsInt()
  @Min(1)
  @Max(10)
  dailyTarget: number;
}
