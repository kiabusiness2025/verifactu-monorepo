# Verifactu Development Setup Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- pnpm 10.27.0+
- Docker & Docker Compose (optional but recommended)
- VS Code (recommended)

### Installation

```bash
# Option 1: Using make (Linux/Mac)
make install

# Option 2: Manual setup
pnpm install
pnpm run build
```

### Start Development

```bash
# Option 1: Using make
make dev

# Option 2: Direct command
pnpm dev
```

Visit:
- App: http://localhost:3000
- Landing: http://localhost:3001

---

## 📋 Available Commands

### Development
```bash
make dev              # Start dev servers
make build            # Build for production
make start            # Start production server
```

### Code Quality
```bash
make lint             # Run ESLint
make lint-fix         # Fix ESLint errors
make format           # Format code with Prettier
make typecheck        # Run TypeScript check
```

### Testing
```bash
make test             # Run tests once
make test-watch       # Run tests in watch mode
make test-ci          # Run tests with coverage
```

### Debugging
```bash
make debug-app        # Debug the app with inspector
make debug-tests      # Debug tests with inspector
```

### Database
```bash
make db-migrate       # Run migrations
make db-studio        # Open Prisma Studio
```

### Docker
```bash
make docker-up        # Start containers
make docker-down      # Stop containers
make docker-logs      # View container logs
```

---

## 🐳 Docker Setup

### Start Services

```bash
docker-compose up -d
```

This starts:
- **PostgreSQL** (port 5432): `verifactu` / `verifactu_dev_pass`
- **Redis** (port 6379): Optional caching
- **SQL Server** (commented out, uncomment if needed)

### Environment Variables

Create `apps/app/.env.local`:
```env
DATABASE_URL="postgresql://verifactu:verifactu_dev_pass@localhost:5432/verifactu"
REDIS_URL="redis://localhost:6379"
```

---

## 🔧 VS Code Setup

### Recommended Extensions
- ESLint
- Prettier
- TypeScript Next
- SQL Server (mssql)
- Microsoft Edge DevTools
- GitHub Copilot
- GitLens

### Auto-install Extensions

VS Code will automatically prompt to install recommended extensions on first open.

### Debugging

**Press F5** or go to **Run & Debug** to start debugging:
- **Next.js App**: Debug the server
- **Debug Tests**: Debug Jest tests
- **Full Stack Debug**: Debug both app and browser

---

## 📊 Code Quality Standards

### ESLint
```bash
pnpm lint           # Check for errors
pnpm lint:fix       # Auto-fix errors
```

### Prettier
```bash
pnpm format         # Format all files
pnpm format:check   # Check formatting
```

### TypeScript
```bash
pnpm typecheck      # Check types
```

### All Checks
```bash
pnpm validate:all   # Run all quality checks
```

---

## 🪝 Git Hooks

Pre-commit hooks automatically:
1. Run ESLint on staged files
2. Format with Prettier
3. Prevent commits with lint errors

Enable hooks:
```bash
chmod +x .husky/pre-commit
```

---

## 📝 Workflow

### Feature Branch
```bash
git checkout -b feature/my-feature
pnpm dev
# Make changes
pnpm validate:all
git add .
git commit -m "feat: description"
git push
```

### Create Pull Request
1. Push to GitHub
2. Create PR
3. GitHub Actions will automatically:
   - Run ESLint
   - Check TypeScript
   - Run tests
   - Build the app

---

## 🐛 Debugging Guide

See [DEBUGGING_GUIDE.md](docs/DEBUGGING_GUIDE.md) for detailed debugging instructions.

### Quick Debug

```bash
# Start app with inspector
make debug-app

# In VS Code: Press F5 and select "Attach to Node Process"
```

---

## 🚀 CI/CD with GitHub Actions

Push to `main` or `develop` to trigger:
1. **Lint** check
2. **TypeScript** check
3. **Build** verification
4. **Test** run
5. **Deploy** to Vercel (main branch only)

View workflows in `.github/workflows/`

---

## 📦 Production Build

```bash
pnpm build          # Build app
pnpm start          # Start production server
```

---

## 🆘 Troubleshooting

### Port already in use
```bash
# Find and kill process
lsof -i :3000
kill -9 <PID>
```

### pnpm install fails
```bash
# Clear cache
pnpm store prune

# Reinstall
pnpm install
```

### Debugger won't attach
```bash
# Kill existing process
pkill -f "node"

# Start with debug flag
make debug-app
```

### Docker issues
```bash
# Stop and remove containers
docker-compose down -v

# Rebuild and start
docker-compose up --build
```

---

## 📚 Additional Resources

- [Next.js Docs](https://nextjs.org)
- [Prisma Docs](https://www.prisma.io)
- [Turbo Docs](https://turbo.build)
- [Workflow DevKit](https://workflow.dev)
- [TypeScript Docs](https://www.typescriptlang.org)

---

## 💡 Tips

1. Use `pnpm --filter <package>` to run commands on specific packages
2. Enable auto-format on save in VS Code
3. Use Prisma Studio to visualize database: `make db-studio`
4. Check GitHub Actions logs for deployment issues
5. Use `make help` to see all available commands

---

Last updated: January 2026
