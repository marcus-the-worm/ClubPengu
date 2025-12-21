# Client Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# ===========================================
# Club Penguin Client Environment Configuration
# ===========================================

# ==================== SOLANA / x402 ====================
# CPw3 Token contract address (SPL Token mint)
VITE_CPW3_TOKEN_ADDRESS=YOUR_CPW3_TOKEN_MINT_ADDRESS

# Treasury wallet for rent payments
VITE_RENT_WALLET_ADDRESS=YOUR_RENT_TREASURY_WALLET

# Solana network ('mainnet' or 'devnet')
VITE_SOLANA_NETWORK=mainnet

# x402 Facilitator URL (optional - defaults to https://x402.org/facilitator)
VITE_X402_FACILITATOR_URL=https://x402.org/facilitator
```

## Notes

- All client-side environment variables must be prefixed with `VITE_` to be accessible via `import.meta.env`
- These values are embedded in the build and visible to users
- For server-side variables, see `server/ENV_TEMPLATE.md`

## Matching Server Values

The following values should match between client and server:

| Client Variable | Server Variable |
|-----------------|-----------------|
| `VITE_CPW3_TOKEN_ADDRESS` | `CPW3_TOKEN_ADDRESS` |
| `VITE_RENT_WALLET_ADDRESS` | `RENT_WALLET_ADDRESS` |
| `VITE_SOLANA_NETWORK` | `SOLANA_NETWORK` |
| `VITE_X402_FACILITATOR_URL` | `X402_FACILITATOR_URL` |

