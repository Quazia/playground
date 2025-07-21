#!/usr/bin/env ts-node

// src/get-holders.ts
import dotenv from 'dotenv';
import { fetchHolders } from './holders';

// Load environment variables
dotenv.config();

async function main() {
  const mintAddress = process.argv[2];
  
  if (!mintAddress) {
    console.error('Usage: npm run holders <MINT_ADDRESS>');
    console.error('Example: npm run holders So11111111111111111111111111111111111111112');
    process.exit(1);
  }

  try {
    console.log(`🔍 Fetching holders for token: ${mintAddress}\n`);
    
    const startTime = Date.now();
    const holders = await fetchHolders(mintAddress);
    const endTime = Date.now();
    
    console.log(`\n✅ Found ${holders.length} holders in ${endTime - startTime}ms\n`);
    
    if (holders.length === 0) {
      console.log('No holders found for this token.');
      return;
    }
    
    // Display top 10 holders
    const topHolders = holders.slice(0, 10);
    console.log('Top 10 Holders:');
    console.log('================');
    
    topHolders.forEach((holder, index) => {
      console.log(`${index + 1}. Owner: ${holder.owner}`);
      console.log(`   Amount: ${holder.amount.toLocaleString()}`);
      console.log(`   Account: ${holder.account}`);
      console.log('');
    });
    
    if (holders.length > 10) {
      console.log(`... and ${holders.length - 10} more holders`);
    }
    
    // Summary stats
    const totalSupply = holders.reduce((sum, holder) => sum + holder.amount, 0);
    const averageHolding = totalSupply / holders.length;
    
    console.log('\nSummary:');
    console.log('========');
    console.log(`Total Holders: ${holders.length}`);
    console.log(`Total Supply: ${totalSupply.toLocaleString()}`);
    console.log(`Average Holding: ${averageHolding.toLocaleString()}`);
    console.log(`Largest Holder: ${holders[0]?.amount.toLocaleString() || 'N/A'}`);
    console.log(`Smallest Holder: ${holders[holders.length - 1]?.amount.toLocaleString() || 'N/A'}`);
    
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
