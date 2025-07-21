// src/test-max-page-size.ts
import dotenv from 'dotenv';
import { fetchHoldersPageHelius } from './holders-helius';

dotenv.config();

const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

async function testMaxPageSize() {
  console.log('🧪 Testing Maximum Page Size for Helius API\n');
  
  // Test different page sizes to find the limit
  const pageSizesToTest = [
    1000,   // Current working size
    2000,   // 2x current
    5000,   // 5x current  
    10000,  // 10x current
    20000,  // 20x current
    50000,  // Very large
    100000, // Maximum attempt
  ];

  for (const pageSize of pageSizesToTest) {
    console.log(`\n📄 Testing page size: ${pageSize.toLocaleString()}`);
    console.log('='.repeat(50));
    
    try {
      const startTime = Date.now();
      const { holders, nextCursor } = await fetchHoldersPageHelius(USDC_MINT, pageSize);
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      console.log(`✅ SUCCESS`);
      console.log(`   Holders returned: ${holders.length.toLocaleString()}`);
      console.log(`   Response time: ${responseTime.toLocaleString()}ms (${(responseTime/1000).toFixed(1)}s)`);
      console.log(`   Has next cursor: ${nextCursor ? 'Yes' : 'No'}`);
      console.log(`   Throughput: ${Math.round(holders.length / (responseTime/1000)).toLocaleString()} holders/second`);
      
      if (holders.length > 0) {
        const avgHolding = holders.reduce((sum, h) => sum + h.amount, 0) / holders.length;
        console.log(`   Average holding: ${avgHolding.toLocaleString()} USDC`);
        console.log(`   Largest holding: ${Math.max(...holders.map(h => h.amount)).toLocaleString()} USDC`);
      }
      
      // If we got fewer holders than requested, we might have hit a limit or end of data
      if (holders.length < pageSize && !nextCursor) {
        console.log(`   📝 NOTE: Returned ${holders.length} < ${pageSize} requested (end of data)`);
      } else if (holders.length < pageSize) {
        console.log(`   ⚠️  NOTE: Returned ${holders.length} < ${pageSize} requested (possible API limit)`);
      }
      
    } catch (error) {
      console.log(`❌ FAILED`);
      console.log(`   Error: ${error instanceof Error ? error.message : error}`);
      
      // Check if it's a specific API limit error
      const errorStr = String(error);
      if (errorStr.includes('limit') || errorStr.includes('size') || errorStr.includes('maximum')) {
        console.log(`   📝 This appears to be a page size limit error`);
        break; // Stop testing larger sizes
      }
    }
    
    // Add delay between tests to be respectful
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n🎯 SUMMARY & RECOMMENDATIONS');
  console.log('='.repeat(50));
  console.log('Based on the tests above:');
  console.log('• Find the largest successful page size for optimal efficiency');
  console.log('• Balance page size vs response time for your use case');
  console.log('• Larger pages = fewer API calls but longer individual response times');
  console.log('• Consider your timeout settings when choosing page size');
  console.log('\n💡 For production use:');
  console.log('• Use the largest reliable page size found');
  console.log('• Implement timeout handling for large page requests');
  console.log('• Consider parallel processing if API rate limits allow');
}

testMaxPageSize().catch(console.error);
