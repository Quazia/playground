#!/bin/bash

# Shovel Startup Script with Comprehensive Logging and Monitoring

set -e

# Configuration
SHOVEL_CONFIG="/workspace/shovel-config.json"
SHOVEL_LOG="/workspace/logs/shovel.log"
SHOVEL_ERROR_LOG="/workspace/logs/shovel_error.log"
METRICS_SCRIPT="/workspace/scripts/shovel-metrics.sh"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create logs directory
mkdir -p /workspace/logs

# Function to print colored output
print_status() {
    echo -e "${GREEN}[SHOVEL]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[SHOVEL]${NC} $1"
}

print_error() {
    echo -e "${RED}[SHOVEL]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[SHOVEL]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if shovel binary exists
    if [[ ! -x "./shovel" ]]; then
        print_error "Shovel binary not found or not executable"
        exit 1
    fi
    
    # Check if config file exists
    if [[ ! -f "$SHOVEL_CONFIG" ]]; then
        print_error "Shovel config file not found: $SHOVEL_CONFIG"
        exit 1
    fi
    
    # Check if PostgreSQL is running
    if ! docker ps | grep -q "shovel-test-db"; then
        print_error "PostgreSQL container is not running. Please start it first."
        print_info "Run: docker-compose up -d postgres"
        exit 1
    fi
    
    # Test database connection
    if ! psql "postgres://shovel:shovel_password@localhost:5433/shovel_test" -c "SELECT 1;" >/dev/null 2>&1; then
        print_error "Cannot connect to PostgreSQL database"
        exit 1
    fi
    
    print_status "All prerequisites satisfied"
}

# Function to setup database schema
setup_database() {
    print_status "Setting up database schema..."
    
    # The schema will be created automatically by Shovel, but we can prepare some optimization
    psql "postgres://shovel:shovel_password@localhost:5433/shovel_test" << 'EOF'
-- Enable some PostgreSQL optimizations for better performance
SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;

-- Create extension for better UUID handling if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Prepare for metrics tracking
CREATE TABLE IF NOT EXISTS shovel_performance_log (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    blocks_processed INTEGER,
    events_indexed INTEGER,
    processing_time_ms BIGINT,
    memory_usage_mb REAL,
    block_range_start BIGINT,
    block_range_end BIGINT
);
EOF
    
    print_status "Database schema setup complete"
}

# Function to validate configuration
validate_config() {
    print_status "Validating Shovel configuration..."
    
    # Check if config is valid JSON
    if ! jq . "$SHOVEL_CONFIG" >/dev/null 2>&1; then
        print_error "Invalid JSON in configuration file"
        exit 1
    fi
    
    # Validate required fields
    local pg_url=$(jq -r '.pg_url' "$SHOVEL_CONFIG")
    local eth_sources=$(jq -r '.eth_sources | length' "$SHOVEL_CONFIG")
    local integrations=$(jq -r '.integrations | length' "$SHOVEL_CONFIG")
    
    if [[ "$pg_url" == "null" ]]; then
        print_error "Missing pg_url in configuration"
        exit 1
    fi
    
    if [[ "$eth_sources" == "0" ]]; then
        print_error "No eth_sources configured"
        exit 1
    fi
    
    if [[ "$integrations" == "0" ]]; then
        print_error "No integrations configured"
        exit 1
    fi
    
    print_status "Configuration validation passed"
    print_info "  - Database URL: $pg_url"
    print_info "  - Ethereum sources: $eth_sources"
    print_info "  - Integrations: $integrations"
}

# Function to start Shovel with monitoring
start_shovel() {
    print_status "Starting Shovel indexer..."
    print_info "Logs will be written to:"
    print_info "  - Main log: $SHOVEL_LOG"
    print_info "  - Error log: $SHOVEL_ERROR_LOG"
    
    # Start metrics collection in background
    print_status "Starting metrics collection..."
    "$METRICS_SCRIPT" setup
    nohup "$METRICS_SCRIPT" monitor > /workspace/logs/metrics.log 2>&1 &
    local metrics_pid=$!
    echo $metrics_pid > /workspace/logs/metrics.pid
    print_info "Metrics collector started with PID: $metrics_pid"
    
    # Start Shovel with proper logging
    print_status "Starting Shovel indexer process..."
    
    # Create a function to handle cleanup
    cleanup() {
        print_warning "Received interrupt signal, cleaning up..."
        if [[ -f /workspace/logs/metrics.pid ]]; then
            local pid=$(cat /workspace/logs/metrics.pid)
            kill $pid 2>/dev/null || true
            rm -f /workspace/logs/metrics.pid
            print_info "Stopped metrics collector"
        fi
        exit 0
    }
    
    # Set up signal handlers
    trap cleanup SIGINT SIGTERM
    
    # Start Shovel and capture both stdout and stderr
    ./shovel -config "$SHOVEL_CONFIG" 2> >(tee -a "$SHOVEL_ERROR_LOG" >&2) | tee -a "$SHOVEL_LOG"
}

