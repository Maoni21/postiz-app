import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { SetterAiService } from './setter-ai.service';
import { CreateSetterConfigDto, UpdateSetterConfigDto, ToggleSetterDto } from './setter-ai.dto';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

@Controller('setter-ai')
export class SetterAiController {
  constructor(
    private readonly setterAiService: SetterAiService,
    @InjectQueue('setter-ai') private setterAiQueue: Queue,
    private prisma: PrismaService,
  ) {}

  @Post('configs')
  async createConfig(
    @Body() createDto: CreateSetterConfigDto,
    @GetOrgFromRequest() organization: Organization,
  ) {
    try {
      console.log('CREATE SETTER - organizationId:', organization.id);
      console.log('CREATE SETTER - body:', createDto);

      const config = await this.setterAiService.createSetterConfig({
        ...createDto,
        organizationId: organization.id,
      });

      return config;
    } catch (error: any) {
      console.error('ERROR CREATE SETTER:', error);
      throw new HttpException(
        error.message || 'Erreur lors de la création du Setter IA',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('configs')
  async getConfigs(@GetOrgFromRequest() organization: Organization) {
    try {
      console.log('GET CONFIGS - organizationId:', organization.id);
      const configs = await this.setterAiService.getSetterConfigs(organization.id);
      return configs;
    } catch (error: any) {
      console.error('ERROR GET CONFIGS:', error);
      throw new HttpException(
        error.message || 'Erreur lors de la récupération des Setters IA',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('configs/:id')
  async getConfig(@Param('id') id: string) {
    try {
      const config = await this.setterAiService.getSetterConfig(id);
      if (!config) {
        throw new HttpException('Setter IA non trouvé', HttpStatus.NOT_FOUND);
      }
      return config;
    } catch (error: any) {
      console.error('ERROR GET CONFIG:', error);
      throw new HttpException(
        error.message || 'Erreur lors de la récupération du Setter IA',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('configs/:id')
  async updateConfig(
    @Param('id') id: string,
    @Body() updateDto: UpdateSetterConfigDto,
  ) {
    try {
      const config = await this.setterAiService.updateSetterConfig(id, updateDto);
      return config;
    } catch (error: any) {
      console.error('ERROR UPDATE CONFIG:', error);
      throw new HttpException(
        error.message || 'Erreur lors de la mise à jour du Setter IA',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('configs/:id')
  async deleteConfig(@Param('id') id: string) {
    try {
      await this.setterAiService.deleteSetterConfig(id);
      return { success: true };
    } catch (error: any) {
      console.error('ERROR DELETE CONFIG:', error);
      throw new HttpException(
        error.message || 'Erreur lors de la suppression du Setter IA',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('configs/:id/toggle')
  async toggleConfig(
    @Param('id') id: string,
    @Body() toggleDto: ToggleSetterDto,
  ) {
    try {
      const config = await this.setterAiService.toggleSetterActive(
        id,
        toggleDto.isActive,
      );
      return config;
    } catch (error: any) {
      console.error('ERROR TOGGLE CONFIG:', error);
      throw new HttpException(
        error.message || 'Erreur lors du changement de statut',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('configs/:id/stats')
  async getStats(@Param('id') id: string) {
    try {
      const stats = await this.setterAiService.getSetterStats(id);
      return stats;
    } catch (error: any) {
      console.error('ERROR GET STATS:', error);
      throw new HttpException(
        error.message || 'Erreur lors de la récupération des statistiques',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('configs/:id/conversations')
  async getConversations(@Param('id') id: string) {
    try {
      const conversations = await this.setterAiService.getConversations(id);
      return conversations;
    } catch (error: any) {
      console.error('ERROR GET CONVERSATIONS:', error);
      throw new HttpException(
        error.message || 'Erreur lors de la récupération des conversations',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('configs/:id/leads')
  async getLeads(@Param('id') id: string) {
    try {
      const leads = await this.setterAiService.getQualifiedLeads(id);
      return leads;
    } catch (error: any) {
      console.error('ERROR GET LEADS:', error);
      throw new HttpException(
        error.message || 'Erreur lors de la récupération des leads',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================
  // ENDPOINTS DE TEST
  // ============================================

  @Post('test/send-message')
  async testSendMessage(
    @Body() body: { setterId: string; message: string },
  ) {
    try {
      // Récupérer le Setter
      const setter = await this.setterAiService.getSetterConfig(body.setterId);

      if (!setter) {
        throw new HttpException('Setter not found', HttpStatus.NOT_FOUND);
      }

      // Créer ou récupérer une conversation de test
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
            platformUserId: 'test_user',
            platformConversationId: 'test_conv_' + Date.now(),
            status: 'ACTIVE',
          },
        });
      }

      // Envoyer au worker
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
        error.message || 'Erreur lors de l\'envoi du message',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('test/conversation/:id')
  async getTestConversation(@Param('id') id: string) {
    try {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
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
