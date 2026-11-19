import { Body, Controller, Headers, HttpCode, Post, UnauthorizedException } from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DeviceId } from '../../common/device/device-id.decorator';
import { Public } from '../../common/auth/public.decorator';
import { BillingService } from './billing.service';

@ApiTags('Billing')
@Controller()
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  /** The app calls this after a purchase, a restore, an identity change and on launch. */
  @ApiBearerAuth()
  @Post('billing/sync')
  @HttpCode(200)
  @ApiOperation({ summary: 'Re-read this subject’s subscription from RevenueCat' })
  sync(@DeviceId() deviceId: string) {
    return this.billing.sync(deviceId);
  }

  /**
   * RevenueCat webhook. Authorised by the static Authorization header set in the
   * RevenueCat dashboard. The body is read as plain JSON (no DTO), so new
   * RevenueCat fields never fail validation; only the app user ids are used.
   */
  @Public()
  @Post('webhooks/revenuecat')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async revenueCatWebhook(@Headers('authorization') auth: string | undefined, @Body() body: Record<string, unknown>) {
    if (!this.billing.webhookAuthorized(auth)) throw new UnauthorizedException();
    const refreshed = await this.billing.handleWebhook(body);
    return { ok: true, refreshed };
  }
}
