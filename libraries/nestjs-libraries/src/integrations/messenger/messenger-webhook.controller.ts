import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { MessengerWebhookService } from './messenger-webhook.service';

/**
 * Contrôleur pour gérer les webhooks Facebook Messenger
 * Documentation: https://developers.facebook.com/docs/messenger-platform/webhooks
 */
@Controller('webhooks/messenger')
export class MessengerWebhookController {
  private readonly logger = new Logger(MessengerWebhookController.name);

  constructor(
    private readonly messengerWebhookService: MessengerWebhookService,
  ) {}

  /**
   * GET /webhooks/messenger
   * Vérification du webhook par Facebook lors de la configuration
   * Facebook envoie un challenge token qu'on doit renvoyer pour valider
   */
  @Get()
  async verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
  ) {
    this.logger.log('Webhook verification request received');

    // Le verify token doit correspondre à celui configuré dans Facebook App
    const VERIFY_TOKEN = process.env.MESSENGER_VERIFY_TOKEN || 'postiz_setter_ai_verify_token';

    if (mode === 'subscribe' && verifyToken === VERIFY_TOKEN) {
      this.logger.log('Webhook verified successfully');
      return challenge;
    }

    this.logger.error('Webhook verification failed');
    throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
  }

  /**
   * POST /webhooks/messenger
   * Réception des événements Messenger (messages, lectures, etc.)
   */
  @Post()
  async handleWebhook(@Body() body: any) {
    this.logger.log('Webhook event received');

    try {
      // Vérifier que c'est bien un événement de page
      if (body.object !== 'page') {
        this.logger.warn('Received non-page webhook event');
        return { status: 'ok' };
      }

      // Traiter chaque entrée du webhook
      for (const entry of body.entry || []) {
        const pageId = entry.id;

        // Traiter les événements de messaging
        for (const event of entry.messaging || []) {
          await this.processMessagingEvent(pageId, event);
        }
      }

      return { status: 'ok' };
    } catch (error) {
      this.logger.error('Error processing webhook', error);
      // On retourne quand même 200 pour éviter que Facebook retry indéfiniment
      return { status: 'error', message: error.message };
    }
  }

  /**
   * Traiter un événement de messaging
   */
  private async processMessagingEvent(pageId: string, event: any) {
    const senderId = event.sender?.id;
    const recipientId = event.recipient?.id;

    // Message reçu
    if (event.message) {
      this.logger.log(`Message received from ${senderId}`);
      
      // Éviter de traiter nos propres messages
      if (event.message.is_echo) {
        return;
      }

      await this.messengerWebhookService.handleIncomingMessage({
        pageId,
        senderId,
        recipientId,
        messageId: event.message.mid,
        text: event.message.text,
        attachments: event.message.attachments || [],
        timestamp: event.timestamp,
      });
    }

    // Message lu
    if (event.read) {
      this.logger.log(`Message read by ${senderId}`);
      // On peut tracker les lectures si besoin
    }

    // Message livré
    if (event.delivery) {
      this.logger.log(`Message delivered to ${senderId}`);
      // On peut tracker les livraisons si besoin
    }

    // Postback (boutons cliqués)
    if (event.postback) {
      this.logger.log(`Postback received from ${senderId}: ${event.postback.payload}`);
      
      await this.messengerWebhookService.handlePostback({
        pageId,
        senderId,
        payload: event.postback.payload,
        title: event.postback.title,
        timestamp: event.timestamp,
      });
    }
  }
}
