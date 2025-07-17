#!/bin/bash

# Shovel Test Database Management Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Function to start the database
start_db() {
    print_status "Starting Shovel test database..."
    check_docker
    docker-compose up -d postgres
    
    print_status "Waiting for database to be ready..."
    sleep 5
    
    # Wait for database to be healthy
    until docker-compose exec postgres pg_isready -U shovel -d shovel_test; do
        print_warning "Database not ready yet, waiting..."
        sleep 2
    done
    
    print_status "Database is ready!"
    print_status "Database URL: $DATABASE_URL"
    print_status "Adminer (optional): http://localhost:8080"
}

# Function to stop the database
stop_db() {
    print_status "Stopping Shovel test database..."
    docker-compose down
    print_status "Database stopped."
}

# Function to reset the database
reset_db() {
    print_warning "This will delete all data in the test database. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_status "Resetting database..."
        docker-compose down -v
        docker-compose up -d postgres
        sleep 5
        until docker-compose exec postgres pg_isready -U shovel -d shovel_test; do
            sleep 2
        done
        print_status "Database reset complete!"
    else
        print_status "Database reset cancelled."
    fi
}

# Function to show database status
status_db() {
    print_status "Database container status:"
    docker-compose ps postgres
    
    if docker-compose exec postgres pg_isready -U shovel -d shovel_test > /dev/null 2>&1; then
        print_status "Database is healthy and accepting connections."
    else
        print_warning "Database is not responding or not ready."
    fi
}

# Function to connect to database
connect_db() {
    print_status "Connecting to database..."
    docker-compose exec postgres psql -U shovel -d shovel_test
}

# Function to show logs
logs_db() {
    print_status "Showing database logs..."
    docker-compose logs -f postgres
}

# Function to show help
show_help() {
    echo "Shovel Test Database Management"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start     Start the test database"
    echo "  stop      Stop the test database"
    echo "  restart   Restart the test database"
    echo "  reset     Reset the database (deletes all data)"
    echo "  status    Show database status"
    echo "  connect   Connect to database with psql"
    echo "  logs      Show database logs"
    echo "  help      Show this help message"
    echo ""
    echo "Environment:"
    echo "  DATABASE_URL: $DATABASE_URL"
}

# Main script logic
case "${1:-help}" in
    start)
        start_db
        ;;
    stop)
        stop_db
        ;;
    restart)
        stop_db
        start_db
        ;;
    reset)
        reset_db
        ;;
    status)
        status_db
        ;;
    connect)
        connect_db
        ;;
    logs)
        logs_db
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
