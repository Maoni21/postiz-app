import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Headers,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { MetaWebhookService } from './meta-webhook.service';
import * as crypto from 'crypto';

@Controller('webhooks')
export class MetaWebhookController {
  private readonly logger = new Logger(MetaWebhookController.name);

  constructor(private readonly webhookService: MetaWebhookService) {}

  /**
   * Vérification du webhook par Meta
   */
  @Get('instagram')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    this.logger.log('Webhook verification request received');
    this.logger.log(`Mode: ${mode}, Token: ${token}`);

    const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      this.logger.log('✅ Webhook verified successfully!');
      return challenge;
    }

    this.logger.error('❌ Webhook verification failed');
    throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
  }

  /**
   * Réception des événements Instagram/Messenger
   */
  @Post('instagram')
  async handleWebhook(
    @Body() body: any,
    @Headers('x-hub-signature-256') signature: string,
  ) {
    this.logger.log('📨 Webhook event received');
    this.logger.log(JSON.stringify(body, null, 2));

    // Vérifier la signature (désactivé temporairement pour tests)
    // TODO: Réactiver en production avec le bon META_APP_SECRET
    // if (!this.verifySignature(body, signature)) {
    //   this.logger.error('❌ Invalid signature');
    //   throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    // }

    try {
      // Traiter les événements
      if (body.object === 'instagram' || body.object === 'page') {
        for (const entry of body.entry) {
          // Messages Instagram
          if (entry.messaging) {
            for (const event of entry.messaging) {
              await this.webhookService.handleMessage(event);
            }
          }

          // Messages Messenger
          if (entry.changes) {
            for (const change of entry.changes) {
              if (change.field === 'messages') {
                await this.webhookService.handleInstagramMessage(change.value);
              }
            }
          }
        }
      }

      return { success: true };
    } catch (error) {
      this.logger.error('Error processing webhook:', error);
      throw new HttpException(
        'Internal Server Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Vérifier la signature Meta pour sécuriser le webhook
   */
  private verifySignature(body: any, signature: string): boolean {
    if (!signature) {
      this.logger.warn('No signature provided');
      return true; // En dev, accepter sans signature
    }

    const APP_SECRET = process.env.META_APP_SECRET;
    if (!APP_SECRET) {
      this.logger.warn('META_APP_SECRET not set, skipping verification');
      return true;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', APP_SECRET)
        .update(JSON.stringify(body))
        .digest('hex');

      const receivedSignature = signature.replace('sha256=', '');

      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(receivedSignature),
      );
    } catch (error) {
      this.logger.error('Signature verification error:', error);
      return false;
    }
  }
}