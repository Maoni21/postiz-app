import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { SetterAiService } from './setter-ai.service';
import { CreateSetterConfigDto, UpdateSetterConfigDto, ToggleSetterDto } from './setter-ai.dto';

/**
 * Contrôleur pour gérer les Setters IA
 * Route de base: /api/setter-ai
 */
@Controller('setter-ai')
export class SetterAiController {
  constructor(private readonly setterAiService: SetterAiService) {}

  /**
   * POST /api/setter-ai/configs
   * Créer une nouvelle configuration de Setter IA
   */
  @Post('configs')
  async createConfig(
    @Body() createDto: CreateSetterConfigDto,
    @Request() req: any,
  ) {
    try {
      // Récupérer l'organizationId depuis la requête authentifiée
      const organizationId = req.user?.organizationId || req.organizationId;

      if (!organizationId) {
        throw new HttpException(
          'Organization ID not found',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const config = await this.setterAiService.createSetterConfig({
        ...createDto,
        organization: {
          connect: { id: organizationId },
        },
      });

      return {
        success: true,
        data: config,
        message: 'Setter IA créé avec succès',
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Erreur lors de la création du Setter IA',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/setter-ai/configs
   * Récupérer toutes les configurations de l'organisation
   */
  @Get('configs')
  async getConfigs(@Request() req: any) {
    try {
      const organizationId = req.user?.organizationId || req.organizationId;

      if (!organizationId) {
        throw new HttpException(
          'Organization ID not found',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const configs = await this.setterAiService.getSetterConfigs(organizationId);

      return {
        success: true,
        data: configs,
        count: configs.length,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Erreur lors de la récupération des Setters IA',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/setter-ai/configs/:id
   * Récupérer une configuration spécifique avec ses conversations
   */
  @Get('configs/:id')
  async getConfig(@Param('id') id: string) {
    try {
      const config = await this.setterAiService.getSetterConfig(id);

      if (!config) {
        throw new HttpException(
          'Setter IA non trouvé',
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        data: config,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Erreur lors de la récupération du Setter IA',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * PUT /api/setter-ai/configs/:id
   * Mettre à jour une configuration
   */
  @Put('configs/:id')
  async updateConfig(
    @Param('id') id: string,
    @Body() updateDto: UpdateSetterConfigDto,
  ) {
    try {
      const config = await this.setterAiService.updateSetterConfig(id, updateDto);

      return {
        success: true,
        data: config,
        message: 'Setter IA mis à jour avec succès',
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Erreur lors de la mise à jour du Setter IA',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * DELETE /api/setter-ai/configs/:id
   * Supprimer une configuration (et toutes ses conversations/leads)
   */
  @Delete('configs/:id')
  async deleteConfig(@Param('id') id: string) {
    try {
      await this.setterAiService.deleteSetterConfig(id);

      return {
        success: true,
        message: 'Setter IA supprimé avec succès',
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Erreur lors de la suppression du Setter IA',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * PATCH /api/setter-ai/configs/:id/toggle
   * Activer ou désactiver un Setter
   */
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

      return {
        success: true,
        data: config,
        message: `Setter IA ${toggleDto.isActive ? 'activé' : 'désactivé'} avec succès`,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Erreur lors du changement de statut',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/setter-ai/configs/:id/stats
   * Récupérer les statistiques d'un Setter
   */
  @Get('configs/:id/stats')
  async getStats(@Param('id') id: string) {
    try {
      const stats = await this.setterAiService.getSetterStats(id);

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Erreur lors de la récupération des statistiques',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/setter-ai/configs/:id/conversations
   * Récupérer les conversations d'un Setter
   */
  @Get('configs/:id/conversations')
  async getConversations(@Param('id') id: string) {
    try {
      const conversations = await this.setterAiService.getConversations(id);

      return {
        success: true,
        data: conversations,
        count: conversations.length,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Erreur lors de la récupération des conversations',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/setter-ai/configs/:id/leads
   * Récupérer les leads qualifiés d'un Setter
   */
  @Get('configs/:id/leads')
  async getLeads(@Param('id') id: string) {
    try {
      const leads = await this.setterAiService.getQualifiedLeads(id);

      return {
        success: true,
        data: leads,
        count: leads.length,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Erreur lors de la récupération des leads',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
