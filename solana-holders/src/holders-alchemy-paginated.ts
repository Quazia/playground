// src/holders-alchemy-paginated.ts
import { PublicKey } from '@solana/web3.js';
import { connection } from './solana';
import axios from 'axios';

export interface HolderInfo {
  owner: string;
  amount: number;        // uiAmount
  account: string;       // token-account pubkey
}

// Token Program ID
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

export async function fetchHoldersAlchemyPaginated(
  mintAddress: string,
  maxPages: number = 100,  // Safety limit to prevent infinite loops
  pageSize: number = 1000  // Explicit page size for Alchemy
): Promise<HolderInfo[]> {
  try {
    const mintPubkey = new PublicKey(mintAddress);
    const alchemyRPCUrl = process.env.SOLANA_RPC_URL;

    if (!alchemyRPCUrl || !alchemyRPCUrl.includes('alchemy.com')) {
      throw new Error('This method requires an Alchemy RPC URL');
    }

    console.log(`Fetching all holders for mint: ${mintAddress} using Alchemy pagination`);
    
    let allHolders: HolderInfo[] = [];
    let pageCount = 0;
    let pageKey: string | undefined = undefined;

    // Build the initial request
    let gPARequest = {
      method: "getProgramAccounts",
      params: [
        TOKEN_PROGRAM_ID.toBase58(),
        {
          encoding: "jsonParsed" as const,
          withContext: true,
          order: "asc" as const,
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
          ...(pageSize && { pageSize: pageSize }),
        },
      ],
      id: 0,
      jsonrpc: "2.0",
    };

    try {
      let response = await axios.post(alchemyRPCUrl, gPARequest);
      let responseData = response.data["result"];

      if (response.data.error) {
        throw new Error(`RPC Error: ${response.data.error.message}`);
      }

      // Process initial page
      if (responseData && responseData.value) {
        const pageHolders = processAccountsPage(responseData.value);
        allHolders = allHolders.concat(pageHolders);
        pageCount++;
        console.log(`Page ${pageCount}: Found ${pageHolders.length} holders (${allHolders.length} total)`);
      }

      // Continue aggregating if there's a pageKey present
      while (responseData && responseData.pageKey && pageCount < maxPages) {
        pageKey = responseData.pageKey;
        
        // Add pageKey to the request params
        (gPARequest.params[1] as any).pageKey = pageKey;

        // Make another call with the pageKey
        response = await axios.post(alchemyRPCUrl, gPARequest);
        responseData = response.data["result"];

        if (response.data.error) {
          console.warn(`Error on page ${pageCount + 1}: ${response.data.error.message}`);
          break;
        }

        if (responseData && responseData.value) {
          const pageHolders = processAccountsPage(responseData.value);
          allHolders = allHolders.concat(pageHolders);
          pageCount++;
          console.log(`Page ${pageCount}: Found ${pageHolders.length} holders (${allHolders.length} total)`);
        }
      }

      if (pageCount >= maxPages) {
        console.warn(`⚠️  Reached maximum page limit (${maxPages}). There may be more holders.`);
      }

      // Sort by amount descending
      allHolders.sort((a, b) => b.amount - a.amount);
      
      console.log(`✅ Completed pagination: ${pageCount} pages, ${allHolders.length} total holders`);
      return allHolders;

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error?.message || error.message;
        throw new Error(`Alchemy API Error: ${errorMessage}`);
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch holders with Alchemy pagination: ${error.message}`);
    }
    throw new Error('Failed to fetch holders with Alchemy pagination: Unknown error');
  }
}

function processAccountsPage(accounts: any[]): HolderInfo[] {
  const holders: HolderInfo[] = [];
  
  for (const accountData of accounts) {
    try {
      const pubkey = accountData.pubkey;
      const account = accountData.account;
      
      if (account && account.data && account.data.parsed && account.data.parsed.info) {
        const info = account.data.parsed.info;
        const amount = info.tokenAmount?.uiAmount || 0;
        
        if (amount > 0) {
          holders.push({
            account: pubkey,
            owner: info.owner,
            amount: amount,
          });
        }
      }
    } catch (error) {
      console.warn(`Failed to process account:`, error);
    }
  }
  
  return holders;
}
