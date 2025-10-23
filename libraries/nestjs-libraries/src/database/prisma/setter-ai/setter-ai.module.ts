import { Module } from '@nestjs/common';
import { SetterAiService } from './setter-ai.service';
import { SetterAiController } from './setter-ai.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [SetterAiController],
  providers: [PrismaService, SetterAiService],
  exports: [SetterAiService],
})
export class SetterAiModule {}