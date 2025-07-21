// src/test-sharding-concept.ts
import dotenv from 'dotenv';
import { fetchHoldersShardedSimple, demonstrateShardingConcept } from './holders-sharded-simple';

// Load environment variables
dotenv.config();

async function main() {
  console.log('🧪 Testing Sharding Concept for Solana Token Holders\n');
  
  // Try to find a smaller token that we can actually scan
  const testTokens = [
    {
      name: 'Test Token 1',
      mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // Bonk - might be smaller
      description: 'Bonk token'
    },
    {
      name: 'Test Token 2', 
      mint: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', // Marinade SOL
      description: 'Marinade staked SOL'
    },
    {
      name: 'Test Token 3',
      mint: 'bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1', // Blaze SOL
      description: 'Blaze staked SOL'
    }
  ];

  for (const token of testTokens) {
    console.log(`\n🔍 Testing with ${token.name} (${token.description})`);
    console.log(`   Mint: ${token.mint}`);
    
    try {
      console.log('\n--- Method 1: Simple Sharded Approach (Test Mode) ---');
      const holders1 = await fetchHoldersShardedSimple(token.mint, true);
      
      if (holders1.length > 0) {
        console.log(`✅ Success! Found ${holders1.length} holders`);
        console.log('Top 5 holders:');
        holders1.slice(0, 5).forEach((holder, i) => {
          console.log(`  ${i + 1}. ${holder.amount.toLocaleString()} tokens (${holder.owner.slice(0, 8)}...)`);
        });
        
        console.log('\n--- Method 2: Artificial Sharding Demonstration ---');
        const holders2 = await demonstrateShardingConcept(token.mint, 3);
        console.log(`✅ Sharding demo completed! Found ${holders2.length} holders`);
        
        // This token works! Stop here for detailed analysis
        console.log(`\n🎉 Found a working token for sharding demonstration!`);
        console.log(`   Token: ${token.name}`);
        console.log(`   Mint: ${token.mint}`);
        console.log(`   Holders found: ${holders1.length} (test mode)`);
        break;
        
      } else {
        console.log(`❌ No holders found for ${token.name}`);
      }
      
    } catch (error) {
      console.log(`❌ Failed to scan ${token.name}: ${error instanceof Error ? error.message : error}`);
    }
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n📝 Summary:');
  console.log('==========');
  console.log('The sharding concept works by:');
  console.log('1. Splitting large account lists into smaller chunks');
  console.log('2. Processing each chunk with delays to avoid rate limits');
  console.log('3. Aggregating results from all chunks');
  console.log('4. Removing duplicates and sorting by amount');
  console.log('');
  console.log('💡 For production use:');
  console.log('- Use smaller page sizes and longer delays');
  console.log('- Implement retry logic for failed shards');
  console.log('- Consider caching results');
  console.log('- Use prefix-based sharding for more even distribution');
}

main().catch(console.error);
