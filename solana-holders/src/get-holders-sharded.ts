// src/get-holders-sharded.ts
import dotenv from 'dotenv';
import { fetchHoldersSharded, fetchHoldersShardedByAccount } from './holders-sharded';

// Load environment variables
dotenv.config();

async function main() {
  const tokenMint = process.argv[2];
  const maxPrefixes = parseInt(process.argv[3]) || 5; // Default to 5 prefixes for testing
  const delayMs = parseInt(process.argv[4]) || 200; // Default to 200ms delay
  const method = process.argv[5] || 'owner'; // 'owner' or 'account'

  if (!tokenMint) {
    console.error('Usage: npx ts-node src/get-holders-sharded.ts <TOKEN_MINT_ADDRESS> [MAX_PREFIXES] [DELAY_MS] [METHOD]');
    console.error('');
    console.error('Arguments:');
    console.error('  TOKEN_MINT_ADDRESS  The SPL token mint address');
    console.error('  MAX_PREFIXES        Number of base58 prefixes to try (default: 5)');
    console.error('  DELAY_MS           Delay between requests in milliseconds (default: 200)');
    console.error('  METHOD             Sharding method: "owner" or "account" (default: owner)');
    console.error('');
    console.error('Examples:');
    console.error('  npx ts-node src/get-holders-sharded.ts EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v 3 500 owner');
    console.error('  npx ts-node src/get-holders-sharded.ts So11111111111111111111111111111111111111112 5 200 account');
    process.exit(1);
  }

  try {
    console.log(`🔍 Fetching holders for token: ${tokenMint}`);
    console.log(`📊 Method: ${method} prefix sharding`);
    console.log(`🔢 Max prefixes to try: ${maxPrefixes}`);
    console.log(`⏱️  Delay between requests: ${delayMs}ms\n`);

    const startTime = Date.now();
    
    let holders;
    if (method === 'account') {
      holders = await fetchHoldersShardedByAccount(tokenMint, maxPrefixes, delayMs);
    } else {
      holders = await fetchHoldersSharded(tokenMint, maxPrefixes, delayMs);
    }
    
    const endTime = Date.now();

    console.log(`\n✅ Completed sharded scan in ${endTime - startTime}ms\n`);

    if (holders.length > 0) {
      console.log(`Top 15 Holders:`);
      console.log('================');
      
      const topHolders = holders.slice(0, 15);
      topHolders.forEach((holder, index) => {
        console.log(`${index + 1}. Owner: ${holder.owner}`);
        console.log(`   Amount: ${holder.amount.toLocaleString()}`);
        console.log(`   Account: ${holder.account}`);
        console.log('');
      });

      console.log('Summary:');
      console.log('========');
      console.log(`Total Holders Found: ${holders.length.toLocaleString()}`);
      const totalHoldings = holders.reduce((sum, h) => sum + h.amount, 0);
      console.log(`Total Holdings: ${totalHoldings.toLocaleString()}`);
      console.log(`Average Holding: ${(totalHoldings / holders.length).toLocaleString()}`);
      console.log(`Largest Holder: ${holders[0].amount.toLocaleString()}`);
      console.log(`Smallest Holder: ${holders[holders.length - 1].amount.toLocaleString()}`);
      
      // Distribution analysis
      const over1M = holders.filter(h => h.amount >= 1_000_000).length;
      const over100k = holders.filter(h => h.amount >= 100_000).length;
      const over10k = holders.filter(h => h.amount >= 10_000).length;
      const over1k = holders.filter(h => h.amount >= 1_000).length;
      const over100 = holders.filter(h => h.amount >= 100).length;
      
      console.log('\nDistribution:');
      console.log('=============');
      console.log(`Holders with 1M+: ${over1M.toLocaleString()}`);
      console.log(`Holders with 100K+: ${over100k.toLocaleString()}`);
      console.log(`Holders with 10K+: ${over10k.toLocaleString()}`);
      console.log(`Holders with 1K+: ${over1k.toLocaleString()}`);
      console.log(`Holders with 100+: ${over100.toLocaleString()}`);

      // Show prefix distribution
      const prefixCounts = new Map<string, number>();
      holders.forEach(holder => {
        const prefix = holder.owner.charAt(0);
        prefixCounts.set(prefix, (prefixCounts.get(prefix) || 0) + 1);
      });

      console.log('\nOwner Prefix Distribution:');
      console.log('==========================');
      Array.from(prefixCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([prefix, count]) => {
          console.log(`'${prefix}': ${count.toLocaleString()} holders`);
        });

    } else {
      console.log('❌ No holders found');
    }

    console.log('\n💡 Note: This method only scans a subset of possible prefixes.');
    console.log('   Increase MAX_PREFIXES to get more complete results (but takes longer).');
    
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
