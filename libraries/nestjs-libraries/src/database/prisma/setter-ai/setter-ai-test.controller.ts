import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { SetterAiService } from './setter-ai.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

@Controller('setter-ai-test')
export class SetterAiTestController {
  constructor(
    private readonly setterAiService: SetterAiService,
    @InjectQueue('setter-ai') private setterAiQueue: Queue,
    private prisma: PrismaService,
  ) {}

  @Post('send-message')
  async testSendMessage(
    @Body() body: { setterId: string; message: string },
  ) {
    try {
      const setter = await this.setterAiService.getSetterConfig(body.setterId);

      if (!setter) {
        throw new HttpException('Setter not found', HttpStatus.NOT_FOUND);
      }

      let conversation = await this.prisma.conversation.findFirst({
        where: {
          setterConfigId: body.setterId,
          platformUserId: 'test_user',
        },
      });

      if (!conversation) {
        conversation = await this.prisma.conversation.create({
          data: {
            setterConfigId: body.setterId,
            platform: 'TEST',
            prospectId: 'test_user', // ← Obligatoire
            prospectUsername: 'Test User', // ← Au cas où
            platformUserId: 'test_user',
            platformConversationId: 'test_conv_' + Date.now(),
            status: 'ACTIVE',
            messages: [], // ← Si c'est un champ JSON array
          },
        });
      }
      const job = await this.setterAiQueue.add('process-message', {
        conversationId: conversation.id,
        message: body.message,
        sender: {
          id: 'test_user',
          name: 'Test User',
        },
      });

      return {
        success: true,
        conversationId: conversation.id,
        jobId: job.id,
        message: 'Message envoyé au worker pour traitement',
      };
    } catch (error: any) {
      console.error('ERROR TEST MESSAGE:', error);
      throw new HttpException(
        error.message || 'Erreur',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('conversation/:id')
  async getTestConversation(@Param('id') id: string) {
    try {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id },
        include: {
          setterConfig: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!conversation) {
        throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND);
      }

      return conversation;
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Erreur',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}