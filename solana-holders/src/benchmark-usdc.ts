// src/benchmark-usdc.ts
import dotenv from 'dotenv';
import { fetchHoldersPageHelius } from './holders-helius';

dotenv.config();

const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

interface BenchmarkResult {
  pageNumber: number;
  holders: number;
  responseTime: number;
  cursor: string | undefined;
  totalTime: number;
}

async function benchmarkUSDCHolders() {
  console.log('🚀 USDC Holders Benchmark\n');
  console.log('=====================================');
  console.log(`Token: ${USDC_MINT}`);
  console.log(`Target: Get total count and performance metrics\n`);

  const results: BenchmarkResult[] = [];
  const pageSize = 1000; // Use larger pages for efficiency
  const maxPages = 10; // Limit for initial benchmark
  let cursor: string | undefined;
  let totalHolders = 0;
  let totalTime = 0;
  const overallStartTime = Date.now();

  try {
    for (let page = 1; page <= maxPages; page++) {
      console.log(`📄 Fetching page ${page}...`);
      
      const startTime = Date.now();
      const { holders, nextCursor } = await fetchHoldersPageHelius(USDC_MINT, pageSize, cursor);
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      totalHolders += holders.length;
      totalTime = endTime - overallStartTime;
      
      const result: BenchmarkResult = {
        pageNumber: page,
        holders: holders.length,
        responseTime,
        cursor: nextCursor,
        totalTime
      };
      
      results.push(result);
      
      console.log(`   ✅ Page ${page}: ${holders.length} holders in ${responseTime}ms`);
      console.log(`   📊 Running total: ${totalHolders.toLocaleString()} holders`);
      console.log(`   ⏱️  Cumulative time: ${totalTime}ms`);
      
      if (holders.length > 0) {
        const avgHolding = holders.reduce((sum, h) => sum + h.amount, 0) / holders.length;
        const maxHolding = Math.max(...holders.map(h => h.amount));
        const minHolding = Math.min(...holders.map(h => h.amount));
        console.log(`   💰 Holdings range: ${minHolding.toLocaleString()} - ${maxHolding.toLocaleString()} (avg: ${avgHolding.toLocaleString()})`);
      }
      
      cursor = nextCursor;
      
      if (!cursor) {
        console.log(`\n🏁 Reached end of data at page ${page}`);
        break;
      }
      
      console.log(`   🔗 Next cursor: ${cursor.slice(0, 40)}...\n`);
      
      // Add small delay to be respectful to API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Calculate statistics
    console.log('\n📊 BENCHMARK RESULTS');
    console.log('=====================================');
    
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
    const minResponseTime = Math.min(...results.map(r => r.responseTime));
    const maxResponseTime = Math.max(...results.map(r => r.responseTime));
    
    console.log(`Total pages fetched: ${results.length}`);
    console.log(`Total holders sampled: ${totalHolders.toLocaleString()}`);
    console.log(`Total time: ${totalTime.toLocaleString()}ms (${(totalTime / 1000).toFixed(1)}s)`);
    console.log(`Average response time: ${avgResponseTime.toFixed(1)}ms`);
    console.log(`Response time range: ${minResponseTime}ms - ${maxResponseTime}ms`);
    console.log(`Throughput: ${(totalHolders / (totalTime / 1000)).toFixed(0)} holders/second`);
    
    // Extrapolation estimates
    if (cursor) {
      console.log('\n🔮 EXTRAPOLATION ESTIMATES');
      console.log('=====================================');
      
      // Try to get a sense of total scale by making a few test calls
      console.log('Attempting to estimate total holder count...');
      
      // We'll make additional calls with different page sizes to get better estimates
      const estimatePageSize = 100;
      console.log(`\nTesting with smaller pages (${estimatePageSize}) to estimate total...`);
      
      let estimatePages = 0;
      let estimateCursor: string | undefined = cursor;
      const maxEstimatePages = 5;
      
      for (let i = 0; i < maxEstimatePages && estimateCursor; i++) {
        const start = Date.now();
        const { holders: estimateHolders, nextCursor } = await fetchHoldersPageHelius(USDC_MINT, estimatePageSize, estimateCursor);
        const time = Date.now() - start;
        
        estimatePages++;
        estimateCursor = nextCursor;
        
        console.log(`   Estimate page ${i + 1}: ${estimateHolders.length} holders in ${time}ms`);
        
        if (!estimateCursor) {
          console.log('   🎯 Found end of data in estimate!');
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Calculate estimates based on what we've seen
      const holdersPerPage = totalHolders / results.length;
      const timePerPage = avgResponseTime;
      
      console.log(`\nBased on ${results.length} pages sampled:`);
      console.log(`Average holders per page: ${holdersPerPage.toFixed(0)}`);
      console.log(`Average time per page: ${timePerPage.toFixed(1)}ms`);
      
      // Conservative estimates for different scenarios
      const scenarios = [
        { name: 'Conservative (1M holders)', totalHolders: 1_000_000 },
        { name: 'Moderate (5M holders)', totalHolders: 5_000_000 },
        { name: 'High (10M holders)', totalHolders: 10_000_000 },
        { name: 'Very High (20M holders)', totalHolders: 20_000_000 }
      ];
      
      console.log('\nTime estimates for complete scan:');
      scenarios.forEach(scenario => {
        const pagesNeeded = Math.ceil(scenario.totalHolders / holdersPerPage);
        const timeNeeded = pagesNeeded * timePerPage;
        const timeMinutes = timeNeeded / (1000 * 60);
        const timeHours = timeMinutes / 60;
        
        console.log(`   ${scenario.name}:`);
        console.log(`     - Pages needed: ${pagesNeeded.toLocaleString()}`);
        console.log(`     - Time: ${timeNeeded.toLocaleString()}ms (${timeMinutes.toFixed(1)} min / ${timeHours.toFixed(2)} hours)`);
      });
    }
    
    console.log('\n💡 RECOMMENDATIONS');
    console.log('=====================================');
    console.log('• Use larger page sizes (1000+) for efficiency');
    console.log('• Implement parallel processing if API allows');
    console.log('• Consider caching results due to long scan times');
    console.log('• Monitor API rate limits during full scans');
    console.log('• Set up resume capability using cursors');
    
    console.log('\n📝 DETAILED RESULTS');
    console.log('=====================================');
    results.forEach(result => {
      console.log(`Page ${result.pageNumber}: ${result.holders} holders, ${result.responseTime}ms, cursor: ${result.cursor ? 'yes' : 'no'}`);
    });

  } catch (error) {
    console.error('❌ Benchmark failed:', error);
    process.exit(1);
  }
}

benchmarkUSDCHolders();
