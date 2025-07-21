// src/holders-alternative.ts
import { PublicKey } from '@solana/web3.js';
import { connection } from './solana';

export interface HolderInfo {
  owner: string;
  amount: number;
  account: string;
}

export async function fetchTopHolders(
  mintAddress: string,
  limit: number = 20
): Promise<HolderInfo[]> {
  try {
    const mintPubkey = new PublicKey(mintAddress);

    console.log(`Fetching top ${limit} holders for mint: ${mintAddress}`);
    
    // Use getTokenLargestAccounts to get the largest holders
    const largestAccounts = await connection.getTokenLargestAccounts(mintPubkey, 'confirmed');
    
    console.log(`Found ${largestAccounts.value.length} large token accounts`);

    const holders: HolderInfo[] = [];
    
    // Get detailed info for each large account
    for (const account of largestAccounts.value.slice(0, limit)) {
      try {
        const accountInfo = await connection.getParsedAccountInfo(account.address, 'confirmed');
        
        if (accountInfo.value?.data && 'parsed' in accountInfo.value.data) {
          const info = accountInfo.value.data.parsed.info;
          const amount = info.tokenAmount?.uiAmount || 0;
          
          if (amount > 0) {
            holders.push({
              account: account.address.toBase58(),
              owner: info.owner,
              amount: amount,
            });
          }
        }
      } catch (error) {
        console.warn(`Failed to get info for account ${account.address.toBase58()}:`, error);
      }
    }

    return holders.sort((a, b) => b.amount - a.amount);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch top holders: ${error.message}`);
    }
    throw new Error('Failed to fetch top holders: Unknown error');
  }
}

export async function getTokenSupplyInfo(mintAddress: string) {
  try {
    const mintPubkey = new PublicKey(mintAddress);
    const supply = await connection.getTokenSupply(mintPubkey, 'confirmed');
    
    return {
      totalSupply: supply.value.uiAmount || 0,
      decimals: supply.value.decimals,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch token supply: ${error.message}`);
    }
    throw new Error('Failed to fetch token supply: Unknown error');
  }
}
