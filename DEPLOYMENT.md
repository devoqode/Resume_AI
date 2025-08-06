# Deployment Guide - Render.com

This guide explains how to deploy the AI Interview Platform to Render.com using the included `render.yaml` configuration.

## Prerequisites

1. **Render Account**: Sign up at [render.com](https://render.com)
2. **API Keys**: Obtain the following API keys:
   - OpenAI API Key from [OpenAI Platform](https://platform.openai.com/api-keys)
   - ElevenLabs API Key from [ElevenLabs](https://elevenlabs.io/)

## Deployment Steps

### 1. Connect Repository

1. Go to your Render Dashboard
2. Click "New +" → "Blueprint"
3. Connect your GitHub repository: `https://github.com/devoqode/Resume_AI`
4. Render will automatically detect the `render.yaml` file

### 2. Configure Environment Variables

**Important**: Set these environment variables in the Render Dashboard for the backend service:

#### Required Environment Variables (Backend)
```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# ElevenLabs Configuration  
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# JWT Security
JWT_SECRET=your_secure_random_jwt_secret_here
```

#### How to Set Environment Variables:
1. Go to your backend service in Render Dashboard
2. Navigate to "Environment" tab
3. Add the environment variables listed above
4. Click "Save Changes"

### 3. Deploy Services

After connecting the repository and setting environment variables:

1. **Backend Service** (`resume-ai-backend`) will deploy first
2. **Frontend Service** (`resume-ai-frontend`) will deploy after backend is ready
3. Both services will be available at:
   - Backend: `https://resume-ai-backend.onrender.com`
   - Frontend: `https://resume-ai-frontend.onrender.com`

### 4. Update Service URLs (if needed)

If your service names differ from the default, update these files:

**Frontend API URL** (`frontend/.env`):
```bash
VITE_API_BASE_URL=https://your-actual-backend-url.onrender.com
```

**Backend CORS URL** (set in Render dashboard):
```bash
FRONTEND_URL=https://your-actual-frontend-url.onrender.com
```

## Service Configuration

### Backend Service
- **Type**: Web Service
- **Build**: `npm install && npm run build`
- **Start**: `npm start`
- **Health Check**: `/health`
- **Port**: 5000

### Frontend Service
- **Type**: Static Site
- **Build**: `npm install && npm run build`
- **Publish**: `./dist`
- **Routes**: SPA routing enabled

## Environment Variables Reference

### Backend Required Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `ELEVENLABS_API_KEY` | ElevenLabs API key | `sk_...` |
| `JWT_SECRET` | JWT signing secret | `your-secret-key` |

### Backend Optional Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_MODEL` | OpenAI model | `gpt-4o` |
| `ELEVENLABS_VOICE_ID` | Default voice | `pNInz6obpgDQGcFmaJgB` |
| `FRONTEND_URL` | Frontend URL for CORS | Auto-detected |
| `MAX_FILE_SIZE` | Max upload size | `10485760` (10MB) |

### Frontend Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API URL | `https://backend.onrender.com` |

## Database Configuration

The application uses SQLite by default, which is suitable for development and small-scale production. For larger deployments, consider upgrading to PostgreSQL:

1. Uncomment the database section in `render.yaml`
2. Update backend configuration to use `DATABASE_URL`
3. Run database migrations after deployment

## Monitoring & Troubleshooting

### Health Checks
- Backend health: `https://your-backend.onrender.com/health`
- API documentation: `https://your-backend.onrender.com/api`

### Common Issues

1. **Build Failures**:
   - Check Node.js version compatibility
   - Verify all dependencies are in `package.json`
   - Review build logs in Render dashboard

2. **API Connection Issues**:
   - Verify `VITE_API_BASE_URL` matches backend URL
   - Check CORS configuration with `FRONTEND_URL`

3. **File Upload Issues**:
   - Ensure persistent disk is configured for backend
   - Check file size limits and upload directory permissions

4. **API Key Errors**:
   - Verify all required environment variables are set
   - Check API key validity and quotas

### Performance Optimization

1. **Frontend**:
   - Static assets are automatically cached
   - Gzip compression enabled
   - CDN distribution via Render

2. **Backend**:
   - Rate limiting configured (100 req/15min)
   - Request/response compression
   - Health check monitoring

## Scaling Considerations

### Starter Plan Limits
- **Backend**: 512 MB RAM, 0.1 CPU
- **Frontend**: 100 GB bandwidth/month
- **Storage**: 1 GB persistent disk

### Upgrade Options
- **Standard Plan**: More resources and better performance
- **PostgreSQL Database**: For production workloads
- **Background Jobs**: For intensive file processing

## Security Features

### Backend Security
- Helmet security headers
- CORS protection
- Rate limiting
- JWT token authentication
- Input validation and sanitization

### Frontend Security
- Content Security Policy headers
- XSS protection
- Frame options
- Secure cookie handling

## Support

If you encounter issues during deployment:

1. Check the [Render Documentation](https://render.com/docs)
2. Review service logs in Render Dashboard
3. Verify environment variables are set correctly
4. Test API endpoints using the health check URLs

## Cost Estimation

### Monthly Costs (Starter Plan)
- Backend Service: $7/month
- Frontend Service: $0 (free tier available)
- Total: ~$7/month

### Additional Costs
- Database (PostgreSQL): $7/month
- Background Workers: $7/month each
- Bandwidth overages: $0.10/GB

---

**Note**: Update this document with actual service URLs after deployment is complete.