import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MessengerWebhookController } from './messenger-webhook.controller';
import { MessengerWebhookService } from './messenger-webhook.service';
import { PrismaService } from '../../database/prisma/prisma.service';

@Module({
  imports: [
    // Configuration de la queue BullMQ pour traiter les conversations
    BullModule.registerQueue({
      name: 'setter-ai-conversations',
    }),
  ],
  controllers: [MessengerWebhookController],
  providers: [MessengerWebhookService, PrismaService],
  exports: [MessengerWebhookService],
})
export class MessengerWebhookModule {}
