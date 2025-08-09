"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables from .env file
dotenv_1.default.config();
exports.config = {
    // Server Configuration
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || 'development',
    // Database Configuration - Using PostgreSQL from Render
    database: {
        // For production: Use PostgreSQL
        postgresql: {
            url: process.env.DATABASE_URL || (() => {
                console.error('FATAL: DATABASE_URL environment variable is required');
                process.exit(1);
            })(),
            host: process.env.DB_HOST || '',
            port: parseInt(process.env.DB_PORT || '5432'),
            database: process.env.DB_NAME || '',
            username: process.env.DB_USER || '',
            password: process.env.DB_PASSWORD || '',
        },
        // For development: Use SQLite
        sqlite: {
            path: process.env.SQLITE_PATH || './database/interview.db',
        }
    },
    // OpenAI Configuration
    openai: {
        apiKey: process.env.OPENAI_API_KEY || (() => {
            if (process.env.NODE_ENV === 'production') {
                console.error('FATAL: OPENAI_API_KEY environment variable is required in production');
                process.exit(1);
            }
            console.warn('WARNING: OPENAI_API_KEY environment variable is not set');
            return 'test-key-for-development';
        })(),
        model: process.env.OPENAI_MODEL || 'gpt-4o',
    },
    // ElevenLabs Configuration
    elevenlabs: {
        apiKey: process.env.ELEVENLABS_API_KEY || (() => {
            if (process.env.NODE_ENV === 'production') {
                console.error('FATAL: ELEVENLABS_API_KEY environment variable is required in production');
                process.exit(1);
            }
            console.warn('WARNING: ELEVENLABS_API_KEY environment variable is not set');
            return 'test-key-for-development';
        })(),
        voiceId: process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB', // Default Adam voice
    },
    // JWT Configuration
    jwt: {
        secret: process.env.JWT_SECRET || (() => {
            if (process.env.NODE_ENV === 'production') {
                console.error('FATAL: JWT_SECRET environment variable is required in production');
                process.exit(1);
            }
            console.warn('WARNING: Using default JWT secret. Set JWT_SECRET environment variable.');
            return 'ai-interview-app-secret-key-2025';
        })(),
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
    // Auth bypass for testing (only in development)
    auth: {
        bypassAuth: process.env.BYPASS_AUTH === 'true' && process.env.NODE_ENV === 'development',
        testUser: {
            id: 'test-user-123',
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
        }
    }
};
//# sourceMappingURL=config.js.map