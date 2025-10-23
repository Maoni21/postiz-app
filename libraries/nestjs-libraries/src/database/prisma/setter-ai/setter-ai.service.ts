import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SetterConfig, Prisma } from '@prisma/client';

@Injectable()
export class SetterAiService {
  constructor(private prisma: PrismaService) {}

  /**
   * Créer une nouvelle configuration de Setter IA
   */
  async createSetterConfig(
    data: Prisma.SetterConfigCreateInput
  ): Promise<SetterConfig> {
    return this.prisma.setterConfig.create({
      data,
    });
  }

  /**
   * Récupérer toutes les configurations de Setter d'une organisation
   */
  async getSetterConfigs(organizationId: string): Promise<SetterConfig[]> {
    return this.prisma.setterConfig.findMany({
      where: {
        organizationId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Récupérer une configuration spécifique
   */
  async getSetterConfig(id: string): Promise<SetterConfig | null> {
    return this.prisma.setterConfig.findUnique({
      where: { id },
      include: {
        conversations: {
          take: 10,
          orderBy: {
            updatedAt: 'desc',
          },
        },
      },
    });
  }

  /**
   * Mettre à jour une configuration
   */
  async updateSetterConfig(
    id: string,
    data: Prisma.SetterConfigUpdateInput
  ): Promise<SetterConfig> {
    return this.prisma.setterConfig.update({
      where: { id },
      data,
    });
  }

  /**
   * Supprimer une configuration (cascade: supprime aussi conversations et leads)
   */
  async deleteSetterConfig(id: string): Promise<SetterConfig> {
    return this.prisma.setterConfig.delete({
      where: { id },
    });
  }

  /**
   * Activer/désactiver un Setter
   */
  async toggleSetterActive(id: string, isActive: boolean): Promise<SetterConfig> {
    return this.prisma.setterConfig.update({
      where: { id },
      data: { isActive },
    });
  }

  /**
   * Créer une nouvelle conversation
   */
  async createConversation(
    data: Prisma.ConversationCreateInput
  ) {
    return this.prisma.conversation.create({
      data,
    });
  }

  /**
   * Récupérer les conversations d'un Setter
   */
  async getConversations(setterConfigId: string, status?: string) {
    return this.prisma.conversation.findMany({
      where: {
        setterConfigId,
        ...(status && { status }),
      },
      include: {
        extractedLeads: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  /**
   * Mettre à jour une conversation (ajouter des messages)
   */
  async updateConversation(
    id: string,
    messages: any,
    status?: string
  ) {
    return this.prisma.conversation.update({
      where: { id },
      data: {
        messages,
        ...(status && { status }),
      },
    });
  }

  /**
   * Créer un lead qualifié
   */
  async createExtractedLead(
    data: Prisma.ExtractedLeadCreateInput
  ) {
    return this.prisma.extractedLead.create({
      data,
    });
  }

  /**
   * Récupérer les leads qualifiés d'un Setter
   */
  async getQualifiedLeads(setterConfigId: string) {
    return this.prisma.extractedLead.findMany({
      where: {
        conversation: {
          setterConfigId,
        },
        qualificationScore: {
          gte: 7, // Score minimum de 7/10
        },
      },
      include: {
        conversation: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Marquer un lead comme ayant un RDV booké
   */
  async markLeadAsBooked(
    id: string,
    meetingLink: string
  ) {
    return this.prisma.extractedLead.update({
      where: { id },
      data: {
        bookedAt: new Date(),
        meetingLink,
        nextAction: 'booked',
      },
    });
  }

  /**
   * Statistiques d'un Setter
   */
  async getSetterStats(setterConfigId: string) {
    const [
      totalConversations,
      activeConversations,
      qualifiedLeads,
      bookedMeetings,
    ] = await Promise.all([
      this.prisma.conversation.count({
        where: { setterConfigId },
      }),
      this.prisma.conversation.count({
        where: {
          setterConfigId,
          status: 'active',
        },
      }),
      this.prisma.extractedLead.count({
        where: {
          conversation: { setterConfigId },
          qualificationScore: { gte: 7 },
        },
      }),
      this.prisma.extractedLead.count({
        where: {
          conversation: { setterConfigId },
          bookedAt: { not: null },
        },
      }),
    ]);

    return {
      totalConversations,
      activeConversations,
      qualifiedLeads,
      bookedMeetings,
      conversionRate:
        totalConversations > 0
          ? ((bookedMeetings / totalConversations) * 100).toFixed(2)
          : '0',
    };
  }
}