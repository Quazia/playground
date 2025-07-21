// src/get-holders-alchemy.ts
import dotenv from 'dotenv';
import { fetchHoldersAlchemyPaginated } from './holders-alchemy-paginated';

// Load environment variables
dotenv.config();

async function main() {
  const tokenMint = process.argv[2];
  const maxPages = parseInt(process.argv[3]) || 10; // Default to 10 pages for testing
  const pageSize = parseInt(process.argv[4]) || 500; // Default to smaller page size

  if (!tokenMint) {
    console.error('Usage: npx ts-node src/get-holders-alchemy.ts <TOKEN_MINT_ADDRESS> [MAX_PAGES] [PAGE_SIZE]');
    console.error('Example: npx ts-node src/get-holders-alchemy.ts EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v 5 100');
    process.exit(1);
  }

  // Check if we have an Alchemy RPC URL
  if (!process.env.SOLANA_RPC_URL || !process.env.SOLANA_RPC_URL.includes('alchemy.com')) {
    console.error('❌ This script requires an Alchemy RPC URL in your .env file');
    console.error('   Please set SOLANA_RPC_URL to your Alchemy endpoint');
    process.exit(1);
  }

  try {
    console.log(`🔍 Fetching holders for token: ${tokenMint}`);
    console.log(`📄 Maximum pages to fetch: ${maxPages}`);
    console.log(`📏 Page size: ${pageSize}\n`);

    const startTime = Date.now();
    
    const holders = await fetchHoldersAlchemyPaginated(tokenMint, maxPages, pageSize);
    const endTime = Date.now();

    console.log(`\n✅ Found ${holders.length} holders in ${endTime - startTime}ms\n`);

    if (holders.length > 0) {
      console.log(`Top 10 Holders:`);
      console.log('================');
      
      const topHolders = holders.slice(0, 10);
      topHolders.forEach((holder, index) => {
        console.log(`${index + 1}. Owner: ${holder.owner}`);
        console.log(`   Amount: ${holder.amount.toLocaleString()}`);
        console.log(`   Account: ${holder.account}`);
        console.log('');
      });

      console.log('Summary:');
      console.log('========');
      console.log(`Total Holders: ${holders.length.toLocaleString()}`);
      const totalHoldings = holders.reduce((sum, h) => sum + h.amount, 0);
      console.log(`Total Supply Held: ${totalHoldings.toLocaleString()}`);
      console.log(`Average Holding: ${(totalHoldings / holders.length).toLocaleString()}`);
      console.log(`Largest Holder: ${holders[0].amount.toLocaleString()}`);
      console.log(`Smallest Holder: ${holders[holders.length - 1].amount.toLocaleString()}`);
      
      // Distribution analysis
      const over1M = holders.filter(h => h.amount >= 1_000_000).length;
      const over100k = holders.filter(h => h.amount >= 100_000).length;
      const over10k = holders.filter(h => h.amount >= 10_000).length;
      const over1k = holders.filter(h => h.amount >= 1_000).length;
      
      console.log('\nDistribution:');
      console.log('=============');
      console.log(`Holders with 1M+: ${over1M.toLocaleString()}`);
      console.log(`Holders with 100K+: ${over100k.toLocaleString()}`);
      console.log(`Holders with 10K+: ${over10k.toLocaleString()}`);
      console.log(`Holders with 1K+: ${over1k.toLocaleString()}`);
    } else {
      console.log('❌ No holders found');
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
