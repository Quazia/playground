// src/holders-paginated.ts
import { PublicKey } from '@solana/web3.js';
import { connection } from './solana';

export interface HolderInfo {
  owner: string;
  amount: number;
  account: string;
}

// Token Program ID
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

export async function fetchHoldersPaged(
  mintAddress: string,
  pageSize: number = 1000,
  maxPages?: number
): Promise<HolderInfo[]> {
  try {
    const mintPubkey = new PublicKey(mintAddress);
    console.log(`🔍 Fetching holders for mint: ${mintAddress} (pageSize: ${pageSize})`);
    
    let cursor: string | undefined = undefined;
    const allHolders: HolderInfo[] = [];
    let pageCount = 0;

    while (true) {
      pageCount++;
      console.log(`📄 Fetching page ${pageCount}${cursor ? ` (cursor: ${cursor.slice(0, 8)}...)` : ''}...`);

      // Build the RPC config with pagination
      const opts: any = {
        filters: [
          {
            dataSize: 165, // Token account data size
          },
          {
            memcmp: {
              offset: 0, // Mint address is at offset 0 in token account data
              bytes: mintPubkey.toBase58(),
            },
          },
        ],
        encoding: 'jsonParsed',
        limit: pageSize,
      };

      // Add cursor for pagination (if supported by RPC)
      if (cursor) {
        opts.before = cursor;
      }

      // Fetch one "page" of token accounts
      const response = await connection.getProgramAccounts(TOKEN_PROGRAM_ID, opts);
      const batch = Array.isArray(response) ? response : response.value || [];

      if (batch.length === 0) {
        console.log(`✅ Reached end of results on page ${pageCount}`);
        break;
      }

      console.log(`   Found ${batch.length} accounts on page ${pageCount}`);

      // Extract and process each account
      for (const { pubkey, account } of batch) {
        try {
          if (account.data && 'parsed' in account.data) {
            const info = account.data.parsed.info;
            const amount = info.tokenAmount?.uiAmount || 0;
            
            if (amount > 0) {
              allHolders.push({
                account: pubkey.toBase58(),
                owner: info.owner,
                amount: amount,
              });
            }
          }
        } catch (error) {
          console.warn(`⚠️  Failed to parse account ${pubkey.toBase58()}:`, error);
        }
      }

      // Set cursor to the last returned pubkey for next page
      if (batch.length > 0) {
        cursor = batch[batch.length - 1].pubkey.toBase58();
      }

      // Optional: limit maximum pages to prevent runaway queries
      if (maxPages && pageCount >= maxPages) {
        console.log(`🛑 Reached maximum page limit (${maxPages})`);
        break;
      }

      // Add a small delay to be respectful to the RPC
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`✅ Total pages processed: ${pageCount}`);
    console.log(`✅ Total unique holders found: ${allHolders.length}`);

    // Sort by amount descending
    return allHolders.sort((a, b) => b.amount - a.amount);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('limit') || error.message.includes('before')) {
        console.error('❌ Your RPC provider does not support pagination parameters.');
        console.error('💡 Try using a different RPC provider or use the top holders approach instead.');
      }
      throw new Error(`Failed to fetch holders with pagination: ${error.message}`);
    }
    throw new Error('Failed to fetch holders with pagination: Unknown error');
  }
}

export async function fetchHoldersWithFallback(
  mintAddress: string,
  pageSize: number = 1000,
  maxPages?: number
): Promise<HolderInfo[]> {
  try {
    // Try paginated approach first
    return await fetchHoldersPaged(mintAddress, pageSize, maxPages);
  } catch (error) {
    console.warn('⚠️  Paginated approach failed, falling back to top holders...');
    
    // Fallback to top holders approach
    const { fetchTopHolders } = await import('./holders-alternative');
    return await fetchTopHolders(mintAddress, 100); // Get top 100 instead
  }
}
