# Natanam Event - Razorpay Integration

This project has been updated to include Razorpay payment integration, replacing the screenshot upload functionality.

## Changes Made

### 1. Frontend Changes

- **Replaced** `ScreenshotUpload` component with `RazorpayPayment` component
- **Added** `PaymentSuccess` and `PaymentFailure` components
- **Updated** App.tsx flow: `type` → `form` → `slots` → `payment` → `razorpay` → `success`/`failure`
- **Added** payment data storage in Firebase with payment details

### 2. New Components

- `RazorpayPayment.tsx` - Handles payment processing
- `PaymentSuccess.tsx` - Shows successful booking confirmation
- `PaymentFailure.tsx` - Shows payment failure with retry option

### 3. Firebase Functions (Webhook)

- **Created** `functions/src/index.js` with webhook handlers
- **Added** webhook verification for security
- **Handles** payment.captured and payment.failed events

## Setup Instructions

### 1. Razorpay Account Setup

1. Create account at [https://razorpay.com](https://razorpay.com)
2. Get your Key ID and Key Secret from Dashboard
3. Add webhook URL in Razorpay Dashboard

### 2. Environment Variables

Create `.env` file in root directory:

```bash
REACT_APP_RAZORPAY_KEY_ID=rzp_test_your_key_here
```

### 3. Firebase Functions Setup

```bash
cd functions
npm install firebase-functions firebase-admin
```

### 4. Webhook Configuration

1. Deploy Firebase Functions:
   ```bash
   firebase deploy --only functions
   ```
2. Copy the webhook URL from Firebase Console
3. Add webhook URL in Razorpay Dashboard:
   - Events: `payment.captured`, `payment.failed`
   - URL: `https://your-project.cloudfunctions.net/razorpayWebhook`

### 5. Webhook Secret (Optional but Recommended)

Set webhook secret in Firebase:

```bash
firebase functions:config:set razorpay.webhook_secret="your_webhook_secret"
```

## How It Works

### Payment Flow

1. User selects performance type and fills form
2. User selects time slots
3. Payment summary is shown
4. User clicks "Pay Now" → Razorpay popup opens
5. User completes payment in Razorpay
6. On success: Booking is created in Firebase
7. Webhook updates payment status when captured

### Error Handling

- Payment failures show retry option
- Network errors are handled gracefully
- Webhook verification prevents fraud

## Testing

### Test Payment

Use Razorpay test credentials:

- Card: 4111 1111 1111 1111
- CVV: Any 3 digits
- Expiry: Any future date

### Webhook Testing

Use ngrok for local testing:

```bash
ngrok http 5001
# Use ngrok URL as webhook URL
```

## Important Notes

1. **Replace** `rzp_test_your_key_here` with actual Razorpay Key ID
2. **Set up webhook** for production payments to work properly
3. **Enable** required payment methods in Razorpay Dashboard
4. **Test thoroughly** with test payments before going live

## Support

For any issues:

1. Check browser console for errors
2. Check Firebase Functions logs
3. Check Razorpay Dashboard for payment status
4. Verify webhook is receiving events

## Security

- Webhook signature verification is implemented
- Payment data is stored securely in Firebase
- No sensitive payment details stored in frontend
