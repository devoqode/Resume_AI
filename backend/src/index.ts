import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import prisma from './lib/prisma';
import { createResumeRoutes } from './routes/resume.routes';
import { createInterviewRoutes } from './routes/interview.routes';
import { createVoiceRoutes } from './routes/voice.routes';
import { errorHandler, notFoundHandler, rateLimitErrorHandler } from './middleware/error.middleware';
import { authenticateToken, optionalAuth, generateToken } from './middleware/auth.middleware';
import { v4 as uuidv4 } from 'uuid';

const app = express();

// Create required directories
const requiredDirs = [
  './uploads',
  './uploads/resumes',
  './uploads/audio',
  './uploads/audio/tts',
  './uploads/audio/stt',
  './uploads/audio/responses',
  './database',
];

requiredDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: config.nodeEnv === 'production' ? config.frontendUrl : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Request parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting middleware (basic implementation)
const rateLimitMap = new Map();

const rateLimit = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const windowStart = now - config.rateLimit.windowMs;
  
  // Clean up old entries
  for (const [ip, timestamps] of rateLimitMap.entries()) {
    rateLimitMap.set(ip, timestamps.filter((timestamp: number) => timestamp > windowStart));
    if (rateLimitMap.get(ip).length === 0) {
      rateLimitMap.delete(ip);
    }
  }
  
  // Check current IP
  const clientRequests = rateLimitMap.get(clientIp) || [];
  
  if (clientRequests.length >= config.rateLimit.requests) {
    return rateLimitErrorHandler(req, res);
  }
  
  clientRequests.push(now);
  rateLimitMap.set(clientIp, clientRequests);
  
  next();
};

app.use(rateLimit);

// Health check endpoint
app.get('/health', (req: any, res: any) => {
  res.json({
    success: true,
    message: 'AI Interview Backend is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    version: '1.0.0',
    auth: {
      bypassEnabled: config.auth.bypassAuth,
    },
  });
});

// Authentication endpoints (for testing)
app.post('/api/auth/signup', async (req: any, res: any) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: firstName, lastName, email, password',
      });
    }

    const userId = uuidv4();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists',
      });
    }

    // Create user (in production, hash the password)
    const user = await prisma.user.create({
      data: {
        id: userId,
        email,
        firstName,
        lastName,
        phone: null
      }
    });

    // Generate JWT token
    const token = generateToken(userId, email, config.jwt.secret);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user account',
    });
  }
});

app.post('/api/auth/login', async (req: any, res: any) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // In production, verify password hash here
    // For testing, we'll accept any password

    // Generate JWT token
    const token = generateToken(user.id, user.email, config.jwt.secret);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
    });
  }
});

// Create test user endpoint (development only)
app.post('/api/auth/create-test-user', async (req: any, res: any) => {
  if (config.nodeEnv !== 'development' && !config.auth.bypassAuth) {
    return res.status(403).json({
      success: false,
      error: 'This endpoint is only available in development mode',
    });
  }

  try {
    const testUser = config.auth.testUser;

    // Check if test user already exists
    const existingUser = await prisma.user.findUnique({
      where: { id: testUser.id }
    });
    if (existingUser) {
      return res.json({
        success: true,
        message: 'Test user already exists',
        data: testUser,
      });
    }

    // Create test user
    await prisma.user.create({
      data: {
        id: testUser.id,
        email: testUser.email,
        firstName: testUser.firstName,
        lastName: testUser.lastName
      }
    });

    res.json({
      success: true,
      message: 'Test user created successfully',
      data: testUser,
    });
  } catch (error) {
    console.error('Error creating test user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create test user',
    });
  }
});

// API Routes
app.use('/api/resume', createResumeRoutes(config.openai.apiKey));
app.use('/api/interview', createInterviewRoutes(
  config.openai.apiKey,
  config.elevenlabs.apiKey,
  config.elevenlabs.voiceId
));
app.use('/api/voice', createVoiceRoutes(
  config.elevenlabs.apiKey,
  config.elevenlabs.voiceId,
  config.openai.apiKey
));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  setHeaders: (res: any, path: any) => {
    if (path.endsWith('.mp3') || path.endsWith('.wav')) {
      res.setHeader('Content-Type', 'audio/mpeg');
    }
  },
}));

// API documentation endpoint
app.get('/api', (req: any, res: any) => {
  res.json({
    success: true,
    message: 'AI Interview Web Application API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      auth: {
        signup: 'POST /api/auth/signup',
        login: 'POST /api/auth/login',
        createTestUser: 'POST /api/auth/create-test-user (dev only)',
      },
      resume: {
        upload: 'POST /api/resume/upload',
        getAll: 'GET /api/resume/user/:userId',
        getOne: 'GET /api/resume/:resumeId',
        delete: 'DELETE /api/resume/:resumeId',
        reparse: 'POST /api/resume/:resumeId/reparse',
        stats: 'GET /api/resume/user/:userId/stats',
      },
      interview: {
        start: 'POST /api/interview/start',
        submitResponse: 'POST /api/interview/response',
        complete: 'POST /api/interview/:sessionId/complete',
        getSession: 'GET /api/interview/:sessionId',
        getAllSessions: 'GET /api/interview/user/:userId',
        delete: 'DELETE /api/interview/:sessionId',
      },
      voice: {
        textToSpeech: 'POST /api/voice/tts',
        textToSpeechFile: 'POST /api/voice/tts/file',
        speechToText: 'POST /api/voice/stt',
        speechToTextVerbose: 'POST /api/voice/stt/verbose',
        getVoices: 'GET /api/voice/voices',
        getVoice: 'GET /api/voice/voices/:voiceId',
        serveAudio: 'GET /api/voice/audio/:filename',
        requirements: 'GET /api/voice/requirements',
        userInfo: 'GET /api/voice/user/info',
      },
    },
    features: {
      resumeParsing: 'Extract structured data from PDF, DOC, DOCX files',
      aiQuestionGeneration: 'Generate tailored interview questions based on experience',
      voiceInteraction: 'Text-to-speech and speech-to-text capabilities',
      responseEvaluation: 'AI-powered evaluation of interview responses',
      realTimeTranscription: 'Live transcription during interviews',
    },
  });
});

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize database and start server
async function startServer() {
  try {
    // Validate required API keys
    if (config.openai.apiKey === 'your_openai_api_key_here') {
      console.warn('⚠️  Warning: OpenAI API key not configured. Set OPENAI_API_KEY environment variable.');
    }
    
    if (config.elevenlabs.apiKey === 'your_elevenlabs_api_key_here') {
      console.warn('⚠️  Warning: ElevenLabs API key not configured. Set ELEVENLABS_API_KEY environment variable.');
    }

    // Initialize Prisma database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    // Start server
    const server = app.listen(config.port, () => {
      console.log(`🚀 AI Interview Backend running on port ${config.port}`);
      console.log(`📊 Environment: ${config.nodeEnv}`);
      console.log(`🌐 Health check: http://localhost:${config.port}/health`);
      console.log(`📖 API docs: http://localhost:${config.port}/api`);
      
      if (config.nodeEnv === 'development') {
        console.log(`🔗 CORS enabled for: ${config.frontendUrl}`);
      }
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
      
      server.close(async () => {
        console.log('📴 HTTP server closed');
        
        try {
          await prisma.$disconnect();
          console.log('🗃️  Database connection closed');
        } catch (error) {
          console.error('Error closing database:', error);
        }
        
        console.log('✅ Graceful shutdown complete');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;
