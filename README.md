# 🛠️ Ethereum Development & Indexing Workspace

A comprehensive development environment combining **Foundry** for smart contract development and **Shovel** for blockchain data indexing with PostgreSQL.

## 🚀 Components

### 🔨 Foundry Toolkit
**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

- **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools)
- **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data
- **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network
- **Chisel**: Fast, utilitarian, and verbose solidity REPL

### 📊 Shovel Indexer
**Production-ready ERC20 Transfer event indexer with comprehensive metrics**

- **Shovel v1.6**: Ethereum to PostgreSQL indexer
- **PostgreSQL**: Database with performance tracking
- **Monitoring**: Real-time dashboard and metrics collection
- **Status**: ✅ Fully configured and tested

## 📁 Project Structure

```
/workspace
├── src/                    # Smart contracts and TypeScript utilities
├── test/                   # Foundry tests and test data
├── script/                 # Deployment and utility scripts
├── scripts/                # Database and indexer management
├── docker/                 # Database initialization
├── logs/                   # System and indexer logs
├── shovel-config.json      # Main indexer configuration
├── SHOVEL_INDEXER_README.md # Detailed indexer documentation
└── README.md              # This file
```

## 🚀 Quick Start

### Database Setup
```bash
# Start PostgreSQL database
./scripts/db-manage.sh start

# Check database status
./scripts/db-manage.sh status
```

### Shovel Indexer (ERC20 Transfer Events)
```bash
# Start indexer with monitoring
./scripts/shovel-runner.sh start

# View real-time dashboard
./scripts/shovel-dashboard.sh

# Check indexer status
./scripts/shovel-runner.sh status
```

For detailed Shovel setup, configuration, and troubleshooting, see **[SHOVEL_INDEXER_README.md](./SHOVEL_INDEXER_README.md)**.

## 📚 Foundry Documentation

https://book.getfoundry.sh/

## 🔧 Foundry Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy

```shell
$ forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
```

### Cast

```shell
$ cast <subcommand>
```

## 🛠️ VS Code Tasks

This workspace includes pre-configured VS Code tasks for easy development:

### Database Management
- **Start Database**: `Ctrl+Shift+P` → "Tasks: Run Task" → "Start Database"
- **Stop Database**: `Ctrl+Shift+P` → "Tasks: Run Task" → "Stop Database"
- **Reset Database**: `Ctrl+Shift+P` → "Tasks: Run Task" → "Reset Database"

### Shovel Indexer
- **Start Shovel**: `Ctrl+Shift+P` → "Tasks: Run Task" → "Start Shovel Indexer"
- **Stop Shovel**: `Ctrl+Shift+P` → "Tasks: Run Task" → "Stop Shovel Indexer"
- **Shovel Status**: `Ctrl+Shift+P` → "Tasks: Run Task" → "Shovel Status"
- **Shovel Metrics**: `Ctrl+Shift+P` → "Tasks: Run Task" → "Shovel Metrics"

### Foundry Development
- **Compile Solidity**: `Ctrl+Shift+P` → "Tasks: Run Task" → "Compile Solidity"
- **Run Solidity Tests**: `Ctrl+Shift+P` → "Tasks: Run Task" → "Run Solidity Tests"
- **Test Shovel Setup**: `Ctrl+Shift+P` → "Tasks: Run Task" → "Test Shovel Setup"

## 📊 Monitoring & Metrics

The workspace includes comprehensive monitoring for the Shovel indexer:
- **Real-time dashboard**: `./scripts/shovel-dashboard.sh`
- **Metrics collection**: Automatic logging to `logs/shovel_metrics.log`
- **Performance tracking**: Storage, processing rates, and system resource usage
- **Error monitoring**: Comprehensive error logging and alerting

## 🚨 Important Notes

- **RPC Endpoint**: The default config uses Alchemy's demo endpoint. Replace with your own API key for production use.
- **Database**: Ensure PostgreSQL is running before starting the indexer.
- **Logs**: Check `logs/` directory for detailed system and indexer logs.
- **Configuration**: Main config is in `shovel-config.json`, with a simplified version in `shovel-simple.json`.

## 🤝 Contributing

1. Follow the existing code structure and naming conventions
2. Test changes with both Foundry tests and Shovel indexing
3. Update documentation for any new features or configurations
4. Check logs for any errors or warnings before committing
