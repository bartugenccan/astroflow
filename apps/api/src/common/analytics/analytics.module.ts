import { Global, Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

/** One PostHog client for the whole API (off without POSTHOG_API_KEY). */
@Global()
@Module({
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
