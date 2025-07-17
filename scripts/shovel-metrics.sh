#!/bin/bash

# Shovel Metrics Collection Script
# This script monitors Shovel performance and storage metrics

set -e

# Configuration
POSTGRES_URL="postgres://shovel:shovel_password@localhost:5433/shovel_test"
METRICS_LOG="/workspace/logs/shovel_metrics.log"
SHOVEL_LOG="/workspace/logs/shovel.log"
METRICS_INTERVAL=30  # seconds

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
    echo -e "${GREEN}[METRICS]${NC} $1" | tee -a "$METRICS_LOG"
}

print_warning() {
    echo -e "${YELLOW}[METRICS]${NC} $1" | tee -a "$METRICS_LOG"
}

print_error() {
    echo -e "${RED}[METRICS]${NC} $1" | tee -a "$METRICS_LOG"
}

print_info() {
    echo -e "${BLUE}[METRICS]${NC} $1" | tee -a "$METRICS_LOG"
}

# Function to get database metrics
get_db_metrics() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Get table size and row count
    local table_size=$(psql "$POSTGRES_URL" -t -c "
        SELECT pg_size_pretty(pg_total_relation_size('erc20_transfers')) 
        WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'erc20_transfers');
    " 2>/dev/null | xargs || echo "0 bytes")
    
    local row_count=$(psql "$POSTGRES_URL" -t -c "
        SELECT COUNT(*) FROM erc20_transfers;
    " 2>/dev/null | xargs || echo "0")
    
    local latest_block=$(psql "$POSTGRES_URL" -t -c "
        SELECT MAX(block_num) FROM erc20_transfers;
    " 2>/dev/null | xargs || echo "0")
    
    local earliest_block=$(psql "$POSTGRES_URL" -t -c "
        SELECT MIN(block_num) FROM erc20_transfers;
    " 2>/dev/null | xargs || echo "0")
    
    # Calculate average storage per event if we have data
    local avg_bytes_per_event="N/A"
    if [[ "$row_count" -gt 0 ]]; then
        local table_size_bytes=$(psql "$POSTGRES_URL" -t -c "
            SELECT pg_total_relation_size('erc20_transfers');
        " 2>/dev/null | xargs || echo "0")
        if [[ "$table_size_bytes" -gt 0 ]]; then
            avg_bytes_per_event=$(echo "scale=2; $table_size_bytes / $row_count" | bc -l 2>/dev/null || echo "N/A")
        fi
    fi
    
    # Get recent indexing rate (events per minute in last 5 minutes)
    local recent_rate=$(psql "$POSTGRES_URL" -t -c "
        SELECT COUNT(*) 
        FROM erc20_transfers 
        WHERE indexed_at > NOW() - INTERVAL '5 minutes';
    " 2>/dev/null | xargs || echo "0")
    recent_rate=$(echo "scale=2; $recent_rate / 5" | bc -l 2>/dev/null || echo "0")
    
    echo "$timestamp,$table_size,$row_count,$latest_block,$earliest_block,$avg_bytes_per_event,$recent_rate" >> "$METRICS_LOG"
    
    print_info "DB Metrics - Size: $table_size, Events: $row_count, Latest Block: $latest_block, Avg Bytes/Event: $avg_bytes_per_event, Rate: $recent_rate events/min"
}

# Function to get block processing metrics
get_block_metrics() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Get blocks processed in last minute
    local blocks_last_minute=$(psql "$POSTGRES_URL" -t -c "
        SELECT COUNT(DISTINCT block_num) 
        FROM erc20_transfers 
        WHERE indexed_at > NOW() - INTERVAL '1 minute';
    " 2>/dev/null | xargs || echo "0")
    
    # Get average events per block
    local avg_events_per_block=$(psql "$POSTGRES_URL" -t -c "
        SELECT ROUND(AVG(event_count), 2)
        FROM (
            SELECT block_num, COUNT(*) as event_count
            FROM erc20_transfers
            GROUP BY block_num
        ) block_stats;
    " 2>/dev/null | xargs || echo "0")
    
    print_info "Block Metrics - Blocks/min: $blocks_last_minute, Avg Events/Block: $avg_events_per_block"
}

# Function to monitor system resources
get_system_metrics() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Get memory usage of shovel process
    local shovel_memory=$(ps aux | grep '[s]hovel' | awk '{sum+=$6} END {print sum/1024}' || echo "0")
    
    # Get CPU usage
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//' || echo "0")
    
    # Get disk usage of postgres data
    local disk_usage=$(df -h /var/lib/postgresql 2>/dev/null | tail -1 | awk '{print $5}' | sed 's/%//' || echo "0")
    
    print_info "System Metrics - Shovel Memory: ${shovel_memory}MB, CPU: ${cpu_usage}%, Disk: ${disk_usage}%"
}

# Function to analyze performance over time ranges
analyze_performance() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    print_status "=== Performance Analysis ==="
    
    # Last hour performance
    local events_last_hour=$(psql "$POSTGRES_URL" -t -c "
        SELECT COUNT(*) 
        FROM erc20_transfers 
        WHERE indexed_at > NOW() - INTERVAL '1 hour';
    " 2>/dev/null | xargs || echo "0")
    
    local blocks_last_hour=$(psql "$POSTGRES_URL" -t -c "
        SELECT COUNT(DISTINCT block_num) 
        FROM erc20_transfers 
        WHERE indexed_at > NOW() - INTERVAL '1 hour';
    " 2>/dev/null | xargs || echo "0")
    
    # Calculate rates
    local events_per_hour="$events_last_hour"
    local blocks_per_hour="$blocks_last_hour"
    local events_per_minute=$(echo "scale=2; $events_last_hour / 60" | bc -l 2>/dev/null || echo "0")
    local blocks_per_minute=$(echo "scale=2; $blocks_last_hour / 60" | bc -l 2>/dev/null || echo "0")
    
    print_info "Last Hour: $events_per_hour events ($events_per_minute/min), $blocks_per_hour blocks ($blocks_per_minute/min)"
    
    # Storage growth analysis
    local storage_growth=$(psql "$POSTGRES_URL" -t -c "
        SELECT pg_size_pretty(pg_total_relation_size('erc20_transfers')) 
        WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'erc20_transfers');
    " 2>/dev/null | xargs || echo "0 bytes")
    
    print_info "Current Storage: $storage_growth"
}

# Function to create metrics tables
setup_metrics_tables() {
    print_status "Setting up metrics tables..."
    
    psql "$POSTGRES_URL" << 'EOF'
-- Create metrics table for tracking performance over time
CREATE TABLE IF NOT EXISTS shovel_metrics (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    metric_type VARCHAR(50),
    metric_name VARCHAR(100),
    metric_value NUMERIC,
    metric_unit VARCHAR(20),
    additional_data JSONB
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_shovel_metrics_timestamp ON shovel_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_shovel_metrics_type ON shovel_metrics(metric_type);

-- Create view for latest metrics
CREATE OR REPLACE VIEW latest_shovel_metrics AS
SELECT 
    metric_type,
    metric_name,
    metric_value,
    metric_unit,
    timestamp,
    additional_data
FROM shovel_metrics 
WHERE timestamp > NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC;
EOF
    
    print_status "Metrics tables created successfully"
}

# Function to insert metrics into database
insert_metric() {
    local metric_type="$1"
    local metric_name="$2"
    local metric_value="$3"
    local metric_unit="$4"
    local additional_data="${5:-{}}"
    
    psql "$POSTGRES_URL" -c "
        INSERT INTO shovel_metrics (metric_type, metric_name, metric_value, metric_unit, additional_data)
        VALUES ('$metric_type', '$metric_name', $metric_value, '$metric_unit', '$additional_data'::jsonb);
    " >/dev/null 2>&1
}

# Main monitoring loop
monitor_shovel() {
    print_status "Starting Shovel metrics monitoring..."
    print_status "Metrics will be logged to: $METRICS_LOG"
    print_status "Press Ctrl+C to stop monitoring"
    
    # Setup metrics tables
    setup_metrics_tables
    
    # Write CSV header
    echo "timestamp,table_size,row_count,latest_block,earliest_block,avg_bytes_per_event,events_per_minute" >> "$METRICS_LOG"
    
    while true; do
        print_status "Collecting metrics at $(date)"
        
        # Collect all metrics
        get_db_metrics
        get_block_metrics
        get_system_metrics
        
        # Every 5 minutes, do detailed analysis
        if (( $(date +%s) % 300 == 0 )); then
            analyze_performance
        fi
        
        print_status "Sleeping for $METRICS_INTERVAL seconds..."
        sleep "$METRICS_INTERVAL"
    done
}

# Handle script arguments
case "${1:-monitor}" in
    "monitor")
        monitor_shovel
        ;;
    "analyze")
        analyze_performance
        ;;
    "setup")
        setup_metrics_tables
        ;;
    *)
        echo "Usage: $0 [monitor|analyze|setup]"
        echo "  monitor - Start continuous monitoring (default)"
        echo "  analyze - Run one-time performance analysis"
        echo "  setup   - Setup metrics tables only"
        exit 1
        ;;
esac
