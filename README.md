# RAYE

**RAYE** is a comprehensive code analysis and learning platform that helps developers understand, explore, and rebuild projects through AI-powered explanations and interactive visualizations.

## 🚀 Features

- **Repository Import**: Clone and analyze GitHub repositories
- **Code Explorer**: Interactive file tree with syntax highlighting
- **Dependency Graphs**: Visualize project dependencies with Cytoscape
- **AI Explanations**: Get code explanations at multiple depth levels using Gemini AI
- **Rebuild Guides**: Step-by-step guides to recreate projects from scratch
- **Progressive Analysis**: Security, performance, and code-quality analysis
- **Real-time Status**: Track analysis progress and repository health

## 🛠️ Tech Stack

### Backend
- **NestJS** - Node.js framework
- **Prisma** - ORM with PostgreSQL
- **Redis** - Caching and queue management
- **Bull** - Background job processing
- **Gemini AI** - Code explanations
- **JWT** - Authentication
- **Simple Git** - Repository cloning

### Frontend
- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Shiki** - Syntax highlighting
- **Cytoscape** - Dependency visualization
- **React Context** - State management

## 📋 Quick Start

Get RAYE running in just 4 steps:

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Environment Setup
Copy the example environment file and fill in your API keys:

```bash
cp apps/api/.env.example apps/api/.env
```

**Required Environment Variables:**
- `DATABASE_URL` - Supabase PostgreSQL connection string
- `JWT_SECRET` & `JWT_REFRESH_SECRET` - Generate with `openssl rand -base64 32`
- `REDIS_URL` - Redis connection string (Upstash, Redis Cloud, or local)
- `GEMINI_API_KEY` - Google AI Studio API key for Gemini 2.0 Flash

**Where to get the values:**
- **Supabase**: https://supabase.com/dashboard → Project Settings → Database
- **Redis**: https://upstash.com/ or https://redis.com/
- **Gemini AI**: https://aistudio.google.com/app/apikey

### 3. Database Setup
```bash
pnpm db:migrate
pnpm db:seed
```

### 4. Start Development
```bash
pnpm dev
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## 🎯 User Flow

1. **Register/Login** - Create an account or sign in
2. **Import Repository** - Add a GitHub repository URL
3. **Explore Code** - Browse files with syntax highlighting
4. **Get AI Explanations** - Select depth level (1-5) for code explanations
5. **View Dependencies** - Interactive dependency graph visualization
6. **Follow Rebuild Guide** - Step-by-step project recreation guide

## 📁 Project Structure

```
RAYE/
├── apps/
│   ├── api/                 # NestJS backend
│   │   ├── src/
│   │   │   ├── auth/        # JWT authentication
│   │   │   ├── analysis/    # Dependency graphs & rebuild guides
│   │   │   ├── ai/          # Gemini AI integration
│   │   │   ├── cache/       # Redis caching
│   │   │   ├── files/       # File management
│   │   │   ├── github/      # Repository cloning
│   │   │   ├── health/      # Health checks
│   │   │   ├── queues/      # Background jobs
│   │   │   └── redis/       # Redis connection
│   │   └── prisma/          # Database schema
│   └── web/                 # Next.js frontend
│       ├── app/
│       │   ├── projects/[id]/  # Project pages
│       │   ├── dashboard/     # Repository dashboard
│       │   └── auth/         # Authentication pages
│       ├── components/       # Reusable components
│       └── lib/             # Utilities and API client
├── package.json             # Root scripts and dependencies
└── README.md               # This file
```

## 🗄️ Database Schema

The application uses PostgreSQL with the following main models:

- **User** - Authentication and user management
- **Repository** - Imported GitHub repositories
- **ProjectFile** - Stored file contents
- **Analysis** - Background analysis jobs
- **Explanation** - AI-generated code explanations
- **RebuildGuide** - Step-by-step rebuild guides
- **Session** - User authentication sessions

## 🔧 Available Scripts

```bash
# Development
pnpm dev              # Start both API and web in development mode
pnpm build            # Build both applications
pnpm start            # Start both applications in production mode

# Database
pnpm db:migrate       # Run database migrations
pnpm db:seed          # Seed database with initial data
pnpm db:studio        # Open Prisma Studio

# Health
curl http://localhost:3001/health  # Check service health
```

## 🏥 Health Endpoint

The `/health` endpoint returns the status of all services:

```json
{
  "status": "ok",
  "uptime": 12345,
  "timestamp": "2026-05-04T01:00:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

## 🔐 Authentication

The application uses JWT-based authentication with:
- Access tokens (15 minutes)
- Refresh tokens (7 days)
- Secure cookie storage
- Automatic token refresh

## 🤖 AI Integration

Powered by Google Gemini 2.0 Flash with 5 explanation depth levels:

1. **Simple** - 2-3 sentences for beginners
2. **Detailed** - Function-by-function breakdown
3. **Expert** - Design patterns and architecture
4. **Analysis** - Performance and edge cases
5. **Critique** - Senior-level architectural review

## 📊 Dependency Analysis

The system analyzes dependencies for multiple languages:
- **TypeScript/JavaScript** - ES6 imports, CommonJS requires
- **Python** - Import statements
- **Go** - Package imports
- **Rust** - Use and mod statements
- **Java**, **C++**, **C#**, and more

## 🔄 Background Processing

Uses Bull queues with Redis for:
- Repository cloning
- Dependency graph generation
- Code analysis
- Rebuild guide generation

## 🚀 Deployment

### Vercel (Frontend)
```bash
cd apps/web
vercel deploy
```

### Render (Backend)
```bash
cd apps/api
render deploy
```

## 📝 Development Notes

- Uses pnpm for package management
- TypeScript throughout for type safety
- Tailwind CSS for consistent styling
- Prisma for type-safe database access
- Comprehensive error handling and logging
- Mobile-responsive design

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

If you encounter any issues:

1. Check the health endpoint: `http://localhost:3001/health`
2. Verify all environment variables are set
3. Ensure Redis and PostgreSQL are accessible
4. Check the console for error messages

---

**RAYE** - Making code understandable, one explanation at a time. 🚀
