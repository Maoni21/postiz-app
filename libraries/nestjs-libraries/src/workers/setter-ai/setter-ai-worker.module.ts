import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SetterAiWorker } from './setter-ai.worker';
import { PrismaService } from '../../database/prisma/prisma.service';

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
      name: 'setter-ai',
    }),
  ],
  providers: [
    SetterAiWorker,
    PrismaService,
  ],
})
export class SetterAiWorkerModule {}