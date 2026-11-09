import { Global, Module } from '@nestjs/common';
import { DailyQuotaService } from './daily-quota.service';

@Global()
@Module({
  providers: [DailyQuotaService],
  exports: [DailyQuotaService],
})
export class QuotaModule {}
