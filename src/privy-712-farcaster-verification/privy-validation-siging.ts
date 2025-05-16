import { config } from 'dotenv'
import { Buffer } from 'buffer'
config()
import { Address, createPublicClient, hashTypedData, http } from 'viem'
import { optimism } from 'viem/chains'


// Both of these constants should be imported from @farcaster/hub-web but are shown for clarity
const EIP_712_FARCASTER_VERIFICATION_CLAIM = [{
    name: "fid",
    type: "uint256",
}, {
    name: "address",
    type: "address",
}, {
    name: "blockHash",
    type: "bytes32",
}, {
    name: "network",
    type: "uint8",
}]; // eip712.EIP_712_FARCASTER_VERIFICATION_CLAIM from @farcaster/hub-web

const EIP_712_FARCASTER_DOMAIN = {
    name: "Farcaster Verify Ethereum Address",
    version: "2.0.0",
    salt: "0xf2d857f4a3edcb9b78b4d503bfe733db1e3f6cdc2b7971ee739626c97e86a558" as `0x${string}`,
}; // eip712.EIP_712_FARCASTER_DOMAIN from @farcaster/hub-web

const FID = parseInt(process.env.PRIVY_VALIDATION_FID!);
// There are two network distinctions in this signature flow; the FarcasterNetwork (1) and the chainId for Optimisim (10) where we are getting the block hash and signing the message
const FARCASTER_NETWORK = 1; // Mainnet -> FarcasterNetwork from @farcaster/hub-nodejs
const VALIDATION_ADDRESS = process.env.PRIVY_VALIDATION_ADDRESS as Address
const PRIVY_WALLET_ID = process.env.PRIVY_VALIDATION_CLIENT_ID!

const getMessageToSign = async (address: `0x${string}`, blockHash: `0x${string}`) => {
    // Message composition information
    // https://github.com/farcasterxyz/hub-monorepo/blob/733894b77427b71f5cbc4d563cd54e17c37ab2a6/packages/core/src/crypto/eip712.ts#L16
    return {
      domain: { ...EIP_712_FARCASTER_DOMAIN, chainId: optimism.id },
      types: {
            VerificationClaim: EIP_712_FARCASTER_VERIFICATION_CLAIM,
            },
      primaryType: 'VerificationClaim',
      message: { fid: BigInt(FID), address, blockHash, network: FARCASTER_NETWORK, protocol: 0 }, // <- Take note of the protocol value here - this is the biggest difference from an EOA message to sign
    }
  }


async function main() {
  // We just need a basic public client to get the block hash -- make sure the hash you sign and the hash you post are the same
  const publicClient = createPublicClient({ chain: optimism, transport: http() });
  const block = await publicClient.getBlock();
  const blockHash = block.hash;

  const messageToSign = await getMessageToSign(VALIDATION_ADDRESS as Address, block.hash as `0x${string}`)
  
  console.log('Wallet address:', VALIDATION_ADDRESS)

  console.log('Message to sign:', messageToSign)

  // We need to generate an EIP712 conformant hash of the message to sign
  // https://eips.ethereum.org/EIPS/eip-712
  const typedDataHash = hashTypedData(
    {
      domain: messageToSign.domain,
    types: messageToSign.types,
    primaryType: messageToSign.primaryType as 'VerificationClaim',
    message: messageToSign.message
    }
  )

  // We use a secp256k1_sign because privy enforces a strict type on their typed signing endpoint
  const rpcResponse = await fetch(
    `https://api.privy.io/v1/wallets/${PRIVY_WALLET_ID}/rpc`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'privy-app-id': process.env.PRIVY_ID!,
        'Authorization': `Basic ${Buffer.from(
          `${process.env.PRIVY_ID}:${process.env.PRIVY_SECRET}`
        ).toString('base64')}`,
      },
      body: JSON.stringify({
        method: 'secp256k1_sign',
        params: { hash: typedDataHash },
      }),
    }
  )
  const rpcResult = await rpcResponse.json()
  console.log('RPC result:', rpcResult)
  const rpcSignature = rpcResult.data.signature;
  console.log('RPC signature:', rpcSignature)

  // We verify locally that the signature is valid
  const verification1 = await publicClient.verifyTypedData({
    address: VALIDATION_ADDRESS as Address,
    domain: messageToSign.domain,
    types: messageToSign.types,
    primaryType: messageToSign.primaryType as 'VerificationClaim',
    message: messageToSign.message,
    signature: rpcSignature as `0x${string}`,
  })
  console.log("Verification result:", verification1)

    const signer_uuid = process.env.ADDRESS_VALIDATION_SIGNER_UUID!;

  
    // FID is pulled from the signer_uuid so that needs to sync up
    const neynarResponse = await fetch(
    'https://api.neynar.com/v2/farcaster/user/verification',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.NEYNAR_API_KEY!,
      },
      body: JSON.stringify({
        signer_uuid, // This is how we're sourcing the FID so make sure it matches - this isn't used for anything else
        address: VALIDATION_ADDRESS,
        block_hash: blockHash,
        eth_signature: rpcSignature,
        verification_type: 1, // We need to set this to 1 for contract signature verification
        chain_id: 10,         // We're on Optimism
      }),
    }
  );
  const neynarResult = await neynarResponse.json();
  console.log('Neynar verification response:', neynarResult);

}

main().catch(console.error)


/* Useful Farcaster Code Links
validateVerificationAddEthAddressBody
https://github.com/farcasterxyz/hub-monorepo/blob/733894b77427b71f5cbc4d563cd54e17c37ab2a6/packages/core/src/validations.ts#L828
verifyVerificationEthAddressClaimSignature
https://github.com/farcasterxyz/hub-monorepo/blob/733894b77427b71f5cbc4d563cd54e17c37ab2a6/packages/core/src/crypto/eip712.ts#L120
*/