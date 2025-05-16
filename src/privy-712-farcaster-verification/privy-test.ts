import { config } from 'dotenv'
import { Buffer } from 'buffer'
config()
// @ts-ignore
import {PrivyClient} from '@privy-io/server-auth';
import { Address, createPublicClient, hashTypedData, http } from 'viem'
import { optimism } from 'viem/chains'
import { eip712 } from '@farcaster/hub-web'
import {
  FarcasterNetwork,
} from '@farcaster/hub-nodejs';


// Idk if this needs to be a bigint or not
const FID = 14206;
// There are two network distinctions in this signature flow; the FarcasterNetwork (1) and the chainId for Optimisim (10) where we are getting the block hash and signing the message
const FARCASTER_NETWORK = 1; // Mainnet -> FarcasterNetwork from @farcaster/hub-nodejs
// We just need a basic public client to get the block hash
const publicClient = createPublicClient({ chain: optimism, transport: http() })

const getMessageToSign = async (address: `0x${string}`, blockHash?: `0x${string}`, hasDomain = false) => {
    const latestBlockHash = blockHash ? blockHash : (await publicClient.getBlock()).hash
      let types: {
        EIP712Domain?: { name: string; type: string }[]
        VerificationClaim: readonly { name: string; type: string }[] 
      } = {
            EIP712Domain: [
                { name: 'name', type: 'string' },
                { name: 'version', type: 'string' },
                { name: 'salt', type: 'bytes32' },
                { name: 'chainId', type: 'uint256' },
            ],
            VerificationClaim: eip712.EIP_712_FARCASTER_VERIFICATION_CLAIM,
            }
        if(!hasDomain) {
            types = {
            VerificationClaim: eip712.EIP_712_FARCASTER_VERIFICATION_CLAIM,
            }
        }
    
    // Message composition information
    // https://github.com/farcasterxyz/hub-monorepo/blob/733894b77427b71f5cbc4d563cd54e17c37ab2a6/packages/core/src/crypto/eip712.ts#L16
    return {
      domain: { ...eip712.EIP_712_FARCASTER_DOMAIN, chainId: optimism.id },
      types,
      primaryType: 'VerificationClaim',
      message: { fid: FID, address, blockHash: latestBlockHash, network: FARCASTER_NETWORK, protocol: 0 },
    }
    /*
      verifyTypedData({
        address: bytesToHex(address),
        domain: EIP_712_FARCASTER_DOMAIN,
        types: { VerificationClaim: EIP_712_FARCASTER_VERIFICATION_CLAIM },
        primaryType: "VerificationClaim",
        message: claim as VerificationAddressClaimEthereum,
        signature,
      }),
    */
  }

const privy = new PrivyClient(
  process.env.PRIVY_ID!,
  process.env.PRIVY_SECRET!,
  {
    walletApi: {
      authorizationPrivateKey: process.env.PRIVY_AUTH_PRIVATE_KEY!
    }
  }
)

// Here's the section of code where they're running into issues
// https://github.com/neynarxyz/hub-monorepo/blob/472df705c3e4ac841e015ba877feb7cfa3f911dc/packages/core/src/validations.ts#L490-L529
// We're doing a contract signature verification so it needs to be verificationType = 1
// https://github.com/neynarxyz/hub-monorepo/blob/472df705c3e4ac841e015ba877feb7cfa3f911dc/packages/core/src/crypto/eip712.ts#L137
// T
async function main() {
  const address = "0x3B1F5A8B542De444a22453cA8c6ac851360296Ce" as Address
  const id = "i2ud7poom0dowqyfr893c5ue"
  const publicClient = createPublicClient({ chain: optimism, transport: http() });

  const block = await publicClient.getBlock();

  const messageToSign = await getMessageToSign(address as Address, block.hash as `0x${string}`)
  console.log('Message to sign:', messageToSign)

  const messageToSignWithDomain = await getMessageToSign(address as Address, block.hash as `0x${string}`, true) 

  const {signature, encoding} = await privy.walletApi.ethereum.signTypedData({
    walletId: id,
    typedData: messageToSignWithDomain,
  })

  // --- roll our own typed-data hash and sign via Privy RPC ---
  const typedDataHash = hashTypedData(
    {
      domain: messageToSign.domain,
    types: messageToSign.types,
    primaryType: messageToSign.primaryType as 'VerificationClaim',
    message: messageToSign.message
    }
  )

  const rpcResponse = await fetch(
    `https://api.privy.io/v1/wallets/${id}/rpc`,
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

  console.log('Signature:', signature)
  console.log('Wallet address:', address)
  //console.log('Block hash:', block.hash)

  // --- begin Farcaster verification flow ---
  const network = FarcasterNetwork.MAINNET;
  const blockHash = block.hash;

  const verification1 = await publicClient.verifyTypedData({
    address: address as Address,
    domain: messageToSign.domain,
    types: messageToSign.types,
    primaryType: messageToSign.primaryType as 'VerificationClaim',
    message: messageToSign.message,
    signature: rpcSignature as `0x${string}`,
  })
  console.log("Verification result:", verification1)

  // Start Neynar Verification flow
    //   curl --request POST \
    //   --url https://api.neynar.com/v2/farcaster/user/verification \
    //   --header 'Content-Type: application/json' \
    //   --header 'x-api-key: NEYNAR_API_DOCS' \
    //   --data '{
    //   "signer_uuid": "05d16904-8565-43d2-9a6c-a4c866a7d023",
    //   "address": "0x1ea99cbed57e4020314ba3fadd7c692d2de34d5f",
    //   "block_hash": "0x191905a9201170abb55f4c90a4cc968b44c1b71cdf3db2764b775c93e7e22b29",
    //   "eth_signature": "0x2fc09da1f4dcb723fefb91f77932c249c418c0af00c66ed92ee1f35002c80d6a1145280c9f361d207d28447f8f7463366840d3a9309036cf6954afd1fd331beb1b"
    // }'
    const signer_uuid = process.env.ADDRESS_VALIDATION_SIGNER_UUID!;

    // When this comes back as false it gives us this: https://github.com/farcasterxyz/hub-monorepo/blob/733894b77427b71f5cbc4d563cd54e17c37ab2a6/packages/core/src/validations.ts#L524-L526
    const verification2 = await publicClient.verifyTypedData({
      address: address as Address,
      domain: { ...eip712.EIP_712_FARCASTER_DOMAIN, chainId: optimism.id },
      types: {
      VerificationClaim: eip712.EIP_712_FARCASTER_VERIFICATION_CLAIM },
      primaryType: "VerificationClaim",
      message: { fid: FID, address, blockHash: block.hash, network: 1, protocol: 0 },
      signature: signature as `0x${string}`,
    })
    console.log("Verification result:", verification2)
  
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
        signer_uuid,
        address,
        block_hash: blockHash,
        eth_signature: rpcSignature,
        verification_type: 1,
        chain_id: 10,
      }),
    }
  );
  const neynarResult = await neynarResponse.json();
  console.log('Neynar verification response:', neynarResult);

} // end main

main().catch(console.error)
