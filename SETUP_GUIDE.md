# Private Key Setup & Testing Guide

## Private Key Security

### Safe Methods (Recommended)

#### Method 1: Environment File (.env) - Best Practice
1. Copy the example environment file:
   ```bash
   cp env.batch.example .env
   ```

2. Edit `.env` and add your private key:
   ```env
   PRIVATE_KEY=your_actual_private_key_without_0x_prefix
   ETHEREUM_RPC_URL=https://eth.llamarpc.com
   POLYGON_RPC_URL=https://polygon.llamarpc.com
   ```

3. Add `.env` to `.gitignore` to prevent committing your private key:
   ```bash
   echo ".env" >> .gitignore
   ```

#### Method 2: System Environment Variable
```bash
# Windows Command Prompt
set PRIVATE_KEY=your_private_key_without_0x_prefix

# Windows PowerShell
$env:PRIVATE_KEY="your_private_key_without_0x_prefix"

# Linux/Mac
export PRIVATE_KEY=your_private_key_without_0x_prefix
```

### Unsafe Methods (Avoid)

- Never put private key directly in command line (visible in process history)
- Never commit private key to git repository
- Never share private key in chat/email/screenshots

## Testing Steps

### Step 1: Create Test Environment
```bash
# Create .env file with your private key
cp env.batch.example .env
# Edit .env and add your PRIVATE_KEY
```

### Step 2: Create Test Recipients (Small Amounts!)
Create `test-recipients.json`:
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

### Step 3: Test Dry Run First
```bash
# Test with dry run (no actual transactions, no gas spent)
npm run batch-send -- --token 0xYourTokenAddress --input test-recipients.json --dry-run
```

Expected Output:
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
```

### Step 4: Test with Real Token (Small Amounts!)
```bash
# Only after dry run passes successfully
npm run batch-send -- --token 0xYourTokenAddress --input test-recipients.json
```

## Pre-Production Checklist

1. **Private Key Security**:
   - [ ] Private key is in `.env` file (not committed to git)
   - [ ] `.env` is in `.gitignore`
   - [ ] Never share private key in chat/email
   - [ ] Test with small amounts first

2. **Token Contract Validation**:
   - [ ] Verify token contract address on block explorer
   - [ ] Confirm it's the correct token you want to send
   - [ ] Check token has sufficient decimals
   - [ ] Test with dry run first

3. **Wallet Balance Check**:
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
   - [ ] Batch size is reasonable (start with 10-20)

## Safety Tips

1. **Start Small**: Always test with small amounts first (0.001 tokens)
2. **Dry Run First**: Use `--dry-run` to estimate costs
3. **Backup Wallet**: Ensure you have wallet backup before testing
4. **Test Network**: Consider testing on testnet first
5. **Monitor Gas**: Watch gas prices before sending large batches

## Common Issues & Solutions

### Issue: "Invalid private key"
**Solution**: 
- Ensure private key doesn't have `0x` prefix
- Check private key is 64 characters long
- Verify it's the correct private key

### Issue: "Insufficient balance"
**Solution**: 
- Check both token balance and native currency balance
- Ensure you have enough native currency for gas fees
- Verify token contract address is correct

### Issue: "Invalid address"
**Solution**: 
- Verify all recipient addresses are valid Ethereum addresses
- Use checksum addresses (mixed case)
- Check for typos in addresses

### Issue: "Gas estimation failed"
**Solution**: 
- Check token contract is valid ERC-20 token
- Verify token contract address is correct
- Ensure wallet has sufficient native currency for gas

## Expected Output After Success

```
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
🔍 Dry Run: No
═══════════════════════════════════════

✅ Batch transfer completed!
📄 Report saved to: ./output/batch_transfer_report_0xYourToken_2025-10-26T10-30-00-000Z.json
```

## Production Ready Commands

Once all tests pass:

```bash
# Create your actual recipients file
# Double-check all addresses and amounts
# Ensure sufficient balances

# Run the actual batch transfer
npm run batch-send -- --token 0xYourTokenAddress --input your-recipients.json

# Monitor transactions on block explorer
# Check the generated report files
```

## Generated Files

After successful execution, you'll get:

1. **`batch_transfer_report_<token>_<timestamp>.json`** - Complete transaction details
2. **`failed_transfers_<token>_<timestamp>.json`** - Failed transfers for retry (if any)
3. **`retry_failed_<token>_<timestamp>.sh`** - Executable retry script (if any failures)

## Retry Failed Transfers

If some transfers fail:
```bash
# Use the generated retry script
chmod +x retry_failed_*.sh
./retry_failed_*.sh

# Or manually retry
npm run batch-send -- --token 0xYourToken --input failed_transfers_*.json
```
