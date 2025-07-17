# Shovel Test Database Setup

This directory contains a Docker-based setup for testing Shovel (blockchain data indexing) with a local PostgreSQL database.

## Quick Start

1. **Start the database:**
   ```bash
   ./scripts/db-manage.sh start
   ```

2. **Install additional dependencies for database testing:**
   ```bash
   npm install pg @types/pg
   ```

3. **Test the setup:**
   ```bash
   npx ts-node src/shovel-testing/test-setup.ts
   ```

## Components

### Docker Services

- **PostgreSQL 15**: Main database for storing indexed blockchain data
- **Adminer**: Web-based database management tool (optional)

### Database Configuration

- **Host**: localhost:5433
- **Database**: shovel_test
- **User**: shovel
- **Password**: shovel_password
- **Schema**: shovel

### Management Script

Use `./scripts/db-manage.sh` to manage the database:

```bash
# Start the database
./scripts/db-manage.sh start

# Stop the database
./scripts/db-manage.sh stop

# Reset database (deletes all data)
./scripts/db-manage.sh reset

# Check status
./scripts/db-manage.sh status

# Connect with psql
./scripts/db-manage.sh connect

# View logs
./scripts/db-manage.sh logs
```

## Environment Variables

The following variables are added to your `.env` file:

```bash
# Database configuration
DATABASE_URL="postgresql://shovel:shovel_password@localhost:5433/shovel_test"
POSTGRES_HOST="localhost"
POSTGRES_PORT="5433"
POSTGRES_DB="shovel_test"
POSTGRES_USER="shovel"
POSTGRES_PASSWORD="shovel_password"

# Shovel configuration
SHOVEL_RPC_URL="http://localhost:8545"
SHOVEL_START_BLOCK="0"
SHOVEL_CHAIN_ID="10"
```

## Testing

The test setup script (`src/shovel-testing/test-setup.ts`) will:

1. Connect to the database
2. Connect to your local blockchain (Hardhat)
3. Fetch a block from the blockchain
4. Store it in the database
5. Query the data back

## Web Interface

Access Adminer at http://localhost:8080 to manage your database through a web interface:

- **System**: PostgreSQL
- **Server**: postgres
- **Username**: shovel
- **Password**: shovel_password
- **Database**: shovel_test

## Troubleshooting

1. **Docker not running**: Make sure Docker Desktop is running
2. **Port conflicts**: If port 5433 is in use, change it in `docker-compose.yml`
3. **Database connection issues**: Check that the container is healthy with `./scripts/db-manage.sh status`

## Integration with Shovel

To integrate with the actual Shovel tool:

1. Configure Shovel to use the `DATABASE_URL` from your environment
2. Point Shovel's RPC to your local Hardhat instance (`SHOVEL_RPC_URL`)
3. Use the `shovel` schema in the database for your indexed data
