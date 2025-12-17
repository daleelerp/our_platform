# Paymob Issues - Quick Fix Guide

## Problem 1: Not Charging Real Money

**Solution**: Your Paymob account is in **Test Mode**. Switch to **Production Mode**.

### Quick Steps:
1. Login to https://accept.paymob.com
2. Find "Test Mode" toggle → Switch to "Live/Production Mode"
3. Get production API credentials from dashboard
4. Update `.env.local` with production credentials:
   ```env
   PAYMOB_API_KEY=your_production_api_key
   PAYMOB_INTEGRATION_ID=your_production_integration_id
   PAYMOB_IFRAME_ID=your_production_iframe_id
   ```
5. Restart your server: `npm run dev`

**Still not working?** Contact Paymob support: support@paymob.com

---

## Problem 2: Can't Add Other Payment Methods

**Solution**: Enable payment methods in Paymob Dashboard (not in code).

### Quick Steps:
1. Login to https://accept.paymob.com
2. Go to **Settings** → **Payment Methods**
3. Enable: Cards, Vodafone Cash, Etisalat Cash, Orange Cash, Fawry
4. Go to **Settings** → **Integrations**
5. Find your integration (matching `PAYMOB_INTEGRATION_ID`)
6. Ensure all payment methods are enabled for this integration
7. Save changes

**Optional**: If you need separate integration IDs, add to `.env.local`:
```env
PAYMOB_VODAFONE_INTEGRATION_ID=your_vodafone_id
PAYMOB_FAWRY_INTEGRATION_ID=your_fawry_id
# etc.
```

**Still not working?** Contact Paymob support to verify your account has access to all payment methods.

---

## Code Updates Made

✅ Support for multiple payment methods with separate integration IDs  
✅ Better error handling with helpful messages  
✅ Improved logging for debugging  
✅ Support for optional `paymentMethod` parameter in checkout

---

## Full Documentation

For detailed instructions, see: `docs/PAYMOB_PRODUCTION_SETUP.md`

