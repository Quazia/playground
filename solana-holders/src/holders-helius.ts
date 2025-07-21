// src/holders-helius.ts
import fetch from 'node-fetch';

export interface HolderInfo {
  account: string;   // token-account pubkey
  owner: string;     // owner of that token-account
  amount: number;    // uiAmount
}

interface HeliusTokenAccountsResponse {
  total: number;
  limit: number;
  cursor?: string;
  token_accounts: Array<{
    address: string;
    mint: string;
    owner: string;
    amount: number;
    decimals: number;
    frozen: boolean;
  }>;
}

/**
 * Fetch a single page of holders via Helius (for testing)
 */
export async function fetchHoldersPageHelius(
  mintAddress: string,
  pageSize: number = 100,
  cursor?: string
): Promise<{ holders: HolderInfo[], nextCursor?: string }> {
  
  const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
  
  if (!HELIUS_API_KEY) {
    throw new Error('Helius API key is required. Set HELIUS_API_KEY in your environment.');
  }

  console.log(`🔍 Fetching ${pageSize} holders from Helius for mint: ${mintAddress}`);
  if (cursor) {
    console.log(`   Using cursor: ${cursor.slice(0, 20)}...`);
  }

  const body = {
    jsonrpc: '2.0',
    id: '1',
    method: 'getTokenAccounts',
    params: {
      mint: mintAddress,
      limit: pageSize,
      ...(cursor && { cursor })
    }
  };

  try {
    const res = await fetch(
      `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Helius API error: ${res.status} ${err}`);
    }

    const json = await res.json() as { result?: HeliusTokenAccountsResponse, error?: any };

    if (json.error) {
      throw new Error(`Helius API error: ${json.error.message}`);
    }

    if (!json.result) {
      throw new Error('No result from Helius API');
    }

    const { token_accounts, cursor: nextCursor, total } = json.result;

    console.log(`   API returned ${token_accounts.length} accounts (${total} total available)`);

    // Map to our HolderInfo format and filter out zero balances
    const holders: HolderInfo[] = token_accounts
      .filter(account => account.amount > 0)
      .map(account => ({
        account: account.address,
        owner: account.owner,
        amount: account.amount
      }));

    // Sort by amount descending
    holders.sort((a, b) => b.amount - a.amount);

    console.log(`✅ Successfully found ${holders.length} holders with non-zero balances`);

    return {
      holders,
      nextCursor
    };

  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Helius fetch failed: ${error.message}`);
    }
    throw new Error('Helius fetch failed: Unknown error');
  }
}

/**
 * Fetch *all* holders of a mint via Helius, paging until exhaustion.
 */
export async function fetchAllHoldersHelius(
  mintAddress: string,
  pageSize: number = 1000,
  maxPages: number = 100  // Safety limit to prevent infinite loops
): Promise<HolderInfo[]> {
  
  const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
  
  if (!HELIUS_API_KEY) {
    throw new Error('Helius API key is required. Set HELIUS_API_KEY in your environment.');
  }

  console.log(`🔍 Fetching ALL holders from Helius for mint: ${mintAddress}`);
  console.log(`   Page size: ${pageSize}, Max pages: ${maxPages}`);

  let cursor: string | undefined = undefined;
  const allHolders: HolderInfo[] = [];
  let pageCount = 0;

  do {
    pageCount++;
    console.log(`\n📄 Fetching page ${pageCount}...`);

    const { holders, nextCursor } = await fetchHoldersPageHelius(
      mintAddress, 
      pageSize, 
      cursor
    );

    allHolders.push(...holders);
    cursor = nextCursor;

    console.log(`   Page ${pageCount}: Found ${holders.length} holders (${allHolders.length} total)`);

    // Safety check to prevent infinite loops
    if (pageCount >= maxPages) {
      console.warn(`⚠️  Reached maximum page limit (${maxPages}). There may be more holders.`);
      break;
    }

    // Add a small delay between requests to be respectful
    if (cursor) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

  } while (cursor);

  // Sort all holders by amount descending
  allHolders.sort((a, b) => b.amount - a.amount);

  console.log(`\n✅ Completed: ${pageCount} pages, ${allHolders.length} total holders`);

  return allHolders;
}
