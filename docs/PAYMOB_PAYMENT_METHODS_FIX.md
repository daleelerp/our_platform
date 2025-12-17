# Paymob Payment Methods - Configuration Guide

## Issue
Currently, only "Pay with Card" option is showing in Paymob checkout, but you want to enable all payment methods (Vodafone Cash, Fawry, Etisalat Cash, Orange Cash, etc.).

## Solution
The payment methods shown in Paymob are determined by what's enabled in your **Paymob Dashboard**, not in the code. The code uses an `integration_id` which determines which payment methods are available.

## Steps to Enable All Payment Methods

### 1. Login to Paymob Dashboard
- Go to: https://accept.paymob.com
- Login with your account credentials

### 2. Enable Payment Methods
1. Navigate to **Settings** → **Payment Methods**
2. Enable the following payment methods:
   - ✅ **Credit/Debit Cards** (Visa, MasterCard, Meeza)
   - ✅ **Vodafone Cash**
   - ✅ **Etisalat Cash**
   - ✅ **Orange Cash**
   - ✅ **Fawry**

### 3. Verify Integration Configuration
1. Go to **Settings** → **Integrations**
2. Find your integration (the one matching `PAYMOB_INTEGRATION_ID` in your `.env.local`)
3. Ensure all payment methods are enabled for this integration
4. If needed, create a new unified integration that supports all methods

### 4. Test Payment Methods
After enabling:
1. Go through the checkout flow
2. You should now see all enabled payment methods in the Paymob iframe
3. Test each payment method to ensure they work correctly

## Code Changes Made
- Added documentation comments in `src/app/api/subscription/checkout/route.ts`
- The code now includes notes about how to configure multiple payment methods
- Support for optional separate integration IDs (if needed in the future)

## Environment Variables
Your current `.env.local` should have:
```env
PAYMOB_API_KEY=your_api_key
PAYMOB_INTEGRATION_ID=your_integration_id
PAYMOB_IFRAME_ID=your_iframe_id
```

## Optional: Separate Integration IDs
If you need separate integration IDs for different payment methods (usually not needed), you can add:
```env
PAYMOB_VODAFONE_INTEGRATION_ID=optional_vodafone_id
PAYMOB_FAWRY_INTEGRATION_ID=optional_fawry_id
```

But this is usually **not necessary** - one integration ID with all methods enabled is sufficient.

## Important Notes
- **The issue is NOT in the code** - it's in the Paymob dashboard configuration
- Paymob automatically shows all enabled payment methods in the iframe
- All payment methods go through the same secure Paymob gateway
- The webhook (`/api/subscription/webhook`) handles all payment methods the same way

## Still Not Working?
1. **Contact Paymob Support**: They can help verify your account has access to all payment methods
2. **Check Account Type**: Some payment methods require business verification
3. **Verify Integration**: Make sure your integration ID is correct and active
4. **Test Mode**: Ensure you're testing with the correct environment (test vs production)

## Summary
✅ Code is ready to support all payment methods  
⚠️ You need to enable them in Paymob Dashboard  
📞 Contact Paymob support if methods don't appear after enabling

