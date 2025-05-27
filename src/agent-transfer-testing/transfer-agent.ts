import { config } from 'dotenv';
import { keccak256, toBytes, encodeAbiParameters, parseAbiParameters, type Address, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { optimism } from 'viem/chains';
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

const ID_REGISTRY_ADDRESS = '0x00000000Fc6c5F01Fc30151999387Bb99A9f489b';
const ID_REGISTRY_EIP_712_DOMAIN = {
  name: 'Farcaster IdRegistry',
  version: '1',
  chainId: 10,
  verifyingContract: ID_REGISTRY_ADDRESS,
} as const;

const ID_REGISTRY_TRANSFER_TYPE = [
  { name: 'fid', type: 'uint256' },
  { name: 'to', type: 'address' },
  { name: 'nonce', type: 'uint256' },
  { name: 'deadline', type: 'uint256' },
] as const;

const idRegistryABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "owner", "type": "address" }
    ],
    "name": "nonces",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

const client = createPublicClient({
  chain: optimism,
  transport: http('http://localhost:8545'), // Use local Hardhat node
});

async function fetchNonce(address: string) {
  const nonce = await client.readContract({
    address: ID_REGISTRY_ADDRESS,
    abi: idRegistryABI,
    functionName: 'nonces',
    args: [address],
  });
  return BigInt(nonce as string);
}

async function main() {
  // Polyfill fetch for Node.js < 18
  if (typeof fetch === 'undefined') {
    // @ts-ignore
    global.fetch = (await import('node-fetch')).default;
  }

  const account = privateKeyToAccount(PRIVATE_KEY);
  // Fetch the nonce for the current custody address
  const custodyAddress = account.address;
  const nonce = await fetchNonce(custodyAddress);
  // Set deadline to current block number + 5
  const currentBlock = await client.getBlockNumber();
  const deadline = currentBlock + BigInt(5);

  console.log('Message Data:', {
      fid: fid.toString(),
      to: to_custody_address,
      nonce: nonce.toString(),
      deadline: deadline.toString(),
    }
  )
  // EIP-712 typed data signing
  const signature = await account.signTypedData({
    domain: ID_REGISTRY_EIP_712_DOMAIN,
    types: { Transfer: ID_REGISTRY_TRANSFER_TYPE },
    primaryType: 'Transfer',
    message: {
      fid,
      to: to_custody_address,
      nonce,
      deadline,
    },
  });

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
        deadline: deadline.toString(),
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