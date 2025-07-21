// src/holders-sharded.ts
import { PublicKey } from '@solana/web3.js';
import { connection } from './solana';

export interface HolderInfo {
  owner: string;
  amount: number;        // uiAmount
  account: string;       // token-account pubkey
}

// Base58 alphabet for sharding
const BASE58_PREFIXES = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'.split('');

// Token Program ID
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

export async function fetchHoldersSharded(
  mintAddress: string,
  maxPrefixes: number = 10,  // Limit number of prefixes to test
  delayMs: number = 100      // Delay between requests to avoid rate limiting
): Promise<HolderInfo[]> {
  try {
    const mintPubkey = new PublicKey(mintAddress);
    console.log(`Fetching holders for mint: ${mintAddress} using prefix sharding`);
    console.log(`Testing ${maxPrefixes} prefixes with ${delayMs}ms delay between requests\n`);

    let allHolders: HolderInfo[] = [];
    let successfulShards = 0;
    let failedShards = 0;

    // Try different sharding strategies
    const prefixesToTry = BASE58_PREFIXES.slice(0, maxPrefixes);
    
    for (let i = 0; i < prefixesToTry.length; i++) {
      const prefix = prefixesToTry[i];
      
      try {
        console.log(`Shard ${i + 1}/${prefixesToTry.length}: Scanning accounts with owner starting with '${prefix}'...`);
        
        const shardHolders = await fetchShardByOwnerPrefix(mintPubkey, prefix);
        allHolders = allHolders.concat(shardHolders);
        successfulShards++;
        
        console.log(`  ✅ Found ${shardHolders.length} holders in shard '${prefix}' (${allHolders.length} total)`);
        
        // Add delay to avoid rate limiting
        if (i < prefixesToTry.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        
      } catch (error) {
        failedShards++;
        console.log(`  ❌ Shard '${prefix}' failed: ${error instanceof Error ? error.message : error}`);
        
        // Still add delay even on failure
        if (i < prefixesToTry.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    // Remove duplicates (shouldn't happen but just in case)
    const uniqueHolders = removeDuplicateHolders(allHolders);
    
    // Sort by amount descending
    uniqueHolders.sort((a, b) => b.amount - a.amount);

    console.log(`\n📊 Sharding Summary:`);
    console.log(`   Successful shards: ${successfulShards}`);
    console.log(`   Failed shards: ${failedShards}`);
    console.log(`   Total unique holders: ${uniqueHolders.length}`);
    
    return uniqueHolders;
    
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch holders with sharding: ${error.message}`);
    }
    throw new Error('Failed to fetch holders with sharding: Unknown error');
  }
}

async function fetchShardByOwnerPrefix(
  mintPubkey: PublicKey,
  ownerPrefix: string
): Promise<HolderInfo[]> {
  // For owner prefix filtering, we need to be more strategic
  // Let's try a simpler approach: get all accounts for mint then filter
  
  try {
    const accounts = await connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
      filters: [
        {
          dataSize: 165, // Token account data size
        },
        {
          memcmp: {
            offset: 0, // Mint address is at offset 0
            bytes: mintPubkey.toBase58(),
          },
        },
      ],
      encoding: 'base64',
    });

    console.log(`    Raw accounts found: ${accounts.length}`);
    
    // Parse accounts and filter by owner prefix
    const holders: HolderInfo[] = [];
    let processed = 0;
    
    for (const { pubkey, account } of accounts) {
      try {
        const parsedAccountInfo = await connection.getParsedAccountInfo(pubkey);
        if (parsedAccountInfo.value?.data && 'parsed' in parsedAccountInfo.value.data) {
          const info = parsedAccountInfo.value.data.parsed.info;
          const amount = info.tokenAmount?.uiAmount || 0;
          
          // Filter by owner prefix
          if (amount > 0 && info.owner.startsWith(ownerPrefix)) {
            holders.push({
              account: pubkey.toBase58(),
              owner: info.owner,
              amount: amount,
            });
          }
        }
        processed++;
        
        // Log progress for large batches
        if (processed % 100 === 0) {
          console.log(`    Processed ${processed}/${accounts.length} accounts...`);
        }
        
      } catch (error) {
        // Skip individual account errors but continue
      }
    }

    return holders;
    
  } catch (error) {
    // If even getting all accounts fails, try a different approach
    console.log(`    Falling back to direct owner prefix memcmp...`);
    return await fetchShardByOwnerPrefixDirect(mintPubkey, ownerPrefix);
  }
}

async function fetchShardByOwnerPrefixDirect(
  mintPubkey: PublicKey,
  ownerPrefix: string
): Promise<HolderInfo[]> {
  // Try to create a proper base58 prefix for memcmp
  // This is more complex but might work better
  
  const accounts = await connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
    filters: [
      {
        dataSize: 165, // Token account data size
      },
      {
        memcmp: {
          offset: 0, // Mint address is at offset 0
          bytes: mintPubkey.toBase58(),
        },
      },
      // Skip the owner prefix filter for now as it's complex to get right
    ],
    encoding: 'base64',
  });

  const holders: HolderInfo[] = [];
  
  // Just return a subset for testing
  const subset = accounts.slice(0, 10); // Limit to first 10 for testing
  
  for (const { pubkey, account } of subset) {
    try {
      const parsedAccountInfo = await connection.getParsedAccountInfo(pubkey);
      if (parsedAccountInfo.value?.data && 'parsed' in parsedAccountInfo.value.data) {
        const info = parsedAccountInfo.value.data.parsed.info;
        const amount = info.tokenAmount?.uiAmount || 0;
        
        if (amount > 0 && info.owner.startsWith(ownerPrefix)) {
          holders.push({
            account: pubkey.toBase58(),
            owner: info.owner,
            amount: amount,
          });
        }
      }
    } catch (error) {
      // Skip individual account errors
    }
  }

  return holders;
}

// Alternative approach: shard by account pubkey prefix instead of owner
export async function fetchHoldersShardedByAccount(
  mintAddress: string,
  maxPrefixes: number = 10,
  delayMs: number = 100
): Promise<HolderInfo[]> {
  try {
    const mintPubkey = new PublicKey(mintAddress);
    console.log(`Fetching holders for mint: ${mintAddress} using account prefix sharding`);
    
    let allHolders: HolderInfo[] = [];
    let successfulShards = 0;
    let failedShards = 0;

    const prefixesToTry = BASE58_PREFIXES.slice(0, maxPrefixes);
    
    for (let i = 0; i < prefixesToTry.length; i++) {
      const prefix = prefixesToTry[i];
      
      try {
        console.log(`Shard ${i + 1}/${prefixesToTry.length}: Scanning accounts starting with '${prefix}'...`);
        
        const shardHolders = await fetchShardByAccountPrefix(mintPubkey, prefix);
        allHolders = allHolders.concat(shardHolders);
        successfulShards++;
        
        console.log(`  ✅ Found ${shardHolders.length} holders in shard '${prefix}' (${allHolders.length} total)`);
        
        if (i < prefixesToTry.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        
      } catch (error) {
        failedShards++;
        console.log(`  ❌ Shard '${prefix}' failed: ${error instanceof Error ? error.message : error}`);
        
        if (i < prefixesToTry.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    const uniqueHolders = removeDuplicateHolders(allHolders);
    uniqueHolders.sort((a, b) => b.amount - a.amount);

    console.log(`\n📊 Account Sharding Summary:`);
    console.log(`   Successful shards: ${successfulShards}`);
    console.log(`   Failed shards: ${failedShards}`);
    console.log(`   Total unique holders: ${uniqueHolders.length}`);
    
    return uniqueHolders;
    
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch holders with account sharding: ${error.message}`);
    }
    throw new Error('Failed to fetch holders with account sharding: Unknown error');
  }
}

async function fetchShardByAccountPrefix(
  mintPubkey: PublicKey,
  accountPrefix: string
): Promise<HolderInfo[]> {
  // This is trickier - we need to find accounts whose pubkey starts with a specific prefix
  // We'll use a different approach: get all accounts for the mint, then filter by prefix
  
  const accounts = await connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
    filters: [
      {
        dataSize: 165, // Token account data size
      },
      {
        memcmp: {
          offset: 0, // Mint address is at offset 0
          bytes: mintPubkey.toBase58(),
        },
      },
    ],
    encoding: 'base64',
  });

  // Filter accounts by pubkey prefix
  const filteredAccounts = accounts.filter(({ pubkey }) => 
    pubkey.toBase58().startsWith(accountPrefix)
  );

  const holders: HolderInfo[] = [];
  
  for (const { pubkey, account } of filteredAccounts) {
    try {
      const parsedAccountInfo = await connection.getParsedAccountInfo(pubkey);
      if (parsedAccountInfo.value?.data && 'parsed' in parsedAccountInfo.value.data) {
        const info = parsedAccountInfo.value.data.parsed.info;
        const amount = info.tokenAmount?.uiAmount || 0;
        
        if (amount > 0) {
          holders.push({
            account: pubkey.toBase58(),
            owner: info.owner,
            amount: amount,
          });
        }
      }
    } catch (error) {
      console.warn(`    Warning: Failed to parse account ${pubkey.toBase58()}`);
    }
  }

  return holders;
}

function removeDuplicateHolders(holders: HolderInfo[]): HolderInfo[] {
  const seen = new Set<string>();
  return holders.filter(holder => {
    if (seen.has(holder.account)) {
      return false;
    }
    seen.add(holder.account);
    return true;
  });
}
