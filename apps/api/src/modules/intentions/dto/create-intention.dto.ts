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

  /** The affirmation the user kept or edited in the wizard; generated when absent. */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  affirmation?: string;

  /** Plant now, or let the wish wait for the next new moon. */
  @IsOptional()
  @IsIn(['now', 'newMoon'])
  plant?: 'now' | 'newMoon';
}

/** Preview the chart-framed affirmation before the wish is planted. */
export class AffirmationPreviewDto extends BirthInputDto {
  @IsString()
  @MaxLength(120)
  goalText: string;

  @IsIn(AREAS)
  lifeArea: (typeof AREAS)[number];
}
