// Copy this file to config.ts and fill in your actual values
export const config = {
  // Server Configuration
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  databaseUrl: process.env.DATABASE_URL || './database/interview.db',
  
  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY || 'your_openai_api_key_here',
    model: process.env.OPENAI_MODEL || 'gpt-4o',
  },
  
  // ElevenLabs Configuration
  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY || 'your_elevenlabs_api_key_here',
    voiceId: process.env.ELEVENLABS_VOICE_ID || 'your_preferred_voice_id_here',
  },
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret_here',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  // File Upload Configuration
  fileUpload: {
    maxSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
    uploadPath: process.env.UPLOAD_PATH || './uploads',
  },
  
  // CORS Configuration
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  
  // Rate Limiting
  rateLimit: {
    requests: parseInt(process.env.RATE_LIMIT_REQUESTS || '100'),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  },
};
