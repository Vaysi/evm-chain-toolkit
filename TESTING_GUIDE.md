# Batch Token Sender Testing Guide

## Private Key Setup (Important!)

### Option 1: Environment File (Recommended)
1. Copy `env.batch.example` to `.env`:
   ```bash
   cp env.batch.example .env
   ```

2. Edit `.env` and add your private key:
   ```env
   PRIVATE_KEY=your_actual_private_key_without_0x_prefix
   ETHEREUM_RPC_URL=https://eth.llamarpc.com
   POLYGON_RPC_URL=https://polygon.llamarpc.com
   ```

### Option 2: Command Line (Less Secure)
```bash
npm run batch-send -- --token 0xYourToken --input recipients.json --private-key your_private_key
```

### Option 3: System Environment Variable
```bash
# Windows
set PRIVATE_KEY=your_private_key_without_0x_prefix

# Linux/Mac
export PRIVATE_KEY=your_private_key_without_0x_prefix
```

## Testing Steps

### Step 1: Create Test Recipients File
Create `test-recipients.json` with small amounts:
```json
[
  {
    "address": "0x0000000000000000000000000000000000000001",
    "amount": "0.001"
  },
  {
    "address": "0x0000000000000000000000000000000000000002", 
    "amount": "0.001"
  }
]
```

### Step 2: Test with Dry Run First
```bash
# Test with dry run (no actual transactions)
npm run batch-send -- --token 0xYourTokenAddress --input test-recipients.json --dry-run
```

### Step 3: Test with Real Token (Small Amounts)
```bash
# Test with real transactions (use small amounts!)
npm run batch-send -- --token 0xYourTokenAddress --input test-recipients.json
```

### Step 4: Test Error Handling
Create `invalid-recipients.json`:
```json
[
  {
    "address": "invalid_address",
    "amount": "100"
  },
  {
    "address": "0x0000000000000000000000000000000000000001",
    "amount": "-50"
  }
]
```

Test error handling:
```bash
npm run batch-send -- --token 0xYourTokenAddress --input invalid-recipients.json --dry-run
```

## What to Check

### Pre-Production Checklist

1. **Private Key Security**:
   - [ ] Private key is in `.env` file (not committed to git)
   - [ ] `.env` is in `.gitignore`
   - [ ] Never share private key in chat/email

2. **Token Contract**:
   - [ ] Verify token contract address on block explorer
   - [ ] Confirm it's the correct token you want to send
   - [ ] Check token has sufficient decimals

3. **Wallet Balance**:
   - [ ] Sufficient token balance for all recipients
   - [ ] Sufficient native currency for gas fees
   - [ ] Test with small amounts first

4. **Recipients Validation**:
   - [ ] All addresses are valid Ethereum addresses
   - [ ] All amounts are positive numbers
   - [ ] No duplicate addresses
   - [ ] Test with 2-3 recipients first

5. **Network Configuration**:
   - [ ] RPC URL is working (test with dry run)
   - [ ] Gas settings are appropriate
   - [ ] Batch size is reasonable

## Safety Tips

1. **Start Small**: Always test with small amounts first
2. **Dry Run First**: Use `--dry-run` to estimate costs
3. **Backup Wallet**: Ensure you have wallet backup before testing
4. **Test Network**: Consider testing on testnet first
5. **Monitor Gas**: Watch gas prices before sending large batches

## Common Issues & Solutions

### Issue: "Invalid private key"
**Solution**: Ensure private key doesn't have `0x` prefix

### Issue: "Insufficient balance"
**Solution**: Check both token balance and native currency balance

### Issue: "Invalid address"
**Solution**: Verify all recipient addresses are valid Ethereum addresses

### Issue: "Gas estimation failed"
**Solution**: Check token contract is valid ERC-20 token

## Expected Output

After successful dry run, you should see:
```
🚀 Batch Token Sender for EVM Network
═══════════════════════════════════════
📋 Loaded 2 recipients from test-recipients.json
🎯 Token Contract: 0xYourTokenAddress
🔗 RPC URL: https://eth.llamarpc.com
📦 Batch Size: 50
🔄 Max Retries: 3
⛽ Gas Multiplier: 1.2
🔍 DRY RUN MODE - No actual transactions will be sent

🔍 Running pre-flight checks...
✅ Token Info: Your Token (SYMBOL) - 18 decimals
💰 Token Balance: 1000.0 SYMBOL
💰 ETH Balance: 0.5 ETH
⛽ Estimated Gas Cost: 0.001 ETH

📊 BATCH TRANSFER SUMMARY
═══════════════════════════════════════
Token Contract: 0xYourTokenAddress
Sender Address: 0xYourWalletAddress
Token Symbol: SYMBOL
Total Recipients: 2
✅ Successful: 2
❌ Failed: 0
💰 Total Amount Sent: 0.002 SYMBOL
⛽ Total Gas Cost: 0.001 ETH
⏱️  Processing Time: 2.50s
🌐 Network: ethereum
🔍 Dry Run: Yes
═══════════════════════════════════════
```

## Production Ready

Once all tests pass:
1. Create your actual recipients file
2. Double-check all addresses and amounts
3. Ensure sufficient balances
4. Run without `--dry-run` flag
5. Monitor the transactions on block explorer
