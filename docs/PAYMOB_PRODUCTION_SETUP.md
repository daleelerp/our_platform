# Paymob Production Mode & Payment Methods Setup Guide

## Issues Fixed

This guide addresses two common issues:
1. **Payments not charging real money** - Account is in test mode
2. **Can't add other payment methods** - Payment methods not enabled in dashboard

## Issue 1: Switch from Test Mode to Production Mode

### Why Payments Don't Charge Real Money

If your Paymob integration is not charging real money, it's because your Paymob account is in **Test Mode**. In test mode, all transactions are simulated and no real money is charged.

### Steps to Enable Production Mode

1. **Login to Paymob Dashboard**
   - Go to: https://accept.paymob.com
   - Login with your merchant account credentials

2. **Switch to Production Mode**
   - Look for a toggle or switch labeled **"Test Mode"** or **"Live Mode"** in the dashboard
   - Usually located in:
     - **Settings** → **Account Settings**
     - Or in the top navigation bar
     - Or in **Settings** → **General Settings**
   
3. **Verify Account Status**
   - Ensure your account is fully verified
   - Complete any pending verification steps (business documents, bank account, etc.)
   - Some accounts require manual approval from Paymob support

4. **Get Production Credentials**
   - After switching to production, you may need to:
     - Generate new API keys (production keys are different from test keys)
     - Verify your integration IDs are active in production
     - Update your `.env.local` with production credentials

5. **Update Environment Variables**
   ```env
   # Production Paymob credentials (NOT test credentials)
   PAYMOB_API_KEY=your_production_api_key
   PAYMOB_INTEGRATION_ID=your_production_integration_id
   PAYMOB_IFRAME_ID=your_production_iframe_id
   PAYMOB_HMAC_SECRET=your_production_hmac_secret
   ```

6. **Restart Your Server**
   ```bash
   # Stop your server (Ctrl+C)
   # Then restart
   npm run dev
   ```

### Important Notes About Production Mode

- ⚠️ **Test Mode vs Production Mode**: These are separate environments with different credentials
- 🔑 **Different API Keys**: Test API keys won't work in production and vice versa
- 💰 **Real Money**: Once in production mode, all payments will charge real money
- ✅ **Testing**: Always test with small amounts first in production
- 🔒 **Security**: Never commit production credentials to git

### If You Can't Switch to Production Mode

If you don't see the option to switch to production:

1. **Contact Paymob Support**
   - Email: support@paymob.com
   - Phone: Check their website for support number
   - Live Chat: Available in dashboard
   - Request: "I need to activate production mode for my account"

2. **Account Verification Required**
   - Some accounts need business verification
   - Submit required documents (business license, tax ID, etc.)
   - Wait for Paymob approval (usually 1-3 business days)

3. **Check Account Type**
   - Ensure you have a **Merchant Account** (not just a developer/test account)
   - API access might require account upgrade

## Issue 2: Enable Multiple Payment Methods

### Why Only Cards Are Showing

Paymob supports multiple payment methods, but they need to be enabled in your Paymob dashboard. The code has been updated to support all payment methods, but the dashboard configuration controls what appears.

### Steps to Enable All Payment Methods

1. **Login to Paymob Dashboard**
   - Go to: https://accept.paymob.com
   - Login with your account

2. **Enable Payment Methods**
   - Navigate to **Settings** → **Payment Methods**
   - Enable the following methods:
     - ✅ **Credit/Debit Cards** (Visa, MasterCard, Meeza)
     - ✅ **Vodafone Cash**
     - ✅ **Etisalat Cash**
     - ✅ **Orange Cash**
     - ✅ **Kashier**
     - ✅ Any other methods you want to offer

3. **Verify Integration Configuration**
   - Go to **Settings** → **Integrations**
   - Find your integration (matching `PAYMOB_INTEGRATION_ID` in your `.env.local`)
   - Click on the integration to edit it
   - Ensure all payment methods are enabled for this integration
   - Save the changes

