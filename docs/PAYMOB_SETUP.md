# Paymob Integration Setup Guide

## Step 1: Get Your API Credentials

### Finding Integration ID:
1. In your Paymob dashboard sidebar, click **"Developers"** (the one with the `>_` icon)
2. Click **"Payment Integrations"** (the one with the `$` icon)
3. In the table, find your payment integration (e.g., "Online Card")
4. Copy the **ID** number from the table (e.g., `5412181`) - This is your **Integration ID**
5. **Click on the Integration ID** (the blue number) to see more details - the API Key might be on that page

### Finding API Key:
The API Key is usually found in one of these places:
- **Option 1**: Click on your Integration ID (from step above) and look for "API Key" or "Secret Key"
- **Option 2**: Go to **Account Settings** → **API Settings** (or look in the top right menu)
- **Option 3**: Check the **"Documentation"** section under Developers - it might have API credentials
- **Option 4**: The API Key might be shown when you first created your account - check your email or account setup

**Note**: The API Key is a long string (usually starts with letters/numbers). If you can't find it, you may need to:
- Generate a new one in Account Settings
- Contact Paymob support to retrieve it

### Finding Iframe ID:
1. Still in the **"Developers"** section, click **"Iframes"** (the one with the document icon)
2. You should see a list of your iframes
3. Copy the **Iframe ID** (usually a number like: `123456`)
4. If you don't have an iframe yet, you may need to create one first

### If you don't see these options:
- Make sure you clicked on **"Developers"** in the sidebar (not just hovered)
- The submenu should expand showing: Payment Integrations, Iframes, Documentation, Plugins
- If it's not expanding, try clicking directly on "Payment Integrations"

### Finding HMAC Secret (for Webhook Security):
1. Go to: **Settings** → **Webhooks** (or **Notifications**)
2. Look for **"HMAC Secret"** or **"Webhook Secret"**
3. If not available, you can generate one or leave it empty for testing
4. Copy the secret key

## Step 2: Add to Environment Variables

Add these to your `.env.local` file:

```env
# Paymob Configuration
PAYMOB_API_KEY=your_api_key_here
PAYMOB_INTEGRATION_ID=your_integration_id_here
PAYMOB_IFRAME_ID=your_iframe_id_here
PAYMOB_HMAC_SECRET=your_hmac_secret_here

# Supabase Service Role (for webhooks)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## Step 3: Configure Webhook

1. In Paymob Dashboard, go to: **Settings** → **Webhooks**
2. Add a new webhook URL:
   ```
   https://yourdomain.com/api/subscription/webhook
   ```
   For local testing:
   ```
   https://your-ngrok-url.ngrok.io/api/subscription/webhook
   ```
3. Select events: **Transaction Success** and **Transaction Failed**
4. Save the webhook

## Step 4: Test the Integration

### Test Cards (Paymob Test Mode):
- **Card Number:** `4987654321098769`
- **CVV:** Any 3 digits
- **Expiry:** Any future date
- **Name:** Any name

### Test Flow:
1. Go to `/pricing` page
2. Select a plan
3. Click "Start Free Trial" or "Subscribe"
4. You'll be redirected to Paymob payment page
5. Use test card details
6. Complete payment
7. You'll be redirected back to `/payment/callback`
8. Check your Supabase `user_subscriptions` table for updated status

## Alternative: If You Can't Find API Settings

If you can't find the API settings in your Paymob dashboard:

1. **Contact Paymob Support:**
   - Email: support@paymob.com
   - Phone: Check their website
   - Live Chat: Available in dashboard

2. **Request API Access:**
   - Some accounts need API access enabled
   - Ask them to enable "API Integration" for your account
   - They'll provide the credentials

3. **Check Your Account Type:**
   - Make sure you have a **Merchant Account** (not just a test account)
   - API access might require account verification

## Troubleshooting

### "API Key not found" error:
- Make sure you copied the full key (it's very long)
- Check for extra spaces
- Verify the key is active in Paymob dashboard

### "Integration ID invalid" error:
- Make sure you're using the correct Integration ID for your payment method
- Check that the integration is active
- Verify you selected the right payment method type

### Webhook not receiving calls:
- Check webhook URL is correct
- Verify HMAC secret matches
- Check Paymob webhook logs in dashboard
- Make sure your server is accessible (use ngrok for local testing)

## Need Help?

If you're still stuck:
1. Take a screenshot of your Paymob dashboard
2. Check Paymob documentation: https://docs.paymob.com
3. Contact Paymob support with your account details


