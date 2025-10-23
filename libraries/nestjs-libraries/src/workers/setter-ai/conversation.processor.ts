import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../database/prisma/prisma.service';
import { ClaudeApiService } from './claude-api.service';
import { MessengerWebhookService } from '../../integrations/messenger/messenger-webhook.service'

interface ConversationJob {
  setterId: string;
  pageId: string;
  senderId: string;
  messageId: string;
  text: string;
  attachments: any[];
  timestamp: number;
  isPostback?: boolean;
  postbackPayload?: string;
}

/**
 * Worker pour traiter les conversations Setter IA
 * Écoute la queue 'setter-ai-conversations' et traite chaque message
 */
@Processor('setter-ai-conversations')
export class ConversationProcessor extends WorkerHost {
  private readonly logger = new Logger(ConversationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly claudeApi: ClaudeApiService,
    private readonly messengerService: MessengerWebhookService,
  ) {
    super();
  }

  /**
   * Traiter un message de la queue
   */
  async process(job: Job<ConversationJob>): Promise<any> {
    const { setterId, pageId, senderId, text, timestamp } = job.data;

    this.logger.log(`Processing message for Setter ${setterId} from ${senderId}`);

    try {
      // 1. Récupérer la configuration du Setter
      const setter = await this.prisma.setterConfig.findUnique({
        where: { id: setterId },
      });

      if (!setter || !setter.isActive) {
        this.logger.warn(`Setter ${setterId} not found or inactive`);
        return { status: 'skipped', reason: 'setter_inactive' };
      }

      // 2. Récupérer ou créer la conversation
      let conversation = await this.prisma.conversation.findFirst({
        where: {
          setterConfigId: setterId,
          externalUserId: senderId,
          status: { in: ['active', 'pending'] },
        },
      });

      if (!conversation) {
        // Créer une nouvelle conversation
        conversation = await this.prisma.conversation.create({
          data: {
            setterConfigId: setterId,
            externalUserId: senderId,
            platform: 'messenger',
            status: 'active',
            messages: [],
            metadata: {
              pageId,
              startedAt: new Date(timestamp).toISOString(),
            },
          },
        });

        this.logger.log(`New conversation created: ${conversation.id}`);
      }

      // 3. Ajouter le message utilisateur à l'historique
      const messages = (conversation.messages as any[]) || [];
      messages.push({
        role: 'user',
        content: text,
        timestamp: new Date(timestamp).toISOString(),
      });

      // 4. Générer une réponse avec Claude
      const claudeResponse = await this.claudeApi.generateResponse(
        setter.systemPrompt,
        messages.filter((m) => m.role === 'user' || m.role === 'assistant'),
        text,
      );

      // 5. Ajouter la réponse à l'historique
      messages.push({
        role: 'assistant',
        content: claudeResponse.response,
        timestamp: new Date().toISOString(),
      });

      // 6. Mettre à jour la conversation en BDD
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          messages,
          updatedAt: new Date(),
        },
      });

      // 7. Envoyer la réponse via Messenger
      // TODO: Récupérer le pageAccessToken depuis la config du Setter
      const pageAccessToken = 'PAGE_ACCESS_TOKEN'; // À implémenter
      await this.messengerService.sendMessage(
        pageAccessToken,
        senderId,
        claudeResponse.response,
      );

      this.logger.log(`Response sent to ${senderId}`);

      // 8. Vérifier si le lead doit être qualifié
      // On qualifie après 3 messages échangés minimum
      if (messages.filter((m) => m.role === 'user').length >= 3) {
        await this.qualifyLead(conversation.id, setter, messages);
      }

      return {
        status: 'success',
        conversationId: conversation.id,
        response: claudeResponse.response,
      };
    } catch (error) {
      this.logger.error('Error processing message', error);
      throw error;
    }
  }

  /**
   * Qualifier un lead
   */
  private async qualifyLead(
    conversationId: string,
    setter: any,
    messages: any[],
  ) {
    try {
      this.logger.log(`Qualifying lead for conversation ${conversationId}`);

      const qualification = await this.claudeApi.qualifyLead(
        messages,
        setter.qualificationCriteria,
      );

      // Si le lead est qualifié (score >= 7)
      if (qualification.isQualified && qualification.score >= 7) {
        // Créer un ExtractedLead
        await this.prisma.extractedLead.create({
          data: {
            conversationId,
            contactInfo: qualification.extractedInfo,
            qualificationScore: qualification.score,
            qualificationReason: qualification.reasoning,
            nextAction: 'contact',
          },
        });

        this.logger.log(`Lead qualified with score ${qualification.score}/10`);

        // TODO: Envoyer un message avec proposition de RDV
        // await this.proposeBooking(conversationId);
      } else {
        this.logger.log(`Lead not qualified: Score ${qualification.score}/10`);
      }
    } catch (error) {
      this.logger.error('Error qualifying lead', error);
    }
  }
}
