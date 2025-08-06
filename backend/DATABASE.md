# Database Setup with Prisma + PostgreSQL

This project uses **Prisma ORM** with **PostgreSQL** for robust, type-safe database operations.

## Quick Setup

### 1. Environment Configuration

Set your database URL in `.env`:

```bash
DATABASE_URL="postgresql://username:password@host:5432/database_name?schema=public"
```

### 2. Database Operations

```bash
# Generate Prisma Client
npm run postinstall

# Deploy migrations (Production)
npm run db:deploy

# Development migrations
npm run db:migrate

# View database in Prisma Studio
npm run db:studio

# Reset database (Development only)
npm run db:reset
```

## Schema Overview

### Core Tables

- **users**: User accounts and profiles
- **resumes**: Uploaded resumes with parsed data (JSON)
- **interview_sessions**: Interview metadata and scoring
- **interview_questions**: AI-generated questions per session
- **interview_responses**: User responses with AI evaluation (JSON)
- **voice_profiles**: ElevenLabs voice settings (JSON)

### Key Features

- **Type Safety**: Auto-generated TypeScript types
- **Relations**: Proper foreign key constraints with cascade deletes
- **JSON Fields**: Flexible data storage for parsed content and AI responses
- **Timestamps**: Automatic created_at and updated_at tracking
- **Indexes**: Optimized for common query patterns

## Migration Strategy

### Production Deployment

```bash
# 1. Deploy migrations
npm run db:deploy

# 2. Generate client
npm run postinstall

# 3. Start application
npm start
```

### Development Workflow

```bash
# 1. Modify schema.prisma
# 2. Create migration
npm run db:migrate

# 3. Client is auto-generated
```

## Prisma vs Previous SQLite Setup

| Feature | SQLite (Old) | Prisma + PostgreSQL (New) |
|---------|--------------|----------------------------|
| **Type Safety** | Manual types | Auto-generated |
| **Queries** | Raw SQL | Type-safe API |
| **Migrations** | Manual CREATE statements | Version controlled |
| **Relations** | Manual joins | Automatic |
| **Performance** | File-based | Connection pooling |
| **Scalability** | Limited | Production-ready |
| **Development** | Manual setup | Auto-completion |

## Schema Changes

To modify the database schema:

1. Edit `prisma/schema.prisma`
2. Run `npm run db:migrate` (development)
3. Or `npm run db:deploy` (production)
4. Client types are automatically updated

## Troubleshooting

### Connection Issues
- Verify DATABASE_URL format
- Check PostgreSQL server is running
- Confirm credentials and permissions

### Migration Errors
- Check for breaking changes in schema
- Review migration files in `prisma/migrations/`
- Use `npm run db:reset` in development

### Type Errors
- Run `npx prisma generate` to update client
- Restart TypeScript language server
- Check Prisma schema syntax

## Production Considerations

- **Connection Pooling**: Prisma handles automatically
- **Performance**: Indexes are included in schema
- **Security**: Use connection strings with SSL
- **Backup**: Regular PostgreSQL backups recommended
- **Monitoring**: Enable Prisma query logging

---

**Migration Complete**: Your project now uses Prisma + PostgreSQL instead of custom SQLite implementation.