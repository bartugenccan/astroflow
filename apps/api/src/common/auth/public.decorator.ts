import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Opts a route out of the global device-token guard (health, device sign-up, user login). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
