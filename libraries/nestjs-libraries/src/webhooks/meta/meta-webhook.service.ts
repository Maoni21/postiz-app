import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class MetaWebhookService {
  private readonly logger = new Logger(MetaWebhookService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('setter-ai') private setterAiQueue: Queue,
  ) {}

  /**
   * Traite un message Messenger
   */
  async handleMessage(event: any) {
    this.logger.log('Processing Messenger event');

    if (!event.message || !event.message.text) {
      this.logger.log('No text message, skipping');
      return;
    }

    const senderId = event.sender.id;
    const recipientId = event.recipient.id;
    const messageText = event.message.text;

    this.logger.log(`Message from ${senderId}: ${messageText}`);

    // Trouver le Setter configuré pour cette Page
    const setter = await this.findSetterForPage(recipientId);

    if (!setter) {
      this.logger.warn(`No setter configured for page ${recipientId}`);
      return;
    }

    // Créer ou récupérer la conversation
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        setterConfigId: setter.id,
        prospectId: senderId,
        platform: 'MESSENGER',
      },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          setterConfigId: setter.id,
          platform: 'MESSENGER',
          prospectId: senderId,
          platformUserId: senderId,
          platformConversationId: `messenger_${senderId}`,
          status: 'ACTIVE',
          messages: [],
        },
      });
    }

    // Envoyer au worker pour traitement
    await this.setterAiQueue.add('process-message', {
      conversationId: conversation.id,
      message: messageText,
      sender: {
        id: senderId,
        name: 'Facebook User',
      },
    });

    this.logger.log(`✅ Message queued for processing: ${conversation.id}`);
  }

  /**
   * Traite un message Instagram
   */
  async handleInstagramMessage(value: any) {
    this.logger.log('Processing Instagram message');

    if (!value.message || !value.message.text) {
      this.logger.log('No text message, skipping');
      return;
    }

    const senderId = value.from.id;
    const recipientId = value.to?.id || value.recipient?.id;
    const messageText = value.message.text;

    this.logger.log(`Instagram message from ${senderId}: ${messageText}`);

    // Trouver le Setter configuré pour ce compte Instagram
    const setter = await this.findSetterForInstagram(recipientId);

    if (!setter) {
      this.logger.warn(`No setter configured for Instagram ${recipientId}`);
      return;
    }

    // Créer ou récupérer la conversation
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        setterConfigId: setter.id,
        prospectId: senderId,
        platform: 'INSTAGRAM',
      },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          setterConfigId: setter.id,
          platform: 'INSTAGRAM',
          prospectId: senderId,
          platformUserId: senderId,
          platformConversationId: `instagram_${senderId}`,
          status: 'ACTIVE',
          messages: [],
        },
      });
    }

    // Envoyer au worker
    await this.setterAiQueue.add('process-message', {
      conversationId: conversation.id,
      message: messageText,
      sender: {
        id: senderId,
        name: 'Instagram User',
      },
    });

    this.logger.log(`✅ Instagram message queued: ${conversation.id}`);
  }

  /**
   * Trouve le Setter configuré pour une Page Facebook
   */
  private async findSetterForPage(pageId: string) {
    // Pour l'instant, on prend le premier Setter actif
    // Plus tard, vous pourrez mapper Page ID <-> Setter ID
    return this.prisma.setterConfig.findFirst({
      where: {
        isActive: true,
      },
    });
  }

  /**
   * Trouve le Setter configuré pour un compte Instagram
   */
  private async findSetterForInstagram(instagramId: string) {
    // Même logique que pour Facebook
    return this.prisma.setterConfig.findFirst({
      where: {
        isActive: true,
      },
    });
  }
}