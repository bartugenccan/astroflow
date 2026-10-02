import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { BirthInputDto } from '../../astrology/dto/birth-input.dto';
import { REPORT_KINDS, ReportKind } from '../reports.types';

export class CreateReportDto extends BirthInputDto {
  @IsIn(REPORT_KINDS as unknown as string[])
  kind: ReportKind;

  /** Shown on the cover. */
  @IsString()
  @MaxLength(60)
  name: string;

  /** Birthplace label for the cover. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  placeName?: string;
}
