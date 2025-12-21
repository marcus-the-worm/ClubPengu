# Server Environment Variables

Create a `.env` file in the `server/` directory with the following variables:

```bash
# ===========================================
# Club Penguin Server Environment Configuration
# ===========================================

# ==================== SERVER ====================
PORT=3001
NODE_ENV=development
APP_DOMAIN=clubpengu.com

# ==================== DATABASE ====================
MONGODB_URI=mongodb://localhost:27017/clubpenguin

# ==================== AUTHENTICATION ====================
JWT_SECRET=your-secret-key-change-this-in-production

# ==================== SOLANA / x402 ====================
# Solana RPC endpoint (use your own RPC for production - Helius, QuickNode, etc.)
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Network identifier
# Mainnet: solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp
# Devnet: solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1
SOLANA_NETWORK=solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp

# CPw3 Token contract address (SPL Token mint)
CPW3_TOKEN_ADDRESS=YOUR_CPW3_TOKEN_MINT_ADDRESS

# Treasury wallet for rent payments
RENT_WALLET_ADDRESS=YOUR_RENT_TREASURY_WALLET

# x402 Facilitator URL
X402_FACILITATOR_URL=https://x402.org/facilitator

# ==================== IGLOO RENTAL CONFIG ====================
# Daily rent in CPw3 base units (default: 10000)
DAILY_RENT_CPW3=10000

# Minimum balance required to rent (default: 70000 = 7 days)
MINIMUM_BALANCE_CPW3=70000

# Grace period before eviction in hours (default: 12)
GRACE_PERIOD_HOURS=12

# Rent check interval in milliseconds (default: 60000 = 60 seconds)
RENT_CHECK_INTERVAL_MS=60000

# ==================== PERMANENT IGLOO OWNERS ====================
# Wallet addresses for permanently owned igloos
SKNY_GANG_WALLET=SKNY_GANG_WALLET_ADDRESS
REGEN_WALLET=REGEN_WALLET_ADDRESS
```

## Required for Production

| Variable | Description |
|----------|-------------|
| `SOLANA_RPC_URL` | Your Solana RPC endpoint (Helius, QuickNode, etc.) |
| `CPW3_TOKEN_ADDRESS` | The CPw3 SPL token mint address |
| `RENT_WALLET_ADDRESS` | Treasury wallet to receive rent payments |
| `JWT_SECRET` | Strong random string for authentication |
| `MONGODB_URI` | Your MongoDB connection string |

## x402 Flow

The `X402_FACILITATOR_URL` is the x402 payment facilitator that:
1. Verifies payment signatures
2. Executes on-chain token transfers when server calls `/settle`

For mainnet testing, coordinate with the x402 team for facilitator access.

