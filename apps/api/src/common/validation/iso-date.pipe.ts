import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

/** How far from today a date query may reach, either way. */
const MAX_YEARS = 5;

/**
 * Optional `YYYY-MM-DD` query values (forecast `start`, year-ahead `on`).
 * Absent → undefined (the service picks today). Present → must be a real
 * calendar day within ±5 years, otherwise 400 — instead of silently falling
 * back, or letting a client page through arbitrary years of AI generations.
 */
@Injectable()
export class ParseOptionalIsoDatePipe implements PipeTransform<string | undefined, string | undefined> {
  transform(value: string | undefined): string | undefined {
    if (value === undefined || value === '') return undefined;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!m) throw new BadRequestException('Expected a date as YYYY-MM-DD');
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const date = new Date(Date.UTC(y, mo - 1, d));
    if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) {
      throw new BadRequestException('Not a real calendar date');
    }
    const span = Math.abs(date.getTime() - Date.now()) / (365.25 * 86_400_000);
    if (span > MAX_YEARS) throw new BadRequestException(`Date must be within ${MAX_YEARS} years of today`);
    return value;
  }
}
