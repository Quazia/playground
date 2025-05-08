import { PrivyClient } from '@privy-io/js-sdk-core'
import { createWalletClient, createPublicClient, http, custom } from 'viem'
import { optimism } from 'viem/chains'
import { eip712 } from '@farcaster/hub-web'

const FID = 1234
const privy = new PrivyClient({
  appId: 'your-app-id',
  loginMethods: ['wallet', 'email'], // or just 'wallet' if using embedded
  embeddedWallets: { createOnLogin: true },
})

async function main() {
  await privy.login()

  const user = await privy.getUser()
  const wallet = user.wallet

  if (!wallet) throw new Error('No embedded wallet found')

  const provider = await wallet.getEthereumProvider()
  const publicClient = createPublicClient({ chain: optimism, transport: http() })

  const block = await publicClient.getBlock()
  const message = {
    domain: eip712.EIP_712_FARCASTER_DOMAIN,
    types: { VerificationClaim: eip712.EIP_712_FARCASTER_VERIFICATION_CLAIM },
    primaryType: 'VerificationClaim',
    message: {
      fid: FID,
      address: wallet.address,
      blockHash: block.hash,
      network: 1,
    },
    account: wallet.address,
  }

  const walletClient = createWalletClient({ chain: optimism, transport: custom(provider) })
  const signature = await walletClient.signTypedData(message)

  console.log('Signature:', signature)
  console.log('Wallet address:', wallet.address)
  console.log('Block hash:', block.hash)
}

main().catch(console.error)
