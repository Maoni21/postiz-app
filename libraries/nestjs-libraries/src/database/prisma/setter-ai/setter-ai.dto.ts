import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsObject, MinLength } from 'class-validator';

/**
 * DTO pour créer une configuration de Setter IA
 */
export class CreateSetterConfigDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name: string;

  @IsString()
  @IsNotEmpty()
  persona: string;

  @IsString()
  @IsNotEmpty()
  systemPrompt: string;

  @IsObject()
  @IsNotEmpty()
  qualificationCriteria: {
    budget_min?: number;
    motivation_min?: number;
    [key: string]: any;
  };

  @IsString()
  @IsOptional()
  calendarType?: string;

  @IsString()
  @IsOptional()
  calendarCredentials?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

/**
 * DTO pour mettre à jour une configuration
 */
export class UpdateSetterConfigDto {
  @IsString()
  @IsOptional()
  @MinLength(3)
  name?: string;

  @IsString()
  @IsOptional()
  persona?: string;

  @IsString()
  @IsOptional()
  systemPrompt?: string;

  @IsObject()
  @IsOptional()
  qualificationCriteria?: {
    budget_min?: number;
    motivation_min?: number;
    [key: string]: any;
  };

  @IsString()
  @IsOptional()
  calendarType?: string;

  @IsString()
  @IsOptional()
  calendarCredentials?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

/**
 * DTO pour activer/désactiver un Setter
 */
export class ToggleSetterDto {
  @IsBoolean()
  @IsNotEmpty()
  isActive: boolean;
}
