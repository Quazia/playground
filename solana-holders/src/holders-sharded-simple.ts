// src/holders-sharded-simple.ts
import { PublicKey } from '@solana/web3.js';
import { connection } from './solana';

export interface HolderInfo {
  owner: string;
  amount: number;
  account: string;
}

const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

export async function fetchHoldersShardedSimple(
  mintAddress: string,
  testMode: boolean = true
): Promise<HolderInfo[]> {
  try {
    const mintPubkey = new PublicKey(mintAddress);
    
    console.log(`🧪 Testing sharded approach for mint: ${mintAddress}`);
    if (testMode) {
      console.log(`   Running in test mode - will limit results for demonstration`);
    }

    // First, let's try to get a small sample to see if the token exists
    let allAccounts;
    try {
      allAccounts = await connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
        filters: [
          {
            dataSize: 165,
          },
          {
            memcmp: {
              offset: 0,
              bytes: mintPubkey.toBase58(),
            },
          },
        ],
        encoding: 'base64',
      });
    } catch (error) {
      throw new Error(`Token scan failed: ${error instanceof Error ? error.message : error}`);
    }

    console.log(`📊 Found ${allAccounts.length} total token accounts`);

    if (allAccounts.length === 0) {
      return [];
    }

    // In test mode, just process a small subset
    const accountsToProcess = testMode ? allAccounts.slice(0, 50) : allAccounts;
    console.log(`🔍 Processing ${accountsToProcess.length} accounts...`);

    const holders: HolderInfo[] = [];
    let processed = 0;

    for (const { pubkey } of accountsToProcess) {
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

        processed++;
        if (processed % 10 === 0) {
          console.log(`   Processed ${processed}/${accountsToProcess.length} accounts...`);
        }

      } catch (error) {
        // Skip individual account errors
      }
    }

    // Sort by amount descending
    holders.sort((a, b) => b.amount - a.amount);

    console.log(`✅ Successfully processed ${processed} accounts, found ${holders.length} holders`);
    
    return holders;

  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Sharded fetch failed: ${error.message}`);
    }
    throw new Error('Sharded fetch failed: Unknown error');
  }
}

// Function to demonstrate sharding concept with artificial splitting
export async function demonstrateShardingConcept(
  mintAddress: string,
  numShards: number = 3
): Promise<HolderInfo[]> {
  try {
    const mintPubkey = new PublicKey(mintAddress);
    
    console.log(`🧪 Demonstrating sharding concept with ${numShards} artificial shards`);

    // Get all accounts first (this might fail for large tokens)
    let allAccounts;
    try {
      allAccounts = await connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
        filters: [
          {
            dataSize: 165,
          },
          {
            memcmp: {
              offset: 0,
              bytes: mintPubkey.toBase58(),
            },
          },
        ],
        encoding: 'base64',
      });
    } catch (error) {
      throw new Error(`Cannot demonstrate sharding: ${error instanceof Error ? error.message : error}`);
    }

    console.log(`📊 Found ${allAccounts.length} total accounts to shard`);

    // Artificially split accounts into shards
    const shardSize = Math.ceil(allAccounts.length / numShards);
    const shards = [];
    
    for (let i = 0; i < numShards; i++) {
      const start = i * shardSize;
      const end = Math.min(start + shardSize, allAccounts.length);
      shards.push(allAccounts.slice(start, end));
    }

    let allHolders: HolderInfo[] = [];

    // Process each shard
    for (let i = 0; i < shards.length; i++) {
      const shard = shards[i];
      console.log(`🔍 Processing shard ${i + 1}/${numShards} (${shard.length} accounts)...`);

      const shardHolders: HolderInfo[] = [];
      
      // Limit each shard to first 10 accounts for demo
      const shardToProcess = shard.slice(0, 10);
      
      for (const { pubkey } of shardToProcess) {
        try {
          const parsedAccountInfo = await connection.getParsedAccountInfo(pubkey);
          if (parsedAccountInfo.value?.data && 'parsed' in parsedAccountInfo.value.data) {
            const info = parsedAccountInfo.value.data.parsed.info;
            const amount = info.tokenAmount?.uiAmount || 0;
            
            if (amount > 0) {
              shardHolders.push({
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

      allHolders = allHolders.concat(shardHolders);
      console.log(`   Shard ${i + 1} completed: ${shardHolders.length} holders found`);
      
      // Add delay between shards
      if (i < shards.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // Sort by amount descending
    allHolders.sort((a, b) => b.amount - a.amount);

    console.log(`✅ Sharding demonstration completed: ${allHolders.length} total holders found`);
    
    return allHolders;

  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Sharding demonstration failed: ${error.message}`);
    }
    throw new Error('Sharding demonstration failed: Unknown error');
  }
}
