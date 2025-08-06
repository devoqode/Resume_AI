import { config } from '../config';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Critical validations - will prevent server from starting
  if (!config.database.postgresql.url) {
    errors.push('DATABASE_URL is required but not set');
  }

  if (config.nodeEnv === 'production' && !config.openai.apiKey) {
    errors.push('OPENAI_API_KEY is required in production but not set');
  }

  if (config.nodeEnv === 'production' && !config.elevenlabs.apiKey) {
    errors.push('ELEVENLABS_API_KEY is required in production but not set');
  }

  if (
    config.nodeEnv === 'production' &&
    config.jwt.secret === 'ai-interview-app-secret-key-2025'
  ) {
    errors.push('JWT_SECRET must be set to a secure value in production');
  }

  // Warnings - won't prevent server from starting but should be addressed
  if (!config.openai.apiKey) {
    warnings.push('OPENAI_API_KEY is not set - AI features will be disabled');
  }

  if (!config.elevenlabs.apiKey) {
    warnings.push(
      'ELEVENLABS_API_KEY is not set - Voice features will be disabled'
    );
  }

  if (config.auth.bypassAuth && config.nodeEnv !== 'development') {
    warnings.push(
      'Authentication bypass is enabled in non-development environment'
    );
  }

  // CORS validation
  if (config.nodeEnv === 'production') {
    try {
      new URL(config.frontendUrl);
    } catch {
      warnings.push(`FRONTEND_URL (${config.frontendUrl}) is not a valid URL`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
