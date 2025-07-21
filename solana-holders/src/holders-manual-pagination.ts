// src/holders-manual-pagination.ts
import { PublicKey } from '@solana/web3.js';
import { connection } from './solana';

export interface HolderInfo {
  owner: string;
  amount: number;
  account: string;
}

// Token Program ID
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

/**
 * Manual pagination approach using dataSlice to get chunks of data
 * This works even when RPC doesn't support cursor pagination
 */
export async function fetchHoldersManualPagination(
  mintAddress: string,
  chunkSize: number = 10000,
  maxAccounts?: number
): Promise<HolderInfo[]> {
  try {
    const mintPubkey = new PublicKey(mintAddress);
    console.log(`🔍 Fetching holders with manual pagination (chunkSize: ${chunkSize})`);
    
    // First, get all account addresses without data
    console.log(`📋 Step 1: Getting all token account addresses...`);
    const accountAddresses = await connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
      filters: [
        {
          dataSize: 165, // Token account data size
        },
        {
          memcmp: {
            offset: 0,
            bytes: mintPubkey.toBase58(),
          },
        },
      ],
      dataSlice: { offset: 0, length: 0 }, // Get no data, just addresses
    });

    console.log(`   Found ${accountAddresses.length} token accounts`);

    let processedAddresses = accountAddresses;
    if (maxAccounts && accountAddresses.length > maxAccounts) {
      console.log(`🛑 Limiting to first ${maxAccounts} accounts`);
      processedAddresses = accountAddresses.slice(0, maxAccounts);
    }

    // Process accounts in chunks
    const allHolders: HolderInfo[] = [];
    const chunks = [];
    
    for (let i = 0; i < processedAddresses.length; i += chunkSize) {
      chunks.push(processedAddresses.slice(i, i + chunkSize));
    }

    console.log(`📦 Step 2: Processing ${chunks.length} chunks of ${chunkSize} accounts each...`);

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      console.log(`   Processing chunk ${chunkIndex + 1}/${chunks.length} (${chunk.length} accounts)...`);

      // Get parsed account info for each account in this chunk
      const accountInfos = await connection.getMultipleAccountsInfo(
        chunk.map(acc => acc.pubkey)
      );

      // Process each account
      for (let i = 0; i < chunk.length; i++) {
        const accountInfo = accountInfos[i];
        const pubkey = chunk[i].pubkey;

        if (accountInfo && accountInfo.data) {
          // Parse the account data manually since getMultipleAccountsInfo doesn't support jsonParsed
          // We'll need to use a different approach or getParsedAccountInfo individually
          try {
            const parsedInfo = await connection.getParsedAccountInfo(pubkey);
            if (parsedInfo.value?.data && 'parsed' in parsedInfo.value.data) {
              const info = parsedInfo.value.data.parsed.info as any;
              const amount = info.tokenAmount?.uiAmount || 0;
            const amount = info.tokenAmount?.uiAmount || 0;
            
            if (amount > 0) {
              allHolders.push({
                account: pubkey.toBase58(),
                owner: info.owner,
                amount: amount,
              });
            }
          } catch (error) {
            console.warn(`⚠️  Failed to parse account ${pubkey.toBase58()}:`, error);
          }
        }
      }

      // Add delay between chunks to be respectful
      if (chunkIndex < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.log(`✅ Manual pagination complete: ${allHolders.length} holders found`);

    // Sort by amount descending
    return allHolders.sort((a, b) => b.amount - a.amount);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch holders with manual pagination: ${error.message}`);
    }
    throw new Error('Failed to fetch holders with manual pagination: Unknown error');
  }
}

/**
 * Smart pagination that tries multiple approaches
 */
export async function fetchHoldersSmartPagination(
  mintAddress: string,
  options: {
    preferredMethod?: 'cursor' | 'manual' | 'top-holders';
    pageSize?: number;
    maxPages?: number;
    chunkSize?: number;
    maxAccounts?: number;
  } = {}
): Promise<HolderInfo[]> {
  const {
    preferredMethod = 'cursor',
    pageSize = 1000,
    maxPages,
    chunkSize = 5000,
    maxAccounts
  } = options;

  console.log(`🧠 Smart pagination starting with method: ${preferredMethod}`);

  // Try cursor-based pagination first (if preferred)
  if (preferredMethod === 'cursor') {
    try {
      const { fetchHoldersPaged } = await import('./holders-paginated');
      return await fetchHoldersPaged(mintAddress, pageSize, maxPages);
    } catch (error) {
      console.warn('⚠️  Cursor pagination failed, trying manual pagination...');
    }
  }

  // Try manual pagination
  if (preferredMethod === 'manual' || preferredMethod === 'cursor') {
    try {
      return await fetchHoldersManualPagination(mintAddress, chunkSize, maxAccounts);
    } catch (error) {
      console.warn('⚠️  Manual pagination failed, falling back to top holders...');
    }
  }

  // Fallback to top holders
  console.log('🔄 Using top holders approach as fallback...');
  const { fetchTopHolders } = await import('./holders-alternative');
  return await fetchTopHolders(mintAddress, 100);
}
