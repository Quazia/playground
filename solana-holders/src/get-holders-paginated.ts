// src/get-holders-paginated.ts
import dotenv from 'dotenv';
import { fetchHoldersPaged, fetchHoldersWithFallback } from './holders-paginated';

// Load environment variables
dotenv.config();

async function main() {
  const tokenMint = process.argv[2];
  const pageSize = parseInt(process.argv[3]) || 1000;
  const maxPages = process.argv[4] ? parseInt(process.argv[4]) : undefined;
  const useFallback = process.argv.includes('--fallback');

  if (!tokenMint) {
    console.error('Usage: npx ts-node src/get-holders-paginated.ts <TOKEN_MINT> [PAGE_SIZE] [MAX_PAGES] [--fallback]');
    console.error('');
    console.error('Examples:');
    console.error('  npx ts-node src/get-holders-paginated.ts EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v 500 5');
    console.error('  npx ts-node src/get-holders-paginated.ts So11111111111111111111111111111111111111112 1000');
    console.error('  npx ts-node src/get-holders-paginated.ts <TOKEN> 1000 10 --fallback');
    console.error('');
    console.error('Parameters:');
    console.error('  TOKEN_MINT: The mint address of the SPL token');
    console.error('  PAGE_SIZE:  Number of accounts to fetch per page (default: 1000)');
    console.error('  MAX_PAGES:  Maximum number of pages to fetch (optional, prevents runaway)');
    console.error('  --fallback: Use fallback to top holders if pagination fails');
    process.exit(1);
  }

  try {
    console.log(`🚀 Starting${useFallback ? ' (with fallback)' : ''}: ${tokenMint}`);
    console.log(`📊 Page size: ${pageSize}${maxPages ? `, Max pages: ${maxPages}` : ''}\n`);

    const startTime = Date.now();
    
    let holders;
    if (useFallback) {
      holders = await fetchHoldersWithFallback(tokenMint, pageSize, maxPages);
    } else {
      holders = await fetchHoldersPaged(tokenMint, pageSize, maxPages);
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`\n🎉 Processing complete!`);
    console.log(`⏱️  Total time: ${duration}ms (${(duration / 1000).toFixed(1)}s)`);
    console.log(`👥 Total holders: ${holders.length.toLocaleString()}`);

    if (holders.length > 0) {
      console.log(`\n📈 Summary Statistics:`);
      console.log(`================`);
      
      const totalSupply = holders.reduce((sum, h) => sum + h.amount, 0);
      const avgHolding = totalSupply / holders.length;
      
      console.log(`Largest holding: ${holders[0].amount.toLocaleString()}`);
      console.log(`Smallest holding: ${holders[holders.length - 1].amount.toLocaleString()}`);
      console.log(`Average holding: ${avgHolding.toLocaleString()}`);
      console.log(`Total circulating: ${totalSupply.toLocaleString()}`);

      // Show top 10 holders
      const topCount = Math.min(10, holders.length);
      console.log(`\n🏆 Top ${topCount} Holders:`);
      console.log(`================`);
      
      holders.slice(0, topCount).forEach((holder, index) => {
        const percentage = ((holder.amount / totalSupply) * 100).toFixed(4);
        console.log(`${index + 1}. ${holder.owner}`);
        console.log(`   Amount: ${holder.amount.toLocaleString()} (${percentage}%)`);
        console.log(`   Account: ${holder.account}`);
        console.log('');
      });

      // Show distribution breakdown
      const top10Percent = holders.slice(0, Math.ceil(holders.length * 0.1))
        .reduce((sum, h) => sum + h.amount, 0);
      const top10PercentOfSupply = ((top10Percent / totalSupply) * 100).toFixed(2);
      
      console.log(`📊 Distribution Analysis:`);
      console.log(`================`);
      console.log(`Top 10% of holders control: ${top10PercentOfSupply}% of supply`);
      console.log(`Holders with >1% of supply: ${holders.filter(h => (h.amount / totalSupply) > 0.01).length}`);
      console.log(`Holders with >0.1% of supply: ${holders.filter(h => (h.amount / totalSupply) > 0.001).length}`);
    } else {
      console.log('❌ No holders found');
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
