// src/test-helius.ts
import dotenv from 'dotenv';
import { fetchHoldersPageHelius, fetchAllHoldersHelius } from './holders-helius';

// Load environment variables
dotenv.config();

async function main() {
  const tokenMint = process.argv[2] || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // Default to USDC
  const pageSize = parseInt(process.argv[3]) || 100;
  const testMode = process.argv[4] === 'full' ? false : true; // Default to single page test

  console.log('🚀 Testing Helius Token Accounts API\n');

  console.log('🔍 Environment check:');
  console.log(`   HELIUS_API_KEY exists: ${!!process.env.HELIUS_API_KEY}`);
  console.log(`   HELIUS_API_KEY length: ${process.env.HELIUS_API_KEY?.length || 0}`);
  console.log(`   HELIUS_API_KEY value: ${process.env.HELIUS_API_KEY ? process.env.HELIUS_API_KEY.slice(0, 8) + '...' : 'undefined'}\n`);

  if (!process.env.HELIUS_API_KEY) {
    console.error('❌ Error: HELIUS_API_KEY not found in environment variables');
    console.error('   Please add your Helius API key to the .env file');
    process.exit(1);
  }

  try {
    if (testMode) {
      console.log('🧪 Test Mode: Fetching single page of holders');
      console.log(`   Token: ${tokenMint}`);
      console.log(`   Page size: ${pageSize}\n`);

      const startTime = Date.now();
      const { holders, nextCursor } = await fetchHoldersPageHelius(tokenMint, pageSize);
      const endTime = Date.now();

      console.log(`\n📊 Results (${endTime - startTime}ms):`);
      console.log('=================');
      console.log(`Total holders in this page: ${holders.length}`);
      console.log(`Has more pages: ${nextCursor ? 'Yes' : 'No'}`);
      if (nextCursor) {
        console.log(`Next cursor: ${nextCursor.slice(0, 40)}...`);
      }

      if (holders.length > 0) {
        console.log(`\nTop 10 holders from this page:`);
        console.log('===============================');
        
        const topHolders = holders.slice(0, 10);
        topHolders.forEach((holder, index) => {
          console.log(`${index + 1}. ${holder.amount.toLocaleString()} tokens`);
          console.log(`   Owner: ${holder.owner}`);
          console.log(`   Account: ${holder.account}`);
          console.log('');
        });

        // Show distribution for this page
        const amounts = holders.map(h => h.amount);
        const totalInPage = amounts.reduce((sum, amt) => sum + amt, 0);
        const avgInPage = totalInPage / amounts.length;
        const medianInPage = amounts[Math.floor(amounts.length / 2)];

        console.log('Page Statistics:');
        console.log('================');
        console.log(`Total tokens in page: ${totalInPage.toLocaleString()}`);
        console.log(`Average holding: ${avgInPage.toLocaleString()}`);
        console.log(`Median holding: ${medianInPage.toLocaleString()}`);
        console.log(`Largest holding: ${amounts[0].toLocaleString()}`);
        console.log(`Smallest holding: ${amounts[amounts.length - 1].toLocaleString()}`);
      }

    } else {
      console.log('🔥 Full Mode: Fetching ALL holders (be patient!)');
      console.log(`   Token: ${tokenMint}`);
      console.log(`   Page size: ${pageSize}\n`);

      const startTime = Date.now();
      const allHolders = await fetchAllHoldersHelius(tokenMint, pageSize, 10); // Limit to 10 pages for safety
      const endTime = Date.now();

      console.log(`\n📊 Final Results (${endTime - startTime}ms):`);
      console.log('===================');
      console.log(`Total unique holders: ${allHolders.length.toLocaleString()}`);

      if (allHolders.length > 0) {
        console.log(`\nTop 15 holders overall:`);
        console.log('======================');
        
        const topHolders = allHolders.slice(0, 15);
        topHolders.forEach((holder, index) => {
          console.log(`${index + 1}. ${holder.amount.toLocaleString()} tokens`);
          console.log(`   Owner: ${holder.owner}`);
          console.log('');
        });

        // Overall statistics
        const amounts = allHolders.map(h => h.amount);
        const total = amounts.reduce((sum, amt) => sum + amt, 0);
        const avg = total / amounts.length;

        console.log('Overall Statistics:');
        console.log('===================');
        console.log(`Total tokens held: ${total.toLocaleString()}`);
        console.log(`Average holding: ${avg.toLocaleString()}`);
        console.log(`Largest holding: ${amounts[0].toLocaleString()}`);
        console.log(`Smallest holding: ${amounts[amounts.length - 1].toLocaleString()}`);

        // Distribution analysis
        const over1M = allHolders.filter(h => h.amount >= 1_000_000).length;
        const over100k = allHolders.filter(h => h.amount >= 100_000).length;
        const over10k = allHolders.filter(h => h.amount >= 10_000).length;
        const over1k = allHolders.filter(h => h.amount >= 1_000).length;

        console.log('\nDistribution:');
        console.log('=============');
        console.log(`Holders with 1M+: ${over1M.toLocaleString()}`);
        console.log(`Holders with 100K+: ${over100k.toLocaleString()}`);
        console.log(`Holders with 10K+: ${over10k.toLocaleString()}`);
        console.log(`Holders with 1K+: ${over1k.toLocaleString()}`);
      }
    }

    console.log('\n💡 To test different options:');
    console.log('  Single page: npx ts-node src/test-helius.ts [MINT] [PAGE_SIZE]');
    console.log('  Full scan:   npx ts-node src/test-helius.ts [MINT] [PAGE_SIZE] full');
    console.log('');
    console.log('  Examples:');
    console.log('    npx ts-node src/test-helius.ts EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v 50');
    console.log('    npx ts-node src/test-helius.ts So11111111111111111111111111111111111111112 200 full');

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
