import { config } from 'dotenv';
import { createPublicClient, http } from 'viem';
import { optimism } from 'viem/chains';
import pkg from 'pg';
const { Client } = pkg;

config();

// Database connection
const dbClient = new Client({
  connectionString: process.env.DATABASE_URL,
});

// Blockchain client (using your local Hardhat)
const blockchainClient = createPublicClient({
  chain: optimism,
  transport: http('http://localhost:8545'),
});

async function testShovelSetup() {
  console.log('🔍 Testing Shovel setup...');
  
  try {
    // Test database connection
    console.log('📊 Testing database connection...');
    await dbClient.connect();
    
    const dbResult = await dbClient.query('SELECT version()');
    console.log('✅ Database connected:', dbResult.rows[0].version);
    
    // Test blockchain connection
    console.log('⛓️  Testing blockchain connection...');
    const blockNumber = await blockchainClient.getBlockNumber();
    console.log('✅ Blockchain connected, latest block:', blockNumber.toString());
    
    // Test writing to database
    console.log('💾 Testing database write...');
    const block = await blockchainClient.getBlock({ blockNumber });
    
    await dbClient.query(`
      INSERT INTO shovel.test_blocks (block_number, block_hash, timestamp) 
      VALUES ($1, $2, $3)
      ON CONFLICT DO NOTHING
    `, [
      block.number?.toString(),
      block.hash,
      new Date(Number(block.timestamp) * 1000)
    ]);
    
    console.log('✅ Successfully wrote block data to database');
    
    // Query the data back
    console.log('📖 Testing database read...');
    const queryResult = await dbClient.query(`
      SELECT block_number, block_hash, timestamp 
      FROM shovel.test_blocks 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log('✅ Recent blocks in database:');
    queryResult.rows.forEach((row: any) => {
      console.log(`   Block ${row.block_number}: ${row.block_hash} (${row.timestamp})`);
    });
    
    console.log('🎉 Shovel setup test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await dbClient.end();
  }
}

// Run if called directly
if (require.main === module) {
  testShovelSetup();
}

export { testShovelSetup };
