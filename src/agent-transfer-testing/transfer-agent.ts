import { config } from 'dotenv';
import { keccak256, toBytes, encodeAbiParameters, parseAbiParameters } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
config();

// --------- CONFIGURE THESE VALUES ----------
const API_URL = 'http://localhost:3000/portal'; // Change if needed
const fid = BigInt(process.env.TEST_FID || 1079126); // The FID of the agent account to transfer
const to_custody_address = process.env.TEST_PUBLIC_KEY as `0x${string}`;
const PRIVATE_KEY = process.env.TEST_PRIVATE_KEY as `0x${string}`;
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY as string;
const signer_uuid = process.env.TEST_SIGNER_UUID as string; // <-- Add this to your .env
// -------------------------------------------

if (!fid || !to_custody_address || !PRIVATE_KEY || !NEYNAR_API_KEY || !signer_uuid) {
  throw new Error('Missing required environment variables.');
}

function getTransferMessage(fid: bigint, to: `0x${string}`, nonce: bigint, deadline: bigint) {
  return keccak256(
    encodeAbiParameters(
      parseAbiParameters('uint256 fid, address to, uint256 nonce, uint256 deadline'),
      [fid, to, nonce, deadline]
    )
  );
}

async function main() {
  // Polyfill fetch for Node.js < 18
  if (typeof fetch === 'undefined') {
    // @ts-ignore
    global.fetch = (await import('node-fetch')).default;
  }

  const nonce = BigInt(1); // You may need to fetch this from your contract/backend
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

  const account = privateKeyToAccount(PRIVATE_KEY);
  const messageHash = getTransferMessage(fid, to_custody_address, nonce, deadline);
  const signature = await account.signMessage({ message: { raw: toBytes(messageHash) } });
  const TRANSFER_URL = `${API_URL}/app/agent/transfer`;
  try {
    const response = await fetch(TRANSFER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': NEYNAR_API_KEY,
      },
      body: JSON.stringify({
        fid: fid.toString(),
        signature,
        to_custody_address,
        signer_uuid,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', response.status, response.statusText);
      console.error('Raw response:', errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Only parse as JSON if response is OK
    const data = await response.json();
    console.log('Transfer response:', data);
  } catch (err: any) {
    console.error('Error:', err && err.stack ? err.stack : err);
  }
}

main();