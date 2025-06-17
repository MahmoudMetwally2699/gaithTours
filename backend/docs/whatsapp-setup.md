# WhatsApp Cloud API Setup Guide

This guide will help you set up Meta's WhatsApp Cloud API for sending booking notifications.

## Prerequisites

1. A Facebook Business account
2. A verified phone number for WhatsApp Business
3. Meta for Developers account

## Step-by-Step Setup

### 1. Create a Facebook App

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click "Create App"
3. Choose "Business" as the app type
4. Fill in your app details:
   - App name: "Gaith Tours WhatsApp"
   - Contact email: your email
   - Business account: select your business account

### 2. Add WhatsApp Business API

1. In your app dashboard, click "Add Product"
2. Find "WhatsApp" and click "Set up"
3. Follow the setup wizard

### 3. Get Your Credentials

1. In the WhatsApp section of your app:
   - Note down your **Phone Number ID**
   - Generate and copy your **Access Token**

### 4. Configure Environment Variables

Add these to your `.env` file:

```env
# WhatsApp Cloud API Configuration
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
WHATSAPP_ACCESS_TOKEN=your_access_token_here
```

### 5. Verify Your Phone Number

1. In the WhatsApp Business API settings
2. Add your business phone number
3. Complete the verification process

### 6. Test the Integration

1. Start your backend server
2. Create a test booking and approve it
3. Check if the WhatsApp message is sent successfully

## Important Notes

### Phone Number Format

The system automatically formats phone numbers:
- If a number doesn't start with a country code, it assumes Saudi Arabia (+966)
- Removes any non-numeric characters
- Example: "0501234567" becomes "966501234567"

### Rate Limits

- **Free Tier**: 1,000 conversations per month
- **Conversation**: A 24-hour window where you can exchange messages with a user
- Each booking approval starts a new conversation

### Message Templates (Optional)

For production use, you may want to create approved message templates:

1. Go to WhatsApp Manager
2. Create message templates for:
   - Booking approval
   - Payment confirmation
   - Payment reminders

### Webhook Setup (Optional)

To receive message status updates:

1. Set up a webhook URL in your WhatsApp app settings
2. Subscribe to message status events
3. Handle delivery and read receipts

## Troubleshooting

### Common Issues

1. **Invalid Phone Number**
   - Ensure phone numbers include country code
   - Remove any special characters

2. **Access Token Issues**
   - Verify the token is not expired
   - Check token permissions include WhatsApp messaging

3. **Phone Number Not Verified**
   - Complete the phone verification process in WhatsApp Manager

### Error Logs

Check the console for WhatsApp-related errors:
```
WhatsApp message error: [error details]
Failed to send booking approval WhatsApp: [error details]
```

### Testing

Use these test phone numbers (if available in your region):
- Test numbers provided by Meta for development

## Security Best Practices

1. **Environment Variables**: Never commit your access token to version control
2. **Token Rotation**: Regularly rotate your access tokens
3. **Rate Limiting**: Monitor your API usage to avoid hitting limits
4. **Error Handling**: The system gracefully handles WhatsApp failures without breaking booking approvals

## Support

- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp)
- [Meta for Developers Support](https://developers.facebook.com/support/)
- [WhatsApp Business Manager](https://business.whatsapp.com/)

## Cost Information

- **Free Tier**: 1,000 conversations/month
- **Paid Plans**: Available for higher volume
- **Business Verification**: May be required for production use

Remember to test thoroughly in development before going live!
