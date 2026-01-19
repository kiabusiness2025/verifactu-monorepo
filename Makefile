.PHONY: install dev build test lint format clean help debug-app debug-tests docker-up docker-down

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	pnpm install

dev: ## Start development server
	pnpm dev

build: ## Build for production
	pnpm run build

start: ## Start production server
	pnpm start

test: ## Run tests
	pnpm --filter verifactu-app test

test-watch: ## Run tests in watch mode
	pnpm --filter verifactu-app test:watch

test-ci: ## Run tests in CI mode
	pnpm --filter verifactu-app test:ci --coverage

lint: ## Run ESLint
	pnpm --filter verifactu-app lint

lint-fix: ## Fix ESLint errors
	pnpm --filter verifactu-app lint --fix

format: ## Format code with Prettier
	pnpm exec prettier --write 'apps/**/*.{ts,tsx,js,jsx,json,md}'

format-check: ## Check code formatting
	pnpm exec prettier --check 'apps/**/*.{ts,tsx,js,jsx,json,md}'

typecheck: ## Run TypeScript type check
	pnpm --filter verifactu-app exec tsc --noEmit

clean: ## Clean build artifacts
	rm -rf apps/app/.next apps/app/node_modules
	rm -rf apps/landing/.next apps/landing/node_modules
	rm -rf node_modules

debug-app: ## Debug Next.js app with VS Code
	pnpm dev --inspect

debug-tests: ## Debug tests with VS Code
	pnpm --filter verifactu-app test:watch --inspect

docker-up: ## Start Docker containers
	docker-compose up -d

docker-down: ## Stop Docker containers
	docker-compose down

docker-logs: ## Show Docker logs
	docker-compose logs -f

db-migrate: ## Run database migrations
	pnpm exec prisma migrate deploy

db-studio: ## Open Prisma Studio
	pnpm exec prisma studio

all: clean install lint typecheck test build ## Run all checks

.DEFAULT_GOAL := help
