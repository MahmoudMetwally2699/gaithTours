# WhatsApp Integration Environment Variables

## Backend (.env file in backend folder)

```bash
# WhatsApp Cloud API Configuration
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
WHATSAPP_VERIFY_TOKEN=your_custom_verify_token
WHATSAPP_WEBHOOK_SECRET=your_webhook_secret

# API URL (for webhook verification)
API_URL=https://your-backend-domain.com

# Socket.io Configuration
SOCKET_CORS_ORIGIN=https://your-frontend-domain.com,http://localhost:3000
```

## Frontend (.env file in frontend folder)

```bash
# API Configuration
REACT_APP_API_URL=https://your-backend-domain.com

# WhatsApp Configuration (if needed for direct API calls)
REACT_APP_WHATSAPP_PHONE_NUMBER=your_whatsapp_phone_number
```

## WhatsApp Cloud API Setup

1. **Create a WhatsApp Business Account**
   - Go to https://developers.facebook.com/
   - Create a new app or use existing one
   - Add WhatsApp product to your app

2. **Get Your Credentials**
   - **Access Token**: From WhatsApp > API Setup > Access Token
   - **Phone Number ID**: From WhatsApp > API Setup > Phone numbers
   - **Business Account ID**: From WhatsApp > API Setup > Business account
   - **Verify Token**: Create a custom string for webhook verification
   - **Webhook Secret**: Create a strong secret for webhook signature verification

3. **Configure Webhook**
   - Webhook URL: `https://your-backend-domain.com/webhook/whatsapp`
   - Verify Token: Use the same token as in your .env file
   - Subscribe to: `messages` and `message_status` events

4. **Test the Integration**
   - Send a test message to your WhatsApp Business number
   - Check if the message appears in your admin dashboard
   - Try replying from the dashboard

## Security Considerations

1. **Webhook Signature Verification**
   - Always verify webhook signatures to ensure requests are from Meta
   - Use a strong webhook secret and keep it secure

2. **Rate Limiting**
   - Implement rate limiting on webhook endpoints
   - Monitor for unusual traffic patterns

3. **Data Privacy**
   - Store only necessary message data
   - Implement data retention policies
   - Ensure GDPR compliance if applicable

4. **Access Control**
   - Restrict WhatsApp admin features to authorized personnel
   - Implement proper authentication and authorization

## Deployment Notes

1. **SSL Certificate Required**
   - WhatsApp webhooks require HTTPS
   - Ensure your backend has a valid SSL certificate

2. **Database Indexes**
   - The models include optimized indexes for performance
   - Run any necessary migrations after deployment

3. **Socket.io Configuration**
   - Configure CORS origins properly for your production domains
   - Consider using sticky sessions if using multiple server instances

4. **Media Handling**
   - WhatsApp media files are temporary and expire
   - Download and store media files if needed for long-term access
   - Implement proper media file management

## Monitoring and Logging

1. **Webhook Monitoring**
   - Monitor webhook delivery success rates
   - Log failed webhook attempts for debugging

2. **Message Delivery**
   - Track message delivery status
   - Monitor response times for customer support metrics

3. **Error Handling**
   - Implement comprehensive error logging
   - Set up alerts for critical failures

## Scaling Considerations

1. **Database Performance**
   - Monitor conversation and message collection sizes
   - Consider archiving old conversations
   - Implement proper pagination for large datasets

2. **Real-time Updates**
   - Socket.io scales well but consider Redis adapter for multiple servers
   - Monitor WebSocket connection counts

3. **Media Storage**
   - Consider using cloud storage for media files
   - Implement CDN for better media delivery performance
