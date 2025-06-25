# WhatsApp Integration Deployment Checklist

## ✅ Pre-deployment Steps

### 1. Backend Configuration
- [ ] Install dependencies: `npm install socket.io express-rate-limit crypto`
- [ ] Set up environment variables in `.env`:
  ```bash
  WHATSAPP_ACCESS_TOKEN=your_access_token
  WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
  WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
  WHATSAPP_VERIFY_TOKEN=your_verify_token
  WHATSAPP_WEBHOOK_SECRET=your_webhook_secret
  ```
- [ ] Verify MongoDB connection is working
- [ ] Test webhook routes with test script: `node test-whatsapp-webhook.js`

### 2. Frontend Configuration
- [ ] Install dependencies: `npm install socket.io-client react-router-dom lucide-react date-fns --legacy-peer-deps`
- [ ] Set up environment variables in `.env`:
  ```bash
  REACT_APP_API_URL=your_backend_url
  ```
- [ ] Build frontend: `npm run build`

### 3. WhatsApp Business API Setup
- [ ] Create Meta Developer account at <https://developers.facebook.com/>
- [ ] Create new app or add WhatsApp product to existing app
- [ ] Get WhatsApp Business Account ID
- [ ] Get Phone Number ID
- [ ] Generate Access Token
- [ ] Set up webhook URL: `https://your-domain.com/webhook/whatsapp`
- [ ] Configure webhook subscriptions: `messages`, `message_status`
- [ ] Verify webhook with your verify token

## ✅ Deployment Steps

### 1. Backend Deployment
- [ ] Deploy backend to production server
- [ ] Ensure HTTPS is enabled (required for WhatsApp webhooks)
- [ ] Configure production environment variables
- [ ] Test webhook endpoint accessibility from external sources
- [ ] Verify Socket.io CORS settings for production domains

### 2. Frontend Deployment
- [ ] Build production frontend
- [ ] Deploy to hosting service (Vercel, Netlify, etc.)
- [ ] Update API URL to production backend
- [ ] Test admin dashboard access
- [ ] Verify Socket.io connection works

### 3. WhatsApp Configuration
- [ ] Update webhook URL to production endpoint
- [ ] Test webhook verification with Meta
- [ ] Send test message to WhatsApp Business number
- [ ] Verify message appears in admin dashboard
- [ ] Test reply functionality

## ✅ Testing Checklist

### Basic Functionality
- [ ] Send text message to WhatsApp Business number
- [ ] Message appears in admin dashboard conversation list
- [ ] Click on conversation shows message thread
- [ ] Reply from dashboard sends successfully
- [ ] Customer receives reply on WhatsApp
- [ ] Message status updates (sent, delivered, read)

### Advanced Features
- [ ] Real-time message updates without page refresh
- [ ] Desktop notifications for new messages
- [ ] Search conversations by phone number or customer name
- [ ] Filter conversations (all, unread, VIP, archived)
- [ ] Mark conversations as VIP
- [ ] Archive/unarchive conversations
- [ ] Mark messages as read/unread
- [ ] Customer auto-linking by phone number
- [ ] View customer booking history in conversation

### Media Messages Testing
- [ ] Send image to WhatsApp Business number
- [ ] Send document to WhatsApp Business number
- [ ] Send location to WhatsApp Business number
- [ ] Send contact to WhatsApp Business number
- [ ] Verify all message types display correctly in dashboard

### Performance Testing
- [ ] Test with multiple simultaneous conversations
- [ ] Verify pagination works with large message history
- [ ] Test real-time updates with multiple admin users
- [ ] Monitor webhook response times
- [ ] Check database performance with large datasets

## ✅ Monitoring & Maintenance

### Analytics Setup
- [ ] Monitor webhook delivery success rates
- [ ] Track message response times
- [ ] Monitor database performance
- [ ] Set up error logging and alerts
- [ ] Monitor Socket.io connection stability

### Security Verification
- [ ] Webhook signature verification working
- [ ] Rate limiting active on webhook endpoints
- [ ] Admin authentication required for all routes
- [ ] HTTPS enforced for all connections
- [ ] Environment variables secured

### Backup & Recovery
- [ ] Database backup strategy in place
- [ ] Message data retention policy defined
- [ ] Media file backup (if storing locally)
- [ ] Disaster recovery plan documented

## ✅ User Training

### Admin Users
- [ ] Train staff on WhatsApp dashboard navigation
- [ ] Explain conversation management features
- [ ] Show how to reply to customers
- [ ] Demonstrate search and filter functionality
- [ ] Explain VIP and archiving features
- [ ] Show customer information integration

### Documentation
- [ ] Create user manual for admin dashboard
- [ ] Document troubleshooting procedures
- [ ] Create escalation procedures for technical issues
- [ ] Document backup and recovery procedures

## 🚨 Troubleshooting Common Issues

### Webhook Not Receiving Messages
- Verify webhook URL is accessible via HTTPS
- Check WhatsApp Business API webhook configuration
- Verify webhook signature verification is working
- Check server logs for webhook errors

### Real-time Updates Not Working
- Verify Socket.io connection in browser developer tools
- Check CORS configuration for production domains
- Verify authentication tokens are valid
- Check for WebSocket blocking by firewalls

### Messages Not Sending
- Verify WhatsApp Access Token is valid and not expired
- Check API rate limits haven't been exceeded
- Verify phone number ID is correct
- Check message format compliance with WhatsApp API

### Performance Issues
- Monitor database query performance
- Check for missing database indexes
- Verify proper pagination implementation
- Monitor memory usage and optimize if needed

## 📞 Support Contacts

- **WhatsApp Business API Support**: <https://developers.facebook.com/support/>
- **Meta Developer Documentation**: <https://developers.facebook.com/docs/whatsapp/>
- **Technical Issues**: Contact your development team

---

**Deployment Date**: ________________
**Deployed By**: ____________________
**Verified By**: ____________________

## 🎉 Post-Deployment Success Criteria

- [ ] All tests passing
- [ ] Real customers can send/receive messages
- [ ] Admin dashboard fully functional
- [ ] Performance within acceptable limits
- [ ] Monitoring and alerts active
- [ ] Team trained and ready to use

**Status**: ⭐ Ready for Production Use!
