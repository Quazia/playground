// src/get-top-holders.ts
import dotenv from 'dotenv';
import { fetchTopHolders, getTokenSupplyInfo } from './holders-alternative';

// Load environment variables
dotenv.config();

async function main() {
  const tokenMint = process.argv[2];
  const limit = parseInt(process.argv[3]) || 20;

  if (!tokenMint) {
    console.error('Usage: npx ts-node src/get-top-holders.ts <TOKEN_MINT_ADDRESS> [LIMIT]');
    console.error('Example: npx ts-node src/get-top-holders.ts EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v 10');
    process.exit(1);
  }

  try {
    console.log(`🔍 Fetching top ${limit} holders for token: ${tokenMint}\n`);

    const startTime = Date.now();
    
    // Get token supply info
    const supplyInfo = await getTokenSupplyInfo(tokenMint);
    console.log(`📊 Token Supply Info:`);
    console.log(`   Total Supply: ${supplyInfo.totalSupply?.toLocaleString()}`);
    console.log(`   Decimals: ${supplyInfo.decimals}\n`);

    // Get top holders
    const holders = await fetchTopHolders(tokenMint, limit);
    const endTime = Date.now();

    console.log(`✅ Found ${holders.length} top holders in ${endTime - startTime}ms\n`);

    if (holders.length > 0) {
      console.log(`Top ${holders.length} Holders:`);
      console.log('================');
      
      holders.forEach((holder, index) => {
        console.log(`${index + 1}. Owner: ${holder.owner}`);
        console.log(`   Amount: ${holder.amount.toLocaleString()}`);
        console.log(`   Account: ${holder.account}`);
        if (supplyInfo.totalSupply) {
          const percentage = ((holder.amount / supplyInfo.totalSupply) * 100).toFixed(4);
          console.log(`   % of Supply: ${percentage}%`);
        }
        console.log('');
      });

      console.log('Summary:');
      console.log('========');
      console.log(`Top ${holders.length} Holders: ${holders.length}`);
      const totalTopHoldings = holders.reduce((sum, h) => sum + h.amount, 0);
      console.log(`Total Held by Top ${holders.length}: ${totalTopHoldings.toLocaleString()}`);
      if (supplyInfo.totalSupply) {
        const topHoldersPercentage = ((totalTopHoldings / supplyInfo.totalSupply) * 100).toFixed(2);
        console.log(`% of Total Supply: ${topHoldersPercentage}%`);
      }
      console.log(`Largest Holder: ${holders[0].amount.toLocaleString()}`);
      console.log(`Smallest (of top ${holders.length}): ${holders[holders.length - 1].amount.toLocaleString()}`);
    } else {
      console.log('❌ No holders found');
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
