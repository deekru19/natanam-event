# Firebase Functions Deployment Guide

## Prerequisites

1. Firebase CLI installed: `npm install -g firebase-tools`
2. Firebase project set up
3. Razorpay account with webhook secret

## Step-by-Step Deployment

### 1. Login to Firebase

```bash
firebase login
```

### 2. Initialize Firebase Project (if not done already)

```bash
cd /Users/deepakbharadwaj/Documents/natanam-event
firebase init
```

Select:

- Functions: Configure a Cloud Functions directory
- Hosting: Configure files for Firebase Hosting
- Use existing project (select your project)

### 3. Deploy Functions

```bash
firebase deploy --only functions
```

### 4. Get Function URLs

After deployment, you'll see URLs like:

```
✔  functions[razorpayWebhook(us-central1)] https://us-central1-your-project.cloudfunctions.net/razorpayWebhook
✔  functions[webhookStatus(us-central1)] https://us-central1-your-project.cloudfunctions.net/webhookStatus
```

### 5. Configure Razorpay Webhook

1. Go to Razorpay Dashboard → Settings → Webhooks
2. Create new webhook with:
   - **URL**: `https://us-central1-your-project.cloudfunctions.net/razorpayWebhook`
   - **Events**: Select `payment.captured` and `payment.failed`
   - **Secret**: Generate a secret (save it)

### 6. Set Webhook Secret in Firebase

```bash
firebase functions:config:set razorpay.webhook_secret="your_webhook_secret_here"
```

### 7. Deploy Functions Again (to apply config)

```bash
firebase deploy --only functions
```

### 8. Update Environment Variables

Create `.env` file in project root:

```bash
REACT_APP_RAZORPAY_KEY_ID=rzp_test_your_key_id
```

### 9. Test Webhook Endpoint

Test if your webhook is live:

```bash
curl https://us-central1-your-project.cloudfunctions.net/webhookStatus
```

Should return:

```json
{
  "message": "Webhook endpoint is active",
  "timestamp": "2025-08-07T12:00:00.000Z"
}
```

## Production Setup

### 1. Switch to Live Keys

- Update `.env` with live Razorpay keys (rzp*live*...)
- Update webhook URL in Razorpay Dashboard

### 2. Deploy to Production

```bash
npm run build
firebase deploy
```

## Webhook Events Handled

### payment.captured

- Confirms booking in database
- Sets booking status to 'confirmed'
- Updates payment status to 'success'

### payment.failed

- Cancels booking in database
- Releases booked time slots
- Sets booking status to 'cancelled'
- Updates payment status to 'failed'

## Monitoring & Logs

### View Function Logs

```bash
firebase functions:log
```

### Real-time Logs

```bash
firebase functions:log --only razorpayWebhook
```

## Troubleshooting

### Common Issues

1. **Webhook signature verification fails**

   - Check webhook secret is set correctly
   - Verify webhook URL is correct

2. **Functions deployment fails**

   - Check Node.js version (should be 18+)
   - Verify Firebase project permissions

3. **Database updates fail**
   - Check Firestore security rules
   - Verify Firebase Admin SDK permissions

### Testing Webhook Locally

1. Use ngrok for local testing:

```bash
npm install -g ngrok
firebase emulators:start --only functions
ngrok http 5001
```

2. Use ngrok URL as webhook URL in Razorpay Dashboard

### Debug Steps

1. Check Firebase Functions logs
2. Check Razorpay Dashboard for webhook delivery status
3. Test payment with Razorpay test cards:
   - Card: 4111 1111 1111 1111
   - CVV: Any 3 digits
   - Expiry: Any future date

## Support

If you encounter issues:

1. Check Firebase Functions logs
2. Verify webhook is receiving events in Razorpay Dashboard
3. Test with small amounts first
4. Contact Razorpay support for payment-related issues
