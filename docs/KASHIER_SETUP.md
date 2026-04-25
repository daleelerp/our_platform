# Kashier Payment Sessions Integration Setup Guide

## Overview

This guide covers the integration of Kashier's Payment Sessions API for secure and efficient payment processing in the Daleel application.

## Step 1: Get Your Kashier API Credentials

### Finding Your API Credentials:
1. **Login to Kashier Dashboard**: https://www.kashier.io
2. **Navigate to Settings** → **API Keys**
3. **Copy the following credentials**:
   - **API Key**: Your public API key
   - **Secret Key**: Your private secret key (keep this secure!)
   - **Merchant ID**: Your merchant identifier (e.g., MID-XXXX-XXX)

### Environment Setup:
For test mode, use the test environment credentials. For live mode, use production credentials.

## Step 2: Add Environment Variables

Add these to your `.env.local` file:

```env
# Kashier Payment Sessions API Configuration
KASHIER_API_KEY=your_api_key_here
KASHIER_SECRET_KEY=your_secret_key_here
KASHIER_MERCHANT_ID=MID-XXXX-XXX
KASHIER_MODE=test  # Use "live" for production

# Supabase Service Role (for webhooks)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## Step 3: Configure Webhook

1. **In Kashier Dashboard**, go to **Settings** → **Webhooks**
2. **Add a new webhook URL**:
   ```
   https://yourdomain.com/api/subscription/webhook
   ```
   For local testing:
   ```
   https://your-ngrok-url.ngrok.io/api/subscription/webhook
   ```
3. **Select events**: **Payment Success**, **Payment Failed**, **Payment Pending**
4. **Save the webhook**

## Step 4: Payment Flow

### How It Works:

1. **User selects a plan** → Frontend calls `/api/subscription/checkout`
2. **Checkout API creates Payment Session** → Calls Kashier API to create session
3. **Kashier returns session URL** → Frontend redirects user to payment page
4. **User completes payment** → Kashier processes payment
5. **Webhook notifies backend** → `/api/subscription/webhook` receives status
6. **User redirected back** → `/payment/callback` handles redirect and updates UI
7. **Subscription activated** → Access granted automatically

### API Endpoints:

- **Create Session**: `POST /api/subscription/checkout`
- **Payment Callback**: `GET /payment/callback`
- **Webhook Handler**: `POST /api/subscription/webhook`

## Step 5: Test the Integration

### Test Mode Configuration:
- Set `KASHIER_MODE=test` in your environment
- Use test API credentials
- Use test cards provided by Kashier

### Test Cards (Kashier Test Mode):
- **Card Number**: `4111111111111111`
- **CVV**: `123`
- **Expiry**: Any future date
- **Name**: Any name

### Test Flow:
1. Go to `/pricing` page
2. Select a plan
3. Click "Subscribe"
4. You'll be redirected to Kashier payment page
5. Use test card details
6. Complete payment
7. You'll be redirected back to `/dashboard`
8. Check your Supabase `user_subscriptions` table for updated status

## Step 6: Go Live

### Production Setup:
1. **Switch to live credentials**:
   ```env
   KASHIER_MODE=live
   KASHIER_API_KEY=your_live_api_key
   KASHIER_SECRET_KEY=your_live_secret_key
   KASHIER_MERCHANT_ID=your_live_merchant_id
   ```

2. **Update webhook URL** to your production domain
3. **Test with small amounts** first
4. **Monitor webhook logs** for any issues

## Supported Payment Methods

The integration supports all Kashier payment methods:
- 💳 **Credit/Debit Cards** (Visa, MasterCard, etc.)
- 📱 **Digital Wallets** (Vodafone Cash, Etisalat Cash, Orange Cash)
- 🏪 **Bank Installments**
- 🛒 **Buy Now Pay Later (BNPL)**
- And more...

## Configuration Options

### Payment Session Parameters:
- `expireAt`: Session expiration time (default: 24 hours)
- `maxFailureAttempts`: Maximum retry attempts (default: 3)
- `allowedMethods`: Payment methods to show (default: "card,wallet")
- `defaultMethod`: Default selected method (default: "card")
- `brandColor`: UI branding color
- `display`: Language ("en" or "ar")
- `enable3DS`: 3D Secure authentication

### Customizing Payment Methods:
```typescript
// In checkout route, you can specify allowed methods:
allowedMethods: "card,wallet,bank_installments"
// Or restrict to specific providers:
allowedMethods: "card,bank_installments[nbe],wallet[vodafone]"
```

## Troubleshooting

### Common Issues:

1. **Session Creation Fails**:
   - Check API credentials
   - Verify merchant ID format
   - Check API key permissions

2. **Webhook Not Received**:
   - Verify webhook URL is accessible
   - Check firewall settings
   - Confirm HTTPS is enabled

3. **Payment Callback Issues**:
   - Check BASE_URL environment variable
   - Verify redirect URLs in Kashier dashboard

4. **Signature Verification**:
   - Ensure KASHIER_SECRET_KEY is set
   - Check webhook payload structure

### Debug Mode:
Set `KASHIER_MODE=debug` to enable detailed logging (for development only).

## Security Notes

- **Never expose secret keys** in frontend code
- **Always verify webhooks** using signature verification
- **Use HTTPS** for all payment-related URLs
- **Store credentials securely** in environment variables
- **Monitor webhook logs** for suspicious activity

## Support

For Kashier-specific issues:
- **Documentation**: https://developer.kashier.io
- **Support**: Contact Kashier support team
- **API Reference**: Check the Payment Sessions API docs

For Daleel integration issues:
- Check server logs
- Verify database records
- Test with small amounts first