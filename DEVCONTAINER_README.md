# 🐳 VS Code Dev Container Setup

This project includes a complete VS Code Dev Container configuration for blockchain and full-stack development with PostgreSQL database integration.

## 🚀 Quick Start

### Option 1: VS Code Dev Container (Recommended)
1. **Install Prerequisites:**
   - [VS Code](https://code.visualstudio.com/)
   - [Docker Desktop](https://www.docker.com/products/docker-desktop/)
   - [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

2. **Open in Dev Container:**
   ```bash
   # Open VS Code in the project directory
   code .
   
   # Use Command Palette (Cmd+Shift+P / Ctrl+Shift+P)
   # Select: "Dev Containers: Reopen in Container"
   ```

3. **Wait for Setup:**
   - Container will build automatically (first time takes ~5-10 minutes)
   - Dependencies will install automatically
   - Database will start and initialize

### Option 2: Manual Docker Compose
```bash
# Start all services including dev container
docker-compose up -d

# Access the dev container
docker exec -it farcaster-playground-dev bash
```

## 📦 What's Included

### Development Tools
- **Node.js 18** with TypeScript, ts-node, nodemon
- **Foundry** (forge, cast, anvil, chisel) for Solidity development
- **PostgreSQL Client** for database operations
- **Python 3** with pip for additional tooling
- **Git** with proper container configuration

### VS Code Extensions
- **TypeScript/JavaScript**: Enhanced TypeScript support
- **Solidity**: Syntax highlighting and compilation support
- **Database**: PostgreSQL management and query tools
- **Docker**: Container management within VS Code
- **Formatting**: Prettier for code formatting
- **Git**: Enhanced git integration with GitLens

### Pre-configured Services
- **PostgreSQL Database**: `shovel_test` database ready for use
- **Adminer**: Web-based database management at `localhost:8080`
- **SQLTools**: Direct database connection in VS Code sidebar

## 🎯 Available Tasks

Use **Command Palette** (`Cmd+Shift+P`) → **Tasks: Run Task**:

- **Start Database** - Start PostgreSQL and Adminer services
- **Stop Database** - Stop database services
- **Reset Database** - Reset database with fresh schema
- **Test Shovel Setup** - Run connectivity tests
- **Compile Solidity** - Build Solidity contracts with Foundry
- **Run Solidity Tests** - Execute Foundry test suite

## 🌐 Port Forwarding

The dev container automatically forwards these ports:

| Port | Service | URL |
|------|---------|-----|
| 3000 | API Server | http://localhost:3000 |
| 5433 | PostgreSQL | localhost:5433 |
| 8080 | Adminer (DB UI) | http://localhost:8080 |
| 8545 | Hardhat Node | http://localhost:8545 |

## 🗄️ Database Connection

The dev container includes a pre-configured database connection:

```
Host: postgres
Port: 5432
Database: shovel_test
Username: shovel
Password: shovel_password
```

**Access via:**
- **VS Code SQLTools**: Check the sidebar for "Shovel Test DB" connection
- **Adminer Web UI**: http://localhost:8080
- **Command Line**: `psql -h localhost -p 5433 -U shovel -d shovel_test` (from host)
- **Command Line**: `psql -h postgres -U shovel -d shovel_test` (from container)

## 🔧 Development Commands

```bash
# Database management
./scripts/db-manage.sh status     # Check database status
./scripts/db-manage.sh reset      # Reset database
./scripts/db-manage.sh connect    # Connect to database CLI

# Blockchain development
forge build                       # Compile contracts
forge test                        # Run Solidity tests
anvil                            # Start local blockchain

# Node.js development
npm install                       # Install dependencies
npm run dev                       # Start development server
npm run test                      # Run tests

# Shovel testing
npm run test:shovel              # Test Shovel connectivity
```

## 📁 Workspace Structure

```
/workspace/               # Your project root (mounted from host)
├── .devcontainer/       # Dev container configuration
├── .vscode/             # VS Code settings and tasks
├── docker/              # Database initialization scripts
├── scripts/             # Development utility scripts
├── src/                 # Source code
│   ├── shovel-testing/  # Shovel integration tests
│   └── ...
├── test/                # Test files
└── docker-compose.yml   # Container orchestration
```

## 🐛 Troubleshooting

### Container Won't Start
```bash
# Rebuild container from scratch
docker-compose down -v
docker-compose build --no-cache devcontainer
docker-compose up -d devcontainer
```

### Database Connection Issues
```bash
# Check if database is running
./scripts/db-manage.sh status

# Reset database
./scripts/db-manage.sh reset

# Check logs
docker-compose logs postgres
```

### Extension Issues
```bash
# Reload VS Code window
# Command Palette → "Developer: Reload Window"

# Reinstall extensions
# Command Palette → "Dev Containers: Rebuild Container"
```

### Foundry Issues
```bash
# Reinstall Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

## 🔄 Updating the Dev Container

When you update the dev container configuration:

1. **Rebuild container:**
   ```bash
   # Command Palette → "Dev Containers: Rebuild Container"
   ```

2. **Or manually:**
   ```bash
   docker-compose down
   docker-compose build --no-cache devcontainer
   docker-compose up -d devcontainer
   ```

## 🎮 Next Steps

1. **Test the setup:**
   ```bash
   npm run test:shovel
   ```

2. **Start developing:**
   - Open `src/shovel-testing/test-setup.ts` to see database connectivity
   - Check `src/agent-transfer-testing/` for API examples
   - Explore the Solidity contracts in `src/`

3. **Access services:**
   - Database UI: http://localhost:8080
   - Check the SQLTools sidebar for direct database access

## 💡 Tips

- **Terminal**: Use the integrated terminal (`` Ctrl+` ``) for all commands
- **Database**: Use SQLTools extension for visual database management
- **Debugging**: All services have detailed logging available via `docker-compose logs [service]`
- **Persistence**: Your code changes are automatically saved to the host machine
- **Performance**: The container uses cached volumes for faster rebuilds

---

Happy coding! 🚀 If you encounter any issues, check the troubleshooting section or the individual service logs.
