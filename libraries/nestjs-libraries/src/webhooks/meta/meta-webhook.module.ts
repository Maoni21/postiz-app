import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MetaWebhookController } from './meta-webhook.controller';
import { MetaWebhookService } from './meta-webhook.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'setter-ai',
    }),
  ],
  controllers: [MetaWebhookController],
  providers: [MetaWebhookService],
  exports: [MetaWebhookService],
})
export class MetaWebhookModule {}
