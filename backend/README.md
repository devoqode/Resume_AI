# AI Interview Backend

A Node.js/Express backend for the AI Interview Web Application that integrates with OpenAI for resume parsing and question generation, plus ElevenLabs for conversational AI capabilities.

## Features

- **Resume Processing**: Extract text from PDF, DOC, DOCX files and parse with OpenAI
- **AI Question Generation**: Generate tailored interview questions based on work experience  
- **Voice Interaction**: Text-to-speech (ElevenLabs) and speech-to-text (OpenAI Whisper)
- **Response Evaluation**: AI-powered assessment of interview responses
- **Real-time Transcription**: Live transcription during interviews
- **Database Management**: SQLite database for user data, interviews, and responses

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: SQLite with custom query builder
- **AI Services**: 
  - OpenAI GPT-4 for parsing and evaluation
  - OpenAI Whisper for speech-to-text
  - ElevenLabs for text-to-speech
- **File Processing**: PDF-parse, Mammoth (DOCX), custom file handlers
- **Security**: Helmet, CORS, rate limiting, JWT authentication

## Quick Start

### 1. Prerequisites

- Node.js 18+ and npm
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))
- ElevenLabs API key ([Get one here](https://elevenlabs.io/))

### 2. Installation

```bash
cd backend
npm install
```

### 3. Configuration

Copy the configuration template:

```bash
cp config.example.ts config.ts
```

Edit `config.ts` with your API keys and settings, or set environment variables:

```bash
export OPENAI_API_KEY="your_openai_api_key_here"
export ELEVENLABS_API_KEY="your_elevenlabs_api_key_here"
export ELEVENLABS_VOICE_ID="your_preferred_voice_id"
export JWT_SECRET="your_jwt_secret_here"
```

### 4. Start Development Server

```bash
npm run dev
```

The server will start on http://localhost:5000

### 5. Health Check

Visit http://localhost:5000/health to verify the server is running.

## API Endpoints

### Health & Documentation
- `GET /health` - Server health check
- `GET /api` - API documentation and endpoint list

### Resume Management
- `POST /api/resume/upload` - Upload and parse resume file
- `GET /api/resume/user/:userId` - Get user's resumes
- `GET /api/resume/:resumeId` - Get specific resume details
- `DELETE /api/resume/:resumeId` - Delete resume
- `POST /api/resume/:resumeId/reparse` - Re-parse existing resume
- `GET /api/resume/user/:userId/stats` - Get parsing statistics

### Interview Management
- `POST /api/interview/start` - Start new interview session
- `POST /api/interview/response` - Submit response (with optional audio)
- `POST /api/interview/:sessionId/complete` - Complete interview and get results
- `GET /api/interview/:sessionId` - Get interview session details
- `GET /api/interview/user/:userId` - Get user's interview sessions
- `DELETE /api/interview/:sessionId` - Delete interview session

### Voice Services
- `POST /api/voice/tts` - Convert text to speech (returns audio)
- `POST /api/voice/tts/file` - Convert text to speech (saves file)
- `POST /api/voice/stt` - Convert speech to text
- `POST /api/voice/stt/verbose` - Convert speech to text (detailed)
- `GET /api/voice/voices` - Get available voices
- `GET /api/voice/voices/:voiceId` - Get voice details
- `GET /api/voice/audio/:filename` - Serve audio files
- `GET /api/voice/requirements` - Get audio requirements/limits

## File Upload Limits

- **Resumes**: PDF, DOC, DOCX files up to 10MB
- **Audio**: MP3, WAV, M4A, WebM files up to 25MB (Whisper limit)

## Database Schema

The application uses SQLite with the following main tables:

- `users` - User profiles
- `resumes` - Uploaded resumes and parsed data
- `interview_sessions` - Interview session metadata
- `interview_questions` - Generated questions for each session
- `interview_responses` - User responses and AI evaluations
- `voice_profiles` - ElevenLabs voice configurations

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `NODE_ENV` | Environment mode | development |
| `DATABASE_URL` | SQLite database path | ./database/interview.db |
| `OPENAI_API_KEY` | OpenAI API key | Required |
| `OPENAI_MODEL` | OpenAI model to use | gpt-4o |
| `ELEVENLABS_API_KEY` | ElevenLabs API key | Required |
| `ELEVENLABS_VOICE_ID` | Default voice ID | pNInz6obpgDQGcFmaJgB |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_EXPIRES_IN` | JWT expiration time | 7d |
| `FRONTEND_URL` | Frontend URL for CORS | http://localhost:5173 |
| `RATE_LIMIT_REQUESTS` | Rate limit requests per window | 100 |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in milliseconds | 900000 |

## Development Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm start           # Start production server (requires build)
```

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/endpoint"
}
```

## Rate Limiting

- Default: 100 requests per 15-minute window per IP
- Configurable via environment variables
- Returns 429 status when exceeded

## Security Features

- **Helmet**: Security headers
- **CORS**: Configurable cross-origin requests
- **Rate Limiting**: Basic IP-based rate limiting
- **JWT Authentication**: Token-based authentication (optional)
- **File Validation**: Strict file type and size validation
- **Input Sanitization**: Request validation and sanitization

## Testing

Test the API endpoints using curl, Postman, or similar tools:

```bash
# Health check
curl http://localhost:5000/health

# Upload resume
curl -X POST -F "resume=@path/to/resume.pdf" -F "userId=test-user-id" http://localhost:5000/api/resume/upload

# Text to speech
curl -X POST -H "Content-Type: application/json" -d '{"text":"Hello world"}' http://localhost:5000/api/voice/tts --output speech.mp3
```

## Production Deployment

1. Build the application: `npm run build`
2. Set production environment variables
3. Use a process manager like PM2 or Docker
4. Configure reverse proxy (nginx) for static files and SSL
5. Set up monitoring and logging
6. Configure database backups

## Troubleshooting

### Common Issues

1. **File upload fails**: Check file size limits and supported formats
2. **OpenAI errors**: Verify API key and model availability
3. **ElevenLabs errors**: Check API key and voice ID
4. **Database errors**: Ensure write permissions and disk space
5. **CORS issues**: Verify frontend URL configuration

### Logs

Development logs are output to console. In production, consider using a logging service like Winston or similar.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.
