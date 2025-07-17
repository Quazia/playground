#!/bin/bash

# Shovel Real-time Dashboard
# Displays live metrics and performance data

set -e

# Configuration
POSTGRES_URL="postgres://shovel:shovel_password@localhost:5433/shovel_test"
REFRESH_INTERVAL=5

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Function to clear screen and show header
show_header() {
    clear
    echo -e "${WHITE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${WHITE}║                    ${CYAN}SHOVEL INDEXER DASHBOARD${WHITE}                    ║${NC}"
    echo -e "${WHITE}║                      ${YELLOW}$(date)${WHITE}                     ║${NC}"
    echo -e "${WHITE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Function to get database metrics with formatting
get_formatted_metrics() {
    local query_result=$(psql "$POSTGRES_URL" -t << 'EOF'
SELECT 
    COALESCE(COUNT(*), 0) as total_events,
    COALESCE(MAX(block_num), 0) as latest_block,
    COALESCE(MIN(block_num), 0) as earliest_block,
    COALESCE(COUNT(DISTINCT block_num), 0) as unique_blocks,
    COALESCE(COUNT(DISTINCT contract_address), 0) as unique_contracts,
    pg_size_pretty(pg_total_relation_size('erc20_transfers')) as table_size,
    pg_total_relation_size('erc20_transfers') as table_size_bytes
FROM erc20_transfers;
EOF
    )
    
    echo "$query_result"
}

# Function to get recent activity
get_recent_activity() {
    psql "$POSTGRES_URL" -t << 'EOF'
SELECT 
    COALESCE(COUNT(*), 0) as events_last_minute,
    COALESCE(COUNT(DISTINCT block_num), 0) as blocks_last_minute
FROM erc20_transfers 
WHERE indexed_at > NOW() - INTERVAL '1 minute';
EOF
}

# Function to get top contracts by activity
get_top_contracts() {
    psql "$POSTGRES_URL" << 'EOF'
SELECT 
    contract_address,
    COUNT(*) as event_count,
    MAX(block_num) as latest_block
FROM erc20_transfers 
GROUP BY contract_address 
ORDER BY event_count DESC 
LIMIT 5;
EOF
}

# Function to get processing rate over time
get_processing_rates() {
    psql "$POSTGRES_URL" -t << 'EOF'
SELECT 
    '5 min' as timeframe,
    COALESCE(COUNT(*), 0) as events,
    COALESCE(COUNT(DISTINCT block_num), 0) as blocks
FROM erc20_transfers 
WHERE indexed_at > NOW() - INTERVAL '5 minutes'
UNION ALL
SELECT 
    '1 hour' as timeframe,
    COALESCE(COUNT(*), 0) as events,
    COALESCE(COUNT(DISTINCT block_num), 0) as blocks
FROM erc20_transfers 
WHERE indexed_at > NOW() - INTERVAL '1 hour'
UNION ALL
SELECT 
    '24 hours' as timeframe,
    COALESCE(COUNT(*), 0) as events,
    COALESCE(COUNT(DISTINCT block_num), 0) as blocks
FROM erc20_transfers 
WHERE indexed_at > NOW() - INTERVAL '24 hours';
EOF
}

# Function to calculate storage efficiency
calculate_storage_metrics() {
    local metrics=$(get_formatted_metrics)
    local total_events=$(echo "$metrics" | awk '{print $1}')
    local table_size_bytes=$(echo "$metrics" | awk '{print $7}')
    
    if [[ "$total_events" -gt 0 ]] && [[ "$table_size_bytes" -gt 0 ]]; then
        local bytes_per_event=$(echo "scale=2; $table_size_bytes / $total_events" | bc -l)
        echo "$bytes_per_event"
    else
        echo "0"
    fi
}

# Function to show system metrics
show_system_metrics() {
    echo -e "${WHITE}📊 SYSTEM METRICS${NC}"
    echo -e "${WHITE}════════════════${NC}"
    
    # Shovel process info
    local shovel_pid=$(pgrep -f "shovel" 2>/dev/null || echo "")
    if [[ -n "$shovel_pid" ]]; then
        local memory=$(ps -p $shovel_pid -o rss= 2>/dev/null | awk '{print $1/1024}' || echo "N/A")
        local cpu=$(ps -p $shovel_pid -o %cpu= 2>/dev/null || echo "N/A")
        echo -e "${GREEN}✅ Shovel Process:${NC} Running (PID: $shovel_pid)"
        echo -e "   Memory: ${YELLOW}${memory} MB${NC} | CPU: ${YELLOW}${cpu}%${NC}"
    else
        echo -e "${RED}❌ Shovel Process:${NC} Not running"
    fi
    
    # Database connection
    if psql "$POSTGRES_URL" -c "SELECT 1;" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Database:${NC} Connected"
    else
        echo -e "${RED}❌ Database:${NC} Connection failed"
    fi
    
    echo ""
}

# Function to show indexing metrics
show_indexing_metrics() {
    echo -e "${WHITE}🔍 INDEXING METRICS${NC}"
    echo -e "${WHITE}═══════════════════${NC}"
    
    local metrics=$(get_formatted_metrics)
    local total_events=$(echo "$metrics" | awk '{print $1}')
    local latest_block=$(echo "$metrics" | awk '{print $2}')
    local earliest_block=$(echo "$metrics" | awk '{print $3}')
    local unique_blocks=$(echo "$metrics" | awk '{print $4}')
    local unique_contracts=$(echo "$metrics" | awk '{print $5}')
    local table_size=$(echo "$metrics" | awk '{print $6}')
    
    echo -e "${CYAN}Total Events Indexed:${NC} ${YELLOW}$(printf "%'d" $total_events)${NC}"
    echo -e "${CYAN}Block Range:${NC} ${YELLOW}$earliest_block${NC} → ${YELLOW}$latest_block${NC}"
    echo -e "${CYAN}Unique Blocks:${NC} ${YELLOW}$(printf "%'d" $unique_blocks)${NC}"
    echo -e "${CYAN}Unique Contracts:${NC} ${YELLOW}$(printf "%'d" $unique_contracts)${NC}"
    echo -e "${CYAN}Storage Used:${NC} ${YELLOW}$table_size${NC}"
    
    # Calculate storage efficiency
    local bytes_per_event=$(calculate_storage_metrics)
    if [[ "$bytes_per_event" != "0" ]]; then
        echo -e "${CYAN}Bytes per Event:${NC} ${YELLOW}$bytes_per_event${NC}"
    fi
    
    echo ""
}

# Function to show performance metrics
show_performance_metrics() {
    echo -e "${WHITE}⚡ PERFORMANCE METRICS${NC}"
    echo -e "${WHITE}══════════════════════${NC}"
    
    local recent=$(get_recent_activity)
    local events_per_min=$(echo "$recent" | awk '{print $1}')
    local blocks_per_min=$(echo "$recent" | awk '{print $2}')
    
    echo -e "${PURPLE}Recent Activity (Last Minute):${NC}"
    echo -e "  Events: ${YELLOW}$events_per_min${NC} | Blocks: ${YELLOW}$blocks_per_min${NC}"
    
    echo -e "${PURPLE}Processing Rates:${NC}"
    get_processing_rates | while IFS='|' read -r timeframe events blocks; do
        timeframe=$(echo "$timeframe" | xargs)
        events=$(echo "$events" | xargs)
        blocks=$(echo "$blocks" | xargs)
        
        if [[ "$timeframe" == "5 min" ]]; then
            local events_per_min=$(echo "scale=2; $events / 5" | bc -l 2>/dev/null || echo "0")
            local blocks_per_min=$(echo "scale=2; $blocks / 5" | bc -l 2>/dev/null || echo "0")
            echo -e "  ${timeframe}: ${YELLOW}$events_per_min${NC} events/min, ${YELLOW}$blocks_per_min${NC} blocks/min"
        elif [[ "$timeframe" == "1 hour" ]]; then
            local events_per_min=$(echo "scale=2; $events / 60" | bc -l 2>/dev/null || echo "0")
            local blocks_per_min=$(echo "scale=2; $blocks / 60" | bc -l 2>/dev/null || echo "0")
            echo -e "  ${timeframe}: ${YELLOW}$events_per_min${NC} events/min, ${YELLOW}$blocks_per_min${NC} blocks/min"
        else
            echo -e "  ${timeframe}: ${YELLOW}$events${NC} events, ${YELLOW}$blocks${NC} blocks"
        fi
    done
    
    echo ""
}

# Function to show top contracts
show_top_contracts() {
    echo -e "${WHITE}🏆 TOP ACTIVE CONTRACTS${NC}"
    echo -e "${WHITE}═══════════════════════${NC}"
    
    get_top_contracts | grep -v "rows)" | grep -v "contract_address" | grep -v "^-" | head -5 | while IFS='|' read -r address count latest; do
        address=$(echo "$address" | xargs)
        count=$(echo "$count" | xargs)
        latest=$(echo "$latest" | xargs)
        
        if [[ -n "$address" ]] && [[ "$address" != "" ]]; then
            echo -e "${CYAN}${address:0:10}...${address: -8}${NC} | ${YELLOW}$count${NC} events | Block ${YELLOW}$latest${NC}"
        fi
    done
    
    echo ""
}

# Main dashboard loop
main_dashboard() {
    echo -e "${GREEN}Starting Shovel Dashboard...${NC}"
    echo -e "${YELLOW}Press Ctrl+C to exit${NC}"
    sleep 2
    
    while true; do
        show_header
        show_system_metrics
        show_indexing_metrics
        show_performance_metrics
        show_top_contracts
        
        echo -e "${WHITE}────────────────────────────────────────────────────────────────${NC}"
        echo -e "${YELLOW}Refreshing in $REFRESH_INTERVAL seconds... (Press Ctrl+C to exit)${NC}"
        
        sleep "$REFRESH_INTERVAL"
    done
}

# Handle script arguments
case "${1:-dashboard}" in
    "dashboard")
        main_dashboard
        ;;
    "quick")
        show_header
        show_system_metrics
        show_indexing_metrics
        show_performance_metrics
        ;;
    *)
        echo "Usage: $0 [dashboard|quick]"
        echo "  dashboard - Start interactive dashboard (default)"
        echo "  quick     - Show metrics once and exit"
        exit 1
        ;;
esac