# Function to show current status
show_status() {
    print_status "Shovel Status Report"
    print_status "==================="
    
    # Check if Shovel is running
    if pgrep -f "shovel" >/dev/null; then
        print_info "✅ Shovel process is running"
        local pid=$(pgrep -f "shovel")
        print_info "   PID: $pid"
        
        # Show memory usage
        local memory=$(ps -p $pid -o rss= 2>/dev/null | awk '{print $1/1024}' || echo "N/A")
        print_info "   Memory usage: ${memory} MB"
    else
        print_warning "❌ Shovel process is not running"
    fi
    
    # Check metrics collector
    if [[ -f /workspace/logs/metrics.pid ]] && kill -0 "$(cat /workspace/logs/metrics.pid)" 2>/dev/null; then
        print_info "✅ Metrics collector is running"
    else
        print_warning "❌ Metrics collector is not running"
    fi
    
    # Database status
    if psql "postgres://shovel:shovel_password@localhost:5433/shovel_test" -c "SELECT COUNT(*) FROM erc20_transfers;" >/dev/null 2>&1; then
        local count=$(psql "postgres://shovel:shovel_password@localhost:5433/shovel_test" -t -c "SELECT COUNT(*) FROM erc20_transfers;" | xargs)
        print_info "✅ Database connected - $count events indexed"
        
        # Show latest block
        local latest_block=$(psql "postgres://shovel:shovel_password@localhost:5433/shovel_test" -t -c "SELECT MAX(block_num) FROM erc20_transfers;" | xargs)
        if [[ "$latest_block" != "" ]] && [[ "$latest_block" != "null" ]]; then
            print_info "   Latest block indexed: $latest_block"
        fi
    else
        print_warning "❌ Cannot connect to database"
    fi
    
    # Show recent log entries
    if [[ -f "$SHOVEL_LOG" ]]; then
        print_info "📋 Recent log entries:"
        tail -5 "$SHOVEL_LOG" | sed 's/^/   /'
    fi
}

# Function to stop all processes
stop_shovel() {
    print_status "Stopping Shovel and metrics collection..."
    
    # Stop Shovel
    if pgrep -f "shovel" >/dev/null; then
        pkill -f "shovel"
        print_info "Stopped Shovel process"
    fi
    
    # Stop metrics collector
    if [[ -f /workspace/logs/metrics.pid ]]; then
        local pid=$(cat /workspace/logs/metrics.pid)
        kill $pid 2>/dev/null || true
        rm -f /workspace/logs/metrics.pid
        print_info "Stopped metrics collector"
    fi
    
    print_status "All processes stopped"
}

# Main script logic
case "${1:-start}" in
    "start")
        check_prerequisites
        validate_config
        setup_database
        start_shovel
        ;;
    "stop")
        stop_shovel
        ;;
    "status")
        show_status
        ;;
    "restart")
        stop_shovel
        sleep 2
        check_prerequisites
        validate_config
        setup_database
        start_shovel
        ;;
    "logs")
        if [[ -f "$SHOVEL_LOG" ]]; then
            tail -f "$SHOVEL_LOG"
        else
            print_error "Log file not found: $SHOVEL_LOG"
        fi
        ;;
    "metrics")
        "$METRICS_SCRIPT" analyze
        ;;
    *)
        echo "Usage: $0 {start|stop|status|restart|logs|metrics}"
        echo ""
        echo "Commands:"
        echo "  start   - Start Shovel indexer with monitoring"
        echo "  stop    - Stop Shovel and all monitoring"
        echo "  status  - Show current status"
        echo "  restart - Restart everything"
        echo "  logs    - Follow Shovel logs"
        echo "  metrics - Show performance analysis"
        exit 1
        ;;
esac
