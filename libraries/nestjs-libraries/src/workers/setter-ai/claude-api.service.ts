import { Injectable, Logger } from '@nestjs/common';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeResponse {
  response: string;
  stopReason: string;
}

/**
 * Service pour interagir avec l'API Claude d'Anthropic
 * Documentation: https://docs.anthropic.com/claude/reference/messages_post
 */
@Injectable()
export class ClaudeApiService {
  private readonly logger = new Logger(ClaudeApiService.name);
  private readonly apiKey: string;
  private readonly apiUrl = 'https://api.anthropic.com/v1/messages';

  constructor() {
    this.apiKey = process.env.CLAUDE_API_KEY || '';
    
    if (!this.apiKey) {
      this.logger.warn('CLAUDE_API_KEY not set in environment variables');
    }
  }

  /**
   * Générer une réponse avec Claude
   * @param systemPrompt - Le prompt système (instructions pour le Setter IA)
   * @param conversationHistory - L'historique de la conversation
   * @param userMessage - Le nouveau message de l'utilisateur
   */
  async generateResponse(
    systemPrompt: string,
    conversationHistory: ClaudeMessage[],
    userMessage: string,
  ): Promise<ClaudeResponse> {
    try {
      this.logger.log('Calling Claude API...');

      // Construire les messages pour Claude
      const messages: ClaudeMessage[] = [
        ...conversationHistory,
        {
          role: 'user',
          content: userMessage,
        },
      ];

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022', // Le modèle le plus récent
          max_tokens: 1024,
          system: systemPrompt,
          messages,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        this.logger.error('Claude API error', error);
        throw new Error(`Claude API error: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();

      this.logger.log('Claude API response received');

      return {
        response: data.content[0].text,
        stopReason: data.stop_reason,
      };
    } catch (error) {
      this.logger.error('Error calling Claude API', error);
      throw error;
    }
  }

  /**
   * Qualifier un lead en utilisant Claude
   * Analyse la conversation et extrait les informations importantes
   */
  async qualifyLead(
    conversationHistory: ClaudeMessage[],
    qualificationCriteria: any,
  ): Promise<{
    isQualified: boolean;
    score: number;
    extractedInfo: any;
    reasoning: string;
  }> {
    try {
      this.logger.log('Qualifying lead with Claude...');

      const qualificationPrompt = `
Analyse cette conversation et détermine si le lead est qualifié selon ces critères :
${JSON.stringify(qualificationCriteria, null, 2)}

Conversation :
${conversationHistory.map((msg) => `${msg.role}: ${msg.content}`).join('\n')}

Réponds UNIQUEMENT avec un JSON valide au format suivant :
{
  "isQualified": true/false,
  "score": 0-10,
  "extractedInfo": {
    "name": "...",
    "email": "...",
    "phone": "...",
    "budget": "...",
    "motivation": "...",
    "timeline": "...",
    "painPoints": ["..."]
  },
  "reasoning": "Explication courte de la qualification"
}
`;

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: qualificationPrompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Claude API error: ${error.error?.message}`);
      }

      const data = await response.json();
      const qualificationResult = JSON.parse(data.content[0].text);

      this.logger.log(`Lead qualification: Score ${qualificationResult.score}/10`);

      return qualificationResult;
    } catch (error) {
      this.logger.error('Error qualifying lead', error);
      
      // Retourner un résultat par défaut en cas d'erreur
      return {
        isQualified: false,
        score: 0,
        extractedInfo: {},
        reasoning: 'Error during qualification',
      };
    }
  }
}
