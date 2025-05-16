/**
 * Tutorial: EIP-712 verification with Privy RPC and Farcaster
 */

import { config } from 'dotenv'
import { Buffer } from 'buffer'
import { Address, createPublicClient, hashTypedData, http } from 'viem'
import { optimism } from 'viem/chains'

config()

// --- Constants & Configuration ---
const FID                  = Number(process.env.PRIVY_VALIDATION_FID)               // Farcaster ID
const FARCASTER_NETWORK    = 1                                                      // Mainnet
const VALIDATION_ADDRESS   = process.env.PRIVY_VALIDATION_ADDRESS as Address
const PRIVY_WALLET_ID      = process.env.PRIVY_VALIDATION_CLIENT_ID!
const PRIVY_APP_ID         = process.env.PRIVY_ID!
const PRIVY_SECRET         = process.env.PRIVY_SECRET!
const NEYNAR_API_KEY       = process.env.NEYNAR_API_KEY!
const SIGNER_UUID          = process.env.ADDRESS_VALIDATION_SIGNER_UUID!

// --- EIP-712 Schemas (inlined, taken from eip712 in @farcaster/hub-web) ---
const EIP_712_FARCASTER_VERIFICATION_CLAIM = [
  { name: 'fid',      type: 'uint256' },
  { name: 'address',  type: 'address' },
  { name: 'blockHash',type: 'bytes32' },
  { name: 'network',  type: 'uint8'   },
] as const // eip712.EIP_712_FARCASTER_VERIFICATION_CLAIM from @farcaster/hub-web

const EIP_712_FARCASTER_DOMAIN = {
  name:    'Farcaster Verify Ethereum Address',
  version: '2.0.0',
  salt:    '0xf2d857f4a3edcb9b78b4d503bfe733db1e3f6cdc2b7971ee739626c97e86a558',
} as const // eip712.EIP_712_FARCASTER_DOMAIN from @farcaster/hub-web

// --- Helper: compose EIP-712 message ---
async function getMessageToSign(
  address: Address,
  blockHash: `0x${string}`
) {
  return {
    domain:   { ...EIP_712_FARCASTER_DOMAIN, chainId: optimism.id },
    types:    { VerificationClaim: EIP_712_FARCASTER_VERIFICATION_CLAIM },
    primaryType: 'VerificationClaim' as const,
    message:  {
      fid:       BigInt(FID),
      address,
      blockHash,
      network:   FARCASTER_NETWORK,
      protocol:  0,              // contract flow uses protocol=0
    },
  }
}

// --- Helper: sign hash via Privy RPC ---
async function signWithPrivy(hash: `0x${string}`) {
  const resp = await fetch(
    `https://api.privy.io/v1/wallets/${PRIVY_WALLET_ID}/rpc`,
    {
      method: 'POST',
      headers: {
        'Content-Type':   'application/json',
        'privy-app-id':   PRIVY_APP_ID,
        'Authorization':  `Basic ${Buffer.from(
                            `${PRIVY_APP_ID}:${PRIVY_SECRET}`
                          ).toString('base64')}`,
      },
      body: JSON.stringify({ method: 'secp256k1_sign', params: { hash } }),
    }
  )
  const { data } = await resp.json()
  return data.signature as `0x${string}`
}

// --- Main Flow ---
async function main() {
  try {
    // 1) Fetch block hash
    const client    = createPublicClient({ chain: optimism, transport: http() })
    const { hash }  = await client.getBlock()

    // 2) Build EIP-712 message
    const typedData = await getMessageToSign(VALIDATION_ADDRESS, hash)
    console.log('Message to sign:', typedData)

    // 3) Compute EIP-712 hash
    const typedDataHash = hashTypedData({
      domain:      typedData.domain,
      types:       typedData.types,
      primaryType: typedData.primaryType,
      message:     typedData.message,
    })

    // 4) Sign via Privy RPC
    const rpcSig  = await signWithPrivy(typedDataHash)
    console.log('Privy RPC signature:', rpcSig)

    // 5) Verify locally
    const ok = await client.verifyTypedData({
      address:       VALIDATION_ADDRESS,
      domain:        typedData.domain,
      types:         typedData.types,
      primaryType:   typedData.primaryType,
      message:       typedData.message,
      signature:     rpcSig,
    })
    console.log('Local verification:', ok)

    // 6) Submit to Neynar
    const neynarResp = await fetch(
      'https://api.neynar.com/v2/farcaster/user/verification',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key':    NEYNAR_API_KEY,
        },
        body: JSON.stringify({
          signer_uuid:       SIGNER_UUID,
          address:           VALIDATION_ADDRESS,
          block_hash:        hash,
          eth_signature:     rpcSig,
          verification_type: 1,
          chain_id:          optimism.id,
        }),
      }
    )
    console.log('Neynar response:', await neynarResp.json())
  } catch (err) {
    console.error('Error in validation flow:', err)
    process.exit(1)
  }
}

main()