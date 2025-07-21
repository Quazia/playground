// src/holders.ts
import { PublicKey } from '@solana/web3.js';
import { connection } from './solana';

export interface HolderInfo {
  owner: string;
  amount: number;        // uiAmount
  account: string;       // token-account pubkey
}

// Token Program ID
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

export async function fetchHolders(
  mintAddress: string
): Promise<HolderInfo[]> {
  try {
    // Validate the mint address
    const mintPubkey = new PublicKey(mintAddress);

    console.log(`Fetching holders for mint: ${mintAddress}`);
    
    // Use getProgramAccounts to find all token accounts for this mint
    const accounts = await connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
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
      encoding: 'base64',
    });

    console.log(`Found ${accounts.length} token accounts`);

    const holders: HolderInfo[] = [];
    
    for (const { pubkey, account } of accounts) {
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
        console.warn(`Failed to parse account ${pubkey.toBase58()}:`, error);
      }
    }

    // Sort by amount descending
    return holders.sort((a: HolderInfo, b: HolderInfo) => b.amount - a.amount);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch holders: ${error.message}`);
    }
    throw new Error('Failed to fetch holders: Unknown error');
  }
}
