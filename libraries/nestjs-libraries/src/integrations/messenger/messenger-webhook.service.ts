import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../database/prisma/prisma.service';

interface IncomingMessage {
  pageId: string;
  senderId: string;
  recipientId: string;
  messageId: string;
  text: string;
  attachments: any[];
  timestamp: number;
}

interface PostbackEvent {
  pageId: string;
  senderId: string;
  payload: string;
  title: string;
  timestamp: number;
}

/**
 * Service pour gérer les webhooks Messenger
 * Met les messages en queue pour traitement asynchrone
 */
@Injectable()
export class MessengerWebhookService {
  private readonly logger = new Logger(MessengerWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('setter-ai-conversations') private conversationQueue: Queue,
  ) {}

  /**
   * Gérer un message entrant
   * 1. Trouver le Setter IA associé à cette page
   * 2. Mettre le message en queue pour traitement
   */
  async handleIncomingMessage(message: IncomingMessage) {
    try {
      this.logger.log(`Processing incoming message: ${message.messageId}`);

      // Trouver le Setter IA associé à cette page Facebook
      const setter = await this.findSetterByPageId(message.pageId);

      if (!setter) {
        this.logger.warn(`No Setter AI found for page ${message.pageId}`);
        return;
      }

      if (!setter.isActive) {
        this.logger.warn(`Setter AI ${setter.id} is inactive`);
        return;
      }

      // Mettre le message en queue pour traitement par le worker
      await this.conversationQueue.add('process-message', {
        setterId: setter.id,
        pageId: message.pageId,
        senderId: message.senderId,
        messageId: message.messageId,
        text: message.text,
        attachments: message.attachments,
        timestamp: message.timestamp,
      });

      this.logger.log(`Message queued for processing: ${message.messageId}`);
    } catch (error) {
      this.logger.error('Error handling incoming message', error);
      throw error;
    }
  }

  /**
   * Gérer un postback (bouton cliqué)
   */
  async handlePostback(postback: PostbackEvent) {
    try {
      this.logger.log(`Processing postback: ${postback.payload}`);

      const setter = await this.findSetterByPageId(postback.pageId);

      if (!setter || !setter.isActive) {
        return;
      }

      // Traiter le postback comme un message texte
      await this.conversationQueue.add('process-message', {
        setterId: setter.id,
        pageId: postback.pageId,
        senderId: postback.senderId,
        messageId: `postback_${postback.timestamp}`,
        text: postback.title, // Le texte du bouton cliqué
        attachments: [],
        timestamp: postback.timestamp,
        isPostback: true,
        postbackPayload: postback.payload,
      });

      this.logger.log(`Postback queued for processing: ${postback.payload}`);
    } catch (error) {
      this.logger.error('Error handling postback', error);
      throw error;
    }
  }

  /**
   * Trouver le Setter IA associé à une page Facebook
   * On stocke le pageId dans le SetterConfig lors de la configuration
   */
  private async findSetterByPageId(pageId: string): Promise<any> {
    // On va stocker le pageId dans un nouveau champ du SetterConfig
    // Pour l'instant, on cherche dans les credentials (JSON)
    const setter = await this.prisma.setterConfig.findFirst({
      where: {
        isActive: true,
        // On suppose que calendarCredentials stocke aussi les infos de page
        // On va améliorer ça après
      },
    });

    return setter;
  }

  /**
   * Envoyer un message via l'API Messenger
   */
  async sendMessage(pageAccessToken: string, recipientId: string, text: string) {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/me/messages?access_token=${pageAccessToken}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipient: { id: recipientId },
            message: { text },
            messaging_type: 'RESPONSE',
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        this.logger.error('Error sending message', data);
        throw new Error(`Messenger API error: ${data.error?.message}`);
      }

      this.logger.log(`Message sent to ${recipientId}`);
      return data;
    } catch (error) {
      this.logger.error('Error sending message', error);
      throw error;
    }
  }

  /**
   * Envoyer un message avec des boutons
   */
  async sendMessageWithButtons(
    pageAccessToken: string,
    recipientId: string,
    text: string,
    buttons: Array<{ type: string; title: string; payload?: string; url?: string }>,
  ) {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/me/messages?access_token=${pageAccessToken}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipient: { id: recipientId },
            message: {
              attachment: {
                type: 'template',
                payload: {
                  template_type: 'button',
                  text,
                  buttons,
                },
              },
            },
            messaging_type: 'RESPONSE',
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        this.logger.error('Error sending message with buttons', data);
        throw new Error(`Messenger API error: ${data.error?.message}`);
      }

      return data;
    } catch (error) {
      this.logger.error('Error sending message with buttons', error);
      throw error;
    }
  }
}
