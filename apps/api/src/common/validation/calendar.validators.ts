import { ValidateBy, ValidationOptions, buildMessage } from 'class-validator';

/** True for a `YYYY-MM-DD` that names a real day (no 2026-02-31) between 1800 and 2200. */
export function isCalendarDate(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < 1800 || y > 2200) return false;
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

/** True for a 24-hour `HH:mm` (00:00–23:59). */
export function isClockTime(value: unknown): boolean {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function IsCalendarDate(options?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isCalendarDate',
      validator: {
        validate: isCalendarDate,
        defaultMessage: buildMessage((each) => `${each}$property must be a real date as YYYY-MM-DD`, options),
      },
    },
    options,
  );
}

export function IsClockTime(options?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isClockTime',
      validator: {
        validate: isClockTime,
        defaultMessage: buildMessage((each) => `${each}$property must be a time as HH:mm`, options),
      },
    },
    options,
  );
}
