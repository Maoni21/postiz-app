import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';

interface ProcessMessageJob {
  conversationId: string;
  message: string;
  sender: {
    id: string;
    name: string;
  };
}

interface QualifyLeadJob {
  conversationId: string;
}

@Injectable()
@Processor('setter-ai', {
  concurrency: 5,
})
export class SetterAiWorker extends WorkerHost {
  private readonly logger = new Logger(SetterAiWorker.name);
  private anthropic: Anthropic;

  constructor(private readonly prisma: PrismaService) {
    super();

    // Initialiser Anthropic
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      this.logger.log('Anthropic initialized successfully');
    } else {
      this.logger.warn('ANTHROPIC_API_KEY not set - AI responses will be disabled');
    }
  }

  async process(job: Job): Promise<any> {
    this.logger.log(`Processing job: ${job.name} - ID: ${job.id}`);

    try {
      switch (job.name) {
        case 'process-message':
          return await this.processMessage(job.data as ProcessMessageJob);

        case 'qualify-lead':
          return await this.qualifyLead(job.data as QualifyLeadJob);

        default:
          this.logger.warn(`Unknown job type: ${job.name}`);
          return null;
      }
    } catch (error) {
      this.logger.error(`Job ${job.id} failed:`, error);
      throw error;
    }
  }

  /**
   * Traite un message reçu et génère une réponse via Claude
   */
  private async processMessage(data: ProcessMessageJob) {
    const { conversationId, message, sender } = data;

    this.logger.log(`Processing message for conversation ${conversationId}`);

    // 1. Récupérer la conversation et le Setter config
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        setterConfig: true,
      },
    });

    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    if (!conversation.setterConfig.isActive) {
      this.logger.log(`Setter ${conversation.setterConfig.id} is inactive, skipping`);
      return;
    }

    // 2. Récupérer les messages existants (JSON array)
    const existingMessages = (conversation.messages as any[]) || [];

    // 3. Construire l'historique pour Claude
    const conversationHistory = existingMessages.map((msg: any) => ({
      role: msg.sender === 'USER' ? 'user' : 'assistant',
      content: msg.content,
    }));

    // Ajouter le nouveau message
    conversationHistory.push({
      role: 'user',
      content: message,
    });

    // 4. Appeler Claude pour générer une réponse
    if (!this.anthropic) {
      this.logger.warn('Anthropic not configured, skipping AI response');
      return;
    }

    this.logger.log('Calling Claude API...');

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: conversation.setterConfig.systemPrompt,
      messages: conversationHistory as any,
    });

    const aiResponse = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    this.logger.log(`AI response received: ${aiResponse.substring(0, 100)}...`);

    // 5. Mettre à jour le tableau messages avec les 2 nouveaux messages
    const updatedMessages = [
      ...existingMessages,
      {
        sender: 'USER',
        content: message,
        senderId: sender.id,
        senderName: sender.name,
        timestamp: new Date().toISOString(),
      },
      {
        sender: 'AI',
        content: aiResponse,
        model: 'claude-sonnet-4',
        tokens: response.usage,
        timestamp: new Date().toISOString(),
      },
    ];

    // 6. Sauvegarder dans la DB
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        messages: updatedMessages,
        status: 'ACTIVE',
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Conversation updated with AI response for ${conversationId}`);

    // 7. Envoyer la réponse via l'API Messenger
    await this.sendMessageToPlatform(
      conversation.platform,
      sender.id,
      aiResponse,
    );

    return {
      conversationId,
      response: aiResponse,
      tokens: response.usage,
    };
  }

  /**
   * Envoyer un message via l'API Messenger
   */
  private async sendMessageToPlatform(
    platform: string,
    recipientId: string,
    message: string,
  ) {
    if (platform !== 'MESSENGER') {
      this.logger.log(`Platform ${platform} not supported yet for sending`);
      return;
    }

    const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN;

    if (!PAGE_ACCESS_TOKEN) {
      this.logger.error('❌ META_PAGE_ACCESS_TOKEN not set - cannot send response!');
      return;
    }

    try {
      this.logger.log(`📤 Sending message to Messenger user ${recipientId}...`);

      const url = 'https://graph.facebook.com/v18.0/me/messages';

      const response = await axios.post(
        url,
        {
          recipient: { id: recipientId },
          message: { text: message },
          messaging_type: 'RESPONSE',
        },
        {
          params: {
            access_token: PAGE_ACCESS_TOKEN,
          },
        },
      );

      this.logger.log(`✅ Message sent successfully to ${recipientId}`);
      return response.data;
    } catch (error: any) {
      this.logger.error('❌ Failed to send message to Messenger:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Qualifie un lead selon les critères du Setter
   */
  private async qualifyLead(data: QualifyLeadJob) {
    const { conversationId } = data;

    this.logger.log(`Qualifying lead for conversation ${conversationId}`);

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        setterConfig: true,
      },
    });

    if (!conversation || !this.anthropic) {
      return;
    }

    const messages = (conversation.messages as any[]) || [];

    // Construire le contexte de la conversation
    const conversationText = messages
      .map((msg: any) => `${msg.sender === 'USER' ? 'Prospect' : 'Setter'}: ${msg.content}`)
      .join('\n');

    // Demander à Claude d'évaluer la qualification
    const qualificationPrompt = `
Analyse cette conversation et détermine si le prospect est qualifié selon ces critères :
${JSON.stringify(conversation.setterConfig.qualificationCriteria, null, 2)}

Conversation:
${conversationText}

Réponds avec un score de 0 à 10 et une explication JSON structurée :
{
  "score": <number>,
  "isQualified": <boolean>,
  "reasons": [<array of reasons>],
  "nextSteps": "<recommended next action>"
}
`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: qualificationPrompt,
        },
      ],
    });

    const aiResponse = response.content[0].type === 'text'
      ? response.content[0].text
      : '{}';

    let qualification;
    try {
      // Extraire le JSON de la réponse
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      qualification = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (error) {
      this.logger.error('Failed to parse qualification response', error);
      return;
    }

    if (!qualification) {
      return;
    }

    // Créer ou mettre à jour le lead
    const minScore = typeof conversation.setterConfig.qualificationCriteria === 'object'
      ? (conversation.setterConfig.qualificationCriteria as any).minScore || 7
      : 7;

    const isQualified = qualification.score >= minScore;

    if (isQualified) {
      // Note: Vérifier que le modèle Lead existe dans votre schema
      // Sinon commentez cette partie
      try {
        await this.prisma.extractedLead.upsert({
          where: { conversationId },
          create: {
            conversationId,
            extractedData: qualification,
            qualificationScore: qualification.score,
            nextAction: qualification.nextSteps || 'Follow up',
          },
          update: {
            extractedData: qualification,
            qualificationScore: qualification.score,
            nextAction: qualification.nextSteps || 'Follow up',
          },
        });

        this.logger.log(`Lead qualified with score ${qualification.score}`);
      } catch (error) {
        this.logger.error('Failed to create/update lead:', error);
      }
    }

    return qualification;
  }
}