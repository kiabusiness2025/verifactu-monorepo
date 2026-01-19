# Makefile Tools & Commands Reference

## 🔨 What is Make?

Make is a build automation tool. The Makefile in our project contains shortcuts for common commands.

**Benefits:**
- ✅ Single command instead of long scripts
- ✅ Consistent across team
- ✅ Easy to remember
- ✅ Chainable commands
- ✅ Self-documented (help command)

---

## 📍 Location

**File:** [`Makefile`](../../Makefile)

**View all commands:**
```bash
make help
```

---

## 🚀 Essential Commands

### Development

```bash
# Start development server (port 3000 + 3001)
make dev

# Or individually:
make dev:app           # App only (http://localhost:3000)
make dev:landing       # Landing only (http://localhost:3001)

# Build for production
make build

# Start production server
make start
```

### Linting & Formatting

```bash
# Run ESLint
make lint

# Fix linting errors
make lint:fix

# Format code with Prettier
make format

# Check formatting
make format:check
```

### TypeScript

```bash
# Type checking
make typecheck

# Type checking with watch mode
make typecheck:watch
```

### Testing

```bash
# Run all tests
make test

# Run tests in watch mode
make test:watch

# Run tests with coverage
make test:coverage
```

### Database

```bash
# Run Prisma migrations
make db:migrate

# Open Prisma Studio (visual DB explorer)
make db:studio

# Reset database (dev only - CAUTION!)
make db:reset
```

### Docker

```bash
# Start Docker services (PostgreSQL, Redis)
make docker:up

# Stop Docker services
make docker:down

# View Docker logs
make docker:logs

# Rebuild Docker images
make docker:build
```

### Git

```bash
# Create commit (runs pre-commit hooks)
git add .
git commit -m "your message"

# Pre-commit hooks automatically run:
# - ESLint (fixes issues)
# - Prettier (formats code)
```

---

## 🎯 Complete Command List

### Meta Commands

```bash
make help              # Show all available commands
make clean             # Clean build artifacts
make clean:all         # Clean everything (node_modules too)
```

### Development

```bash
make dev               # Start all dev servers
make dev:app           # App server (3000)
make dev:landing       # Landing server (3001)
make build             # Build for production
make start             # Start production server
make start:app         # Start app only
make start:landing     # Start landing only
```

### Code Quality

```bash
make lint              # Run ESLint
make lint:fix          # Fix linting errors
make lint:strict       # Strict linting
make format            # Format with Prettier
make format:check      # Check formatting only
make typecheck         # TypeScript check
make typecheck:watch   # Watch mode
```

### Testing

```bash
make test              # Run tests once
make test:watch        # Watch mode
make test:coverage     # With coverage report
make test:ci           # CI mode (no watch)
make test:debug        # Debug mode with inspector
```

### Database

```bash
make db:migrate        # Run Prisma migrations
make db:studio         # Open Prisma Studio
make db:reset          # Reset database (DEV ONLY)
make db:seed           # Seed database with data
make db:generate       # Generate Prisma Client
```

### Docker

```bash
make docker:up         # Start containers
make docker:down       # Stop containers
make docker:logs       # View logs
make docker:build      # Rebuild images
make docker:clean      # Clean up Docker
```

### Debugging

```bash
make debug             # Debug with Node inspector
make debug:app         # Debug app only
make debug:tests       # Debug tests
```

### Utilities

```bash
make ports             # Check used ports
make env               # Show environment variables
make deps              # Check dependencies
make outdated          # Find outdated packages
```

### CI/CD

```bash
make ci                # Run all CI checks (lint, typecheck, build, test)
make ci:lint           # Just lint check
make ci:build          # Just build check
```

---

## 📋 Common Workflows

### Morning Setup

```bash
# 1. Start Docker with database
make docker:up

# 2. Install/update dependencies
pnpm install

# 3. Run migrations
make db:migrate

# 4. Start dev server
make dev

# 5. (Optional) Open Prisma Studio
make db:studio
```

### Before Commit

```bash
# 1. Run all checks
make lint:fix
make typecheck
make test

# 2. Commit
git add .
git commit -m "feat: description"
# Pre-commit hooks run automatically

# 3. Push
git push origin feature-branch
```

### Before Deployment

```bash
# 1. Build locally
make build

# 2. Run tests
make test:ci

# 3. Type check
make typecheck

# 4. Final lint
make lint

# 5. If all pass, push to main
git push origin main
# GitHub Actions deploys automatically
```

### Debugging Issue

```bash
# 1. Stop dev server (Ctrl+C)

# 2. Start with debugger
make debug

# 3. Set breakpoints in VS Code
# 4. Attach debugger (F5 or press Play)

# 5. Or debug tests
make test:debug
```

---

## 🔍 Understanding Make Syntax

### Basic Structure

```makefile
target: dependencies
	command
	another command
```

Example from our Makefile:

```makefile
lint:
	pnpm eslint . --ext .ts,.tsx,.js,.jsx

lint:fix:
	pnpm eslint . --ext .ts,.tsx,.js,.jsx --fix
```

### Special Targets

```makefile
.PHONY: help        # Mark as "not a file" (always run)
.DEFAULT_GOAL := dev  # Run 'make dev' if just 'make'
```

---

## 📊 Available Variables

Inside Makefile (can be customized):

```makefile
NODE_ENV ?= development
PORT ?= 3000
DATABASE_URL ?= postgresql://...
```

Override on command line:
```bash
make dev PORT=4000        # Use different port
make dev NODE_ENV=test    # Use test environment
```

---

## 🚨 Common Issues

### "make: command not found"

**On Windows:** Make might not be installed

**Solution:**
```bash
# Option 1: Use PowerShell commands directly
pnpm dev:app

# Option 2: Install GNU Make
# Via Chocolatey:
choco install make

# Via VS Code
# Install "Make Tools" extension
```

### "Permission denied" on Docker commands

**Solution:**
```bash
# Use sudo
sudo make docker:up

# Or add user to docker group
sudo usermod -aG docker $USER
```

### Port already in use

```bash
# Check which process uses port
make ports

# Kill process
kill -9 <PID>

# Or use different port
make dev PORT=4000
```

---

## 🎓 Learning More

### View Makefile

```bash
cat Makefile
# Shows all commands with descriptions
```

### Add Custom Command

Edit `Makefile` and add:
```makefile
my-command:
	@echo "Running my command..."
	pnpm your-script

.PHONY: my-command
```

Then use:
```bash
make my-command
```

---

## 💡 Pro Tips

### Chain Commands

```bash
# Run multiple commands
make lint:fix && make typecheck && make test

# Or use compound Make target (if defined)
make pre-commit  # Usually runs lint, typecheck, test
```

### Use with Scripts

```bash
# Makefile can call scripts
make deploy  # Might run deployment script

# Or integrate with CI/CD
# GitHub Actions calls: make ci
```

### Watch Mode Shortcuts

```bash
# Development (auto-reload)
make dev           # Both servers watch file changes

# Testing (auto-rerun)
make test:watch    # Rerun tests on file change

# Type checking (auto-check)
make typecheck:watch  # Recheck on file change
```

---

## 📚 Related Documentation

- [Makefile Implementation](../../Makefile)
- [DEVELOPMENT.md](DEVELOPMENT.md) - More detailed setup
- [DEBUGGING_GUIDE.md](DEBUGGING_GUIDE.md) - Debugging with Make

---

## ✅ Verification

Verify Make is working:

```bash
# List all targets
make help

# Should show: dev, build, lint, test, db:migrate, docker:up, etc.

# Test one command
make lint --dry-run  # Shows what would run without running
```

---

**Tip:** Keep `make help` output in a pinned terminal tab for quick reference! 📌

Last updated: January 2026
