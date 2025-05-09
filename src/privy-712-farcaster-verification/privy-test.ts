import { config } from 'dotenv'
config()
// @ts-ignore
import {PrivyClient} from '@privy-io/server-auth';
import { createWalletClient, createPublicClient, http, custom } from 'viem'
import { optimism } from 'viem/chains'
import { eip712 } from '@farcaster/hub-web'

const FID = 1234

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

  // const walletClient = createWalletClient({ chain: optimism, transport: custom(provider) })

  console.log('Signature:', signature)
  console.log('Wallet address:', address)
  //console.log('Block hash:', block.hash)
}

main().catch(console.error)
