// src/index.ts
import express from 'express';
import dotenv from 'dotenv';
import { fetchHolders } from './holders';
import { fetchTopHolders } from './holders-alternative';
import { fetchHoldersAlchemyPaginated } from './holders-alchemy-paginated';
import { fetchHoldersShardedSimple, demonstrateShardingConcept } from './holders-sharded-simple';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.json());

// Original holders endpoint (may not work for large tokens)
app.get('/holders/:mint', async (req, res) => {
  try {
    const { mint } = req.params;
    
    if (!mint) {
      return res.status(400).json({ error: 'Mint address is required' });
    }

    const holders = await fetchHolders(mint);
    
    res.json({ 
      mint,
      count: holders.length, 
      holders 
    });
  } catch (err: any) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// New endpoint for top holders (more reliable for large tokens)
app.get('/top-holders/:mint', async (req, res) => {
  try {
    const { mint } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    
    if (!mint) {
      return res.status(400).json({ error: 'Mint address is required' });
    }

    const holders = await fetchTopHolders(mint, limit);
    
    res.json({ 
      mint,
      count: holders.length,
      limit,
      holders 
    });
  } catch (err: any) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// New endpoint for Alchemy paginated holders (experimental)
app.get('/holders-paginated/:mint', async (req, res) => {
  try {
    const { mint } = req.params;
    const maxPages = parseInt(req.query.maxPages as string) || 10;
    const pageSize = parseInt(req.query.pageSize as string) || 1000;
    
    if (!mint) {
      return res.status(400).json({ error: 'Mint address is required' });
    }

    // Check if we have an Alchemy RPC URL
    if (!process.env.SOLANA_RPC_URL || !process.env.SOLANA_RPC_URL.includes('alchemy.com')) {
      return res.status(400).json({ 
        error: 'This endpoint requires an Alchemy RPC URL configured' 
      });
    }

    const holders = await fetchHoldersAlchemyPaginated(mint, maxPages, pageSize);
    
    res.json({ 
      mint,
      count: holders.length,
      maxPages,
      pageSize,
      holders 
    });
  } catch (err: any) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// New endpoint for sharded holders (experimental)
app.get('/holders-sharded/:mint', async (req, res) => {
  try {
    const { mint } = req.params;
    const testMode = req.query.testMode === 'true';
    const method = req.query.method as string || 'simple';
    
    if (!mint) {
      return res.status(400).json({ error: 'Mint address is required' });
    }

    let holders;
    if (method === 'demo') {
      const numShards = parseInt(req.query.numShards as string) || 3;
      holders = await demonstrateShardingConcept(mint, numShards);
    } else {
      holders = await fetchHoldersShardedSimple(mint, testMode);
    }
    
    res.json({ 
      mint,
      count: holders.length,
      method: method === 'demo' ? 'sharding-demo' : 'simple-sharded',
      testMode,
      holders 
    });
  } catch (err: any) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Root endpoint with usage instructions
app.get('/', (req, res) => {
  res.json({
    message: 'Solana Token Holders API',
    endpoints: {
      '/holders/:mint': 'Get all holders for a token (may fail for large tokens)',
      '/top-holders/:mint?limit=20': 'Get top holders for a token (recommended)',
      '/holders-paginated/:mint?maxPages=10&pageSize=1000': 'Get all holders using Alchemy pagination (experimental)',
      '/holders-sharded/:mint?testMode=true&method=simple': 'Get holders using sharding approach (experimental)',
      '/health': 'Health check'
    },
    examples: {
      topHolders: '/top-holders/So11111111111111111111111111111111111111112?limit=10',
      paginated: '/holders-paginated/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v?maxPages=5&pageSize=500',
      sharded: '/holders-sharded/mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So?testMode=true',
      shardingDemo: '/holders-sharded/mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So?method=demo&numShards=3'
    }
  });
});

app.listen(PORT, () => {
  console.log(`☀️  Solana Holders API listening on http://localhost:${PORT}`);
  console.log(`Example: GET http://localhost:${PORT}/top-holders/So11111111111111111111111111111111111111112`);
});
