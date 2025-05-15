import { config } from 'dotenv'
config()
import {
	createPublicClient,
	createWalletClient,
	http,
	erc20Abi,
	Address,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'
import type { Hex } from 'viem'

async function main() {
	const RPC_URL = process.env.BULK_SEND_RPC_URL_TEST!
	const PRIVATE_KEY = process.env.BULK_SEND_PRIVATE_KEY! as Hex
	const TOKEN = process.env.BULK_SEND_TOKEN_ADDRESS!
	const DISPERSE_ADDRESS = process.env.BULK_TOKEN_DISPERSE_ADDRESS_TESTNET!
	// If you want to test with env based recipients, uncomment this line
	// const RECIPIENTS = JSON.parse(process.env.BULK_SEND_RECIPIENTS!) as { to: string; amount: string }[]

	const TARGET_ADDRESS = process.env.BULK_SEND_TARGET_ADDRESS!
    // This just generates random amounts between 0.00001 and 0.01 USDC for 100 recipients
	const RECIPIENTS = Array.from({ length: 100 }, () => {
		const min = 10         // 0.00001 USDC
		const max = 10_000     // 0.01    USDC
		const micro = Math.floor(Math.random() * (max - min + 1)) + min
		return {
			to:     TARGET_ADDRESS,
			amount: micro.toString(),
		}
	})

	console.log(JSON.stringify(RECIPIENTS, null, 2))

	const publicClient = createPublicClient({
		chain: baseSepolia,
		transport: http(RPC_URL),
	})

	const account = privateKeyToAccount(PRIVATE_KEY)
	const walletClient = createWalletClient({
		chain: baseSepolia,
		transport: http(RPC_URL),
		account,
	})

	const recipients = RECIPIENTS.map(r => r.to as Address)
	const values = RECIPIENTS.map(r => BigInt(r.amount))

	const total = values.reduce((sum, v) => sum + v, BigInt(0))

	const approveHash = await walletClient.writeContract({
		address: TOKEN as Address,
		abi: erc20Abi,
		functionName: 'approve',
		args: [DISPERSE_ADDRESS as Address, total],
	})
	console.log('approve tx hash', approveHash)
	// This is blocking so won't scale well
	const transaction = await publicClient.waitForTransactionReceipt({
		hash: approveHash,
		confirmations: 1,
	})
	console.log('approve mined ✅')

	const disperseAbi = [
		{
			inputs: [
				{ internalType: 'address', name: 'token', type: 'address' },
				{ internalType: 'address[]', name: 'recipients', type: 'address[]' },
				{ internalType: 'uint256[]', name: 'values', type: 'uint256[]' },
			],
			name: 'disperseTokenSimple',
			outputs: [],
			stateMutability: 'nonpayable',
			type: 'function',
		},
	]

	const tx = await walletClient.writeContract({
		address: DISPERSE_ADDRESS as Address,
		abi: disperseAbi,
		functionName: 'disperseTokenSimple',
		args: [TOKEN as Address, recipients, values],
	})

	console.log('Disperse tx hash:', tx)
}

main().catch(console.error)
