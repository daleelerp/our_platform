# Paymob Integration Testing Guide

## Prerequisites

1. ✅ All Paymob credentials are set in `.env.local`:
   - `PAYMOB_API_KEY`
   - `PAYMOB_INTEGRATION_ID`
   - `PAYMOB_IFRAME_ID`
   - `PAYMOB_HMAC_SECRET`

2. ✅ Your Next.js server is running with the new environment variables
   - **Important**: Restart your dev server after adding env variables!

## Step-by-Step Testing

### Step 1: Restart Your Server

```bash
# Stop your current server (Ctrl+C)
# Then restart it
npm run dev
```

### Step 2: Test the Checkout Flow

1. **Go to Pricing Page**
   - Navigate to: `http://localhost:3000/pricing`
   - Make sure you're logged in

2. **Select a Plan**
   - Choose any paid plan (not "Free")
   - Select Monthly or Yearly billing
   - (Optional) Enter a promo code if you want to test discounts

3. **Click "Subscribe" or "Start Free Trial"**
   - This will call `/api/subscription/checkout`
   - You should be redirected to Paymob's payment page

### Step 3: Test Payment with Paymob Test Cards

Since you're in **Test Mode** (I saw "Test ?" in your dashboard), use these test cards:

#### ✅ Success Test Card:
- **Card Number**: `4987654321098769`
- **CVV**: Any 3 digits (e.g., `123`)
- **Expiry Date**: Any future date (e.g., `12/25`)
- **Cardholder Name**: Any name (e.g., `Test User`)

#### ❌ Failure Test Card:
- **Card Number**: `5123456789012346`
- **CVV**: Any 3 digits
- **Expiry Date**: Any future date
- This should result in a failed payment

### Step 4: Verify the Flow

After completing payment:

1. **You'll be redirected to**: `/payment/callback?success=true&...`
   - Should show "Payment Successful!" message
   - Auto-redirects to dashboard after 3 seconds

2. **Check Your Dashboard**
   - Go to: `http://localhost:3000/dashboard`
   - Your subscription should be active

3. **Check Database** (Optional)
   - Go to Supabase Dashboard
   - Check `user_subscriptions` table
   - Your subscription should have `status = 'active'`
   - Check `payment_transactions` table for the transaction record

### Step 5: Test Webhook (Important!)

The webhook is called by Paymob to update your database. To test it:

1. **Set up Webhook URL in Paymob**:
   - Go to Paymob Dashboard → Settings → Webhooks
   - Add webhook URL: `https://your-domain.com/api/subscription/webhook`
   - For local testing, use **ngrok** or similar tool

2. **Using ngrok for Local Testing**:
   ```bash
   # Install ngrok (if not installed)
   # Then run:
   ngrok http 3000
   
   # Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
   # Add to Paymob webhook: https://abc123.ngrok.io/api/subscription/webhook
   ```

3. **Test Webhook**:
   - Complete a test payment
   - Check your server logs for webhook calls
   - Verify database is updated

## Troubleshooting

### Issue: "Paymob not configured" message
**Solution**: 
- Check that all env variables are set in `.env.local`
- Restart your dev server
- Check server console for any errors

### Issue: Redirect to Paymob fails
**Solution**:
- Check browser console for errors
- Verify `PAYMOB_API_KEY` is correct
- Check server logs for API errors
- Make sure Integration ID matches your payment method

### Issue: Payment succeeds but subscription not activated
**Solution**:
- Check webhook is configured correctly
- Verify `PAYMOB_HMAC_SECRET` matches Paymob settings
- Check server logs for webhook errors
- Manually check `user_subscriptions` table

### Issue: "Invalid integration ID" error
**Solution**:
- Verify `PAYMOB_INTEGRATION_ID=5412181` matches your Payment Integration ID
- Make sure the integration is active in Paymob dashboard
- Check that the integration type matches (should be "Online Card")

### Issue: Iframe not loading
**Solution**:
- Verify `PAYMOB_IFRAME_ID` is correct
- Check that the iframe exists in Paymob dashboard
- Make sure iframe is active

## Testing Checklist

- [ ] Server restarted with new env variables
- [ ] Can access `/pricing` page
- [ ] Can select a plan and click subscribe
- [ ] Redirected to Paymob payment page
- [ ] Can enter test card details
- [ ] Payment completes successfully
- [ ] Redirected back to `/payment/callback`
- [ ] Success message displayed
- [ ] Subscription activated in database
- [ ] Can access premium features
- [ ] Webhook receives payment notification
- [ ] Database updated via webhook

## Next Steps After Testing

1. **Switch to Production Mode**:
   - In Paymob dashboard, switch from "Test" to "Live" mode
   - Update webhook URL to production domain
   - Test with real (small) payment

2. **Monitor Transactions**:
   - Check Paymob dashboard for transaction logs
   - Monitor your database for subscription updates
   - Set up error alerts

3. **Security**:
   - Never commit `.env.local` to git
   - Use environment variables in production
   - Verify HMAC signatures in webhook

## Need Help?

If you encounter issues:
1. Check server console logs
2. Check browser console for errors
3. Verify all env variables are set
4. Check Paymob dashboard for transaction status
5. Review webhook logs in Paymob dashboard

