import { IsIn, IsInt, Max, Min } from 'class-validator';
import { MOOD_SKIES } from '../mood.service';
import type { MoodSky } from '../plan-rules';

export class MoodCheckInDto {
  @IsIn(MOOD_SKIES as unknown as string[])
  sky: MoodSky;

  @IsInt()
  @Min(1)
  @Max(5)
  energy: number;
}