4. **Alternative: Use Separate Integration IDs (Advanced)**
   
   If your main integration doesn't support all methods, you can use separate integration IDs:
   
   - In Paymob Dashboard → **Settings** → **Integrations**
   - Create or find separate integrations for each payment method
   - Note down each integration ID
   - Add them to your `.env.local`:
   
   ```env
   # Main integration (for cards)
   PAYMOB_INTEGRATION_ID=your_main_integration_id
   
   # Optional: Separate integrations for specific payment methods
   PAYMOB_VODAFONE_INTEGRATION_ID=your_vodafone_id
   PAYMOB_ETISALAT_INTEGRATION_ID=your_etisalat_id
   PAYMOB_ORANGE_INTEGRATION_ID=your_orange_id
   KASHIER_API_KEY=your_kashier_api_key
   ```
   
   **Note**: Usually this is NOT needed - one integration with all methods enabled is sufficient.

5. **Test Payment Methods**
   - After enabling, go through your checkout flow
   - You should now see all enabled payment methods in the Paymob iframe
   - Test each payment method to ensure they work correctly

### Code Changes Made

The checkout route has been updated to:
- ✅ Support optional `paymentMethod` parameter
- ✅ Use specific integration IDs for different payment methods if configured
- ✅ Fall back to main integration ID if specific ones aren't set
- ✅ Better error handling and logging
- ✅ Clear error messages with hints for troubleshooting

### How Payment Method Selection Works

**Option 1: Let Paymob Show All Methods (Recommended)**
- Don't pass `paymentMethod` in the checkout request
- Paymob will show all enabled payment methods in the iframe
- User can choose their preferred method

**Option 2: Pre-select a Payment Method**
- Pass `paymentMethod` in the checkout request (e.g., `"vodafone_cash"`, `"kashier"`)
- The code will use the specific integration ID for that method
- This is useful if you want to show payment method selection before redirecting to Paymob

Example checkout request:
```javascript
{
  planId: "plan_123",
  billingCycle: "monthly",
  paymentMethod: "vodafone_cash" // Optional
}
```

## Complete Setup Checklist

### For Production Mode:
- [ ] Login to Paymob Dashboard
- [ ] Switch from Test Mode to Production Mode
- [ ] Complete account verification if required
- [ ] Get production API credentials
- [ ] Update `.env.local` with production credentials
- [ ] Restart your development server
- [ ] Test with a small real payment

### For Payment Methods:
- [ ] Login to Paymob Dashboard
- [ ] Go to Settings → Payment Methods
- [ ] Enable all desired payment methods
- [ ] Go to Settings → Integrations
- [ ] Verify your integration has all methods enabled
- [ ] (Optional) Add separate integration IDs to `.env.local`
- [ ] Test checkout flow
- [ ] Verify all payment methods appear in Paymob iframe

## Troubleshooting

### "Payments still not charging real money"
- ✅ Verify you're using production API keys (not test keys)
- ✅ Check Paymob dashboard shows "Live Mode" or "Production Mode"
- ✅ Ensure your account is fully verified
- ✅ Contact Paymob support if account is still in test mode

### "Payment methods still not showing"
- ✅ Verify payment methods are enabled in Paymob Dashboard → Settings → Payment Methods
- ✅ Check your integration has all methods enabled
- ✅ Ensure your integration ID is correct in `.env.local`
- ✅ Try clearing browser cache and testing again
- ✅ Contact Paymob support if methods don't appear after enabling

### "Integration ID error"
- ✅ Verify `PAYMOB_INTEGRATION_ID` is correct
- ✅ Check the integration is active in Paymob dashboard
- ✅ Ensure you're using production integration ID (not test)
- ✅ For specific payment methods, verify separate integration IDs are correct

### "Authentication failed"
- ✅ Verify `PAYMOB_API_KEY` is correct
- ✅ Ensure you're using production API key (not test key)
- ✅ Check your account is active and not suspended
- ✅ Verify API access is enabled for your account

## Need Help?

If you're still experiencing issues:

1. **Check Server Logs**
   - Look for error messages in your console
   - The updated code provides detailed error messages with hints

2. **Check Paymob Dashboard**
   - Review transaction logs
   - Check webhook logs
   - Verify integration status

3. **Contact Paymob Support**
   - Email: support@paymob.com
   - Provide your account details and integration IDs
   - Ask specifically about:
     - Production mode activation
     - Payment methods not appearing
     - Integration configuration

## Summary

✅ **Code is ready** - Updated to support all payment methods  
✅ **Better error handling** - Clear messages to help debug issues  
⚠️ **Dashboard configuration required** - Enable methods in Paymob dashboard  
⚠️ **Production mode required** - Switch from test to production for real payments  
📞 **Contact Paymob** - If you can't enable production mode or payment methods

