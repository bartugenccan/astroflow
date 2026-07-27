import { IsIn, IsInt, IsOptional, IsString, Max, Min, MaxLength } from 'class-validator';

export class CheckInDto {
  @IsInt()
  @Min(1)
  @Max(5)
  conviction: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  userText?: string;

  @IsOptional()
  @IsIn(['text', 'voice'])
  inputMode?: 'text' | 'voice';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  transcript?: string;
}
