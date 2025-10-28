import { Module } from '@nestjs/common';
import { SetterAiController } from './setter-ai.controller';
import { SetterAiService } from './setter-ai.service';
import { BullModule } from '@nestjs/bullmq';
import { SetterAiTestController } from './setter-ai-test.controller';


@Module({
  imports: [
    BullModule.registerQueue({
      name: 'setter-ai',
    }),
  ],
  controllers: [SetterAiController , SetterAiTestController],
  providers: [SetterAiService],
  exports: [SetterAiService, BullModule], // ← AJOUTÉ BullModule ici
})
export class SetterAiModule {}