# Solana Token Holders

A minimal TypeScript service to fetch Solana SPL token holders information.

## Features

- Fetch all holders for any SPL token
- Command-line interface for quick queries
- Express API server for HTTP requests
- TypeScript with proper type safety
- Sorted results by holding amount

## Setup

```bash
cd solana-holders
npm install
```

### Environment Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` to configure your RPC endpoint:
```env
# Solana RPC Configuration
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# For better performance, use a dedicated RPC provider:
# SOLANA_RPC_URL=https://your-endpoint.solana-mainnet.quiknode.pro/your-token/
# SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=your-api-key

# Server Configuration  
PORT=3000
```

## Usage

### Command Line Interface

#### Top Holders (Recommended)
Get the largest holders for any token:

```bash
npx ts-node src/get-top-holders.ts <MINT_ADDRESS> [LIMIT]
```

Example with USDC top 10 holders:
```bash
npx ts-node src/get-top-holders.ts EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v 10
```

#### Alchemy Pagination (Experimental)
Get all holders using Alchemy's pageKey pagination:

```bash
npx ts-node src/get-holders-alchemy.ts <MINT_ADDRESS> [MAX_PAGES] [PAGE_SIZE]
```

Example:
```bash
npx ts-node src/get-holders-alchemy.ts EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v 5 500
```

#### Legacy Method
Get all holders (may fail for large tokens):

```bash
npx ts-node src/get-holders.ts <MINT_ADDRESS>
```

### API Server

Start the Express server:

```bash
npm run build
node dist/index.js
```

#### Available Endpoints

1. **Top Holders** (Recommended):
```bash
GET http://localhost:3000/top-holders/:mint?limit=20
```

2. **Alchemy Pagination** (Experimental):
```bash 
GET http://localhost:3000/holders-paginated/:mint?maxPages=10&pageSize=1000
```

3. **All Holders** (Legacy, may fail for large tokens):
```bash
GET http://localhost:3000/holders/:mint
```

4. **Health Check**:
```bash
GET http://localhost:3000/health
```

#### Examples

```bash
# Get top 10 USDC holders
curl "http://localhost:3000/top-holders/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v?limit=10"

# Get holders using Alchemy pagination (requires Alchemy RPC)
curl "http://localhost:3000/holders-paginated/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v?maxPages=5&pageSize=500"

# Health check
curl "http://localhost:3000/health"
```

API Response format:
```json
{
  "mint": "So11111111111111111111111111111111111111112",
  "count": 42,
  "holders": [
    {
      "account": "5Fh...XyZ",
      "owner": "G7r...TAb", 
      "amount": 100.5
    }
  ]
}
```

### Build for Production

```bash
npm run build
npm start
```

## Environment Variables

The service supports the following environment variables (configured in `.env`):

- `SOLANA_RPC_URL`: Solana RPC endpoint URL 
  - Default: `https://api.mainnet-beta.solana.com` (public mainnet)
  - Recommended: Use a dedicated RPC provider for production
- `PORT`: Express server port (defaults to 3000)

### Recommended RPC Providers

For production use, consider using a dedicated RPC provider for better performance and higher rate limits:

- **QuickNode**: https://www.quicknode.com/
- **Helius**: https://www.helius.dev/  
- **Alchemy**: https://www.alchemy.com/
- **GenesysGo**: https://genesysgo.com/

## Examples

### Popular Token Mints

- **Wrapped SOL**: `So11111111111111111111111111111111111111112`
- **USDC**: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- **USDT**: `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`

### Sample Output

```
🔍 Fetching holders for token: So11111111111111111111111111111111111111112

Found 156743 token accounts

✅ Found 156743 holders in 2847ms

Top 10 Holders:
================
1. Owner: 5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1
   Amount: 11,365,067
   Account: 7YttLkHDoNj9wyDur5pM1ejNaAvT9X4eqaYcHQqtj2G5

2. Owner: 7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj
   Amount: 6,053,141.23
   Account: GJmC2mXBs7hcWJJr4hXTr8hcVJLyYDEG4jxdXD69YVNu

... and 156733 more holders

Summary:
========
Total Holders: 156743
Total Supply: 523,456,789.12
Average Holding: 3,339.21
Largest Holder: 11,365,067
Smallest Holder: 0.000001
```

## Notes

- The script filters out zero-balance accounts
- Results are sorted by holding amount (largest first)
- Uses the official Solana JSON-RPC API
- May take time for tokens with many holders
- Consider using a private RPC endpoint for better performance
