import { config } from 'dotenv'
config()
// @ts-ignore
import {PrivyClient} from '@privy-io/server-auth';
import {  createPublicClient, http } from 'viem'
import { optimism } from 'viem/chains'
import { eip712 } from '@farcaster/hub-web'
import {
  FarcasterNetwork,
  makeVerificationAddEthAddress,
} from '@farcaster/hub-nodejs';


// Idk if this needs to be a bigint or not
const FID = 1234;
  const publicClient = createPublicClient({ chain: optimism, transport: http() })

const getMessageToSign = async (address: `0x${string}`, account: `0x${string}`) => {
    const latestBlock = await publicClient.getBlock()
    // Message composition information
    // https://github.com/farcasterxyz/hub-monorepo/blob/733894b77427b71f5cbc4d563cd54e17c37ab2a6/packages/core/src/crypto/eip712.ts#L16
    return {
      domain: eip712.EIP_712_FARCASTER_DOMAIN,
      types: { VerificationClaim: eip712.EIP_712_FARCASTER_VERIFICATION_CLAIM },
      primaryType: 'VerificationClaim',
      message: { fid: FID, address, blockHash: latestBlock.hash, network: 10 },
      account,
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
  // {
  //   walletApi: {
  //     authorizationPrivateKey: process.env.PRIVY_AUTH_PRIVATE_KEY!
  //   }
  // }
)

// Here's the section of code where they're running into issues
// https://github.com/neynarxyz/hub-monorepo/blob/472df705c3e4ac841e015ba877feb7cfa3f911dc/packages/core/src/validations.ts#L490-L529
// We're doing a contract signature verification so it needs to be verificationType = 1
// https://github.com/neynarxyz/hub-monorepo/blob/472df705c3e4ac841e015ba877feb7cfa3f911dc/packages/core/src/crypto/eip712.ts#L137
// T
async function main() {
  const {id, address, chainType} = await privy.walletApi.create({chainType: 'ethereum'});

  if (!address) throw new Error('No embedded wallet found')

  const {signature, encoding} = await privy.walletApi.ethereum.signMessage({
  walletId: id,
  message: 'Hello server wallets!'
});


  // const block = await publicClient.getBlock()
  // https://github.com/farcasterxyz/hub-monorepo/blob/733894b77427b71f5cbc4d563cd54e17c37ab2a6/packages/core/src/crypto/eip712.ts#L80-L87
  // const message = {
  //   domain: eip712.EIP_712_FARCASTER_DOMAIN,
  //   types: { VerificationClaim: eip712.EIP_712_FARCASTER_VERIFICATION_CLAIM },
  //   primaryType: 'VerificationClaim',
  //   message: {
  //     fid: FID,
  //     address: wallet.address,
  //     blockHash: block.hash,
  //     network: 1,
  //   },
  //   account: wallet.address,
  // }
   /*
  https://github.com/farcasterxyz/hub-monorepo/blob/733894b77427b71f5cbc4d563cd54e17c37ab2a6/packages/core/src/verifications.ts#L9-L15

    export type VerificationAddressClaimEthereum = {
      fid: bigint;
      address: `0x${string}`;
      blockHash: `0x${string}`;
      network: FarcasterNetwork;
      protocol: Protocol.ETHEREUM; // This is an enum value equal to 0
    };
  */

  // const walletClient = createWalletClient({ chain: optimism, transport: custom(provider) })

  console.log('Signature:', signature)
  console.log('Wallet address:', address)
  //console.log('Block hash:', block.hash)

  // --- begin Farcaster verification flow ---
  const publicClient = createPublicClient({ chain: optimism, transport: http() });

  const block = await publicClient.getBlock();
  const network = FarcasterNetwork.MAINNET;
  const blockHash = block.hash;


  // What is the privy equivalent of this?
  // const ethSignature = eip712Signer.signVerificationEthAddressClaim({
  //   fid: FID,
  //   address,
  //   network,
  //   blockHash,
  // });

  // if (ethSignature.isOk()) {
  //   const message = await makeVerificationAddEthAddress(
  //     { address, blockHash, ethSignature: ethSignature.value },
  //     { fid: FID, network },
  //     ed25519Signer
  //   );
  //   console.log('Verification message:', message);
  // } else {
  //   console.error('EIP712 signature failed', ethSignature.error);
  // }
  // --- end Farcaster flow ---


  // Start Neynar Verification flow
//   curl --request POST \
    //   --url https://api.neynar.com/v2/farcaster/user/verification \
    //   --header 'Content-Type: application/json' \
    //   --header 'x-api-key: NEYNAR_API_DOCS' \
    //   --data '{
    //   "signer_uuid": "19d0c5fd-9b33-4a48-a0e2-bc7b0555baec",
    //   "address": "0x1ea99cbed57e4020314ba3fadd7c692d2de34d5f",
    //   "block_hash": "0x191905a9201170abb55f4c90a4cc968b44c1b71cdf3db2764b775c93e7e22b29",
    //   "eth_signature": "0x2fc09da1f4dcb723fefb91f77932c249c418c0af00c66ed92ee1f35002c80d6a1145280c9f361d207d28447f8f7463366840d3a9309036cf6954afd1fd331beb1b"
    // }'

}

main().catch(console.error)
