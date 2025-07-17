-- Initialize database for Shovel testing
-- This script runs automatically when the container starts

-- Create extensions that might be useful for blockchain data
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create a schema for shovel data
CREATE SCHEMA IF NOT EXISTS shovel;

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA shovel TO shovel;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA shovel TO shovel;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA shovel TO shovel;

-- Create a simple test table for verification
CREATE TABLE IF NOT EXISTS shovel.test_blocks (
    id SERIAL PRIMARY KEY,
    block_number BIGINT NOT NULL,
    block_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Insert a test record
INSERT INTO shovel.test_blocks (block_number, block_hash) 
VALUES (0, '0x0000000000000000000000000000000000000000000000000000000000000000');

-- Create indexes for common blockchain queries
CREATE INDEX IF NOT EXISTS idx_test_blocks_number ON shovel.test_blocks(block_number);
CREATE INDEX IF NOT EXISTS idx_test_blocks_hash ON shovel.test_blocks(block_hash);
