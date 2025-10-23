import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConversationProcessor } from './conversation.processor';
import { ClaudeApiService } from './claude-api.service';
import { PrismaService } from '../../database/prisma/prisma.service';
import { MessengerWebhookModule } from '../../integrations/messenger/messenger-webhook.module';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
    }),
    BullModule.registerQueue({
      name: 'setter-ai-conversations',
    }),
    MessengerWebhookModule,
  ],
  providers: [
    ConversationProcessor,
    ClaudeApiService,
    PrismaService,
  ],
  exports: [ClaudeApiService],
})
export class SetterAiWorkerModule {}
