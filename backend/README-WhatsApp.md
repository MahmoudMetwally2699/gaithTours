# WhatsApp Integration for Gaith Tours

This integration adds WhatsApp notifications to the Gaith Tours booking system using Meta's WhatsApp Cloud API.

## Features

- ✅ **Booking Approval Notifications**: Customers receive WhatsApp messages when their bookings are approved
- ❌ **Booking Denial Notifications**: Customers are notified via WhatsApp when bookings are denied
- 💳 **Payment Confirmation**: WhatsApp notifications sent when payments are successful
- 🔔 **Payment Reminders**: (Future feature) Automated payment reminder notifications

## Setup Required

1. **Environment Variables**: Add to your `.env` file:
   ```env
   WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
   WHATSAPP_ACCESS_TOKEN=your_access_token
   ```

2. **Meta WhatsApp Cloud API**: Follow the setup guide in `docs/whatsapp-setup.md`

## How It Works

### Booking Approval Flow
1. Admin approves a booking request
2. System generates an invoice
3. Email invoice is sent to customer
4. **WhatsApp notification is sent** with booking details and invoice information

### Payment Confirmation Flow
1. Customer completes payment via Stripe
2. Webhook processes the payment
3. Payment confirmation email is sent
4. **WhatsApp confirmation is sent** with final booking details

### Phone Number Handling
- Automatically formats phone numbers for Saudi Arabia (+966)
- Removes special characters and handles various input formats
- Example: "0501234567" → "966501234567"

## Message Templates

### Booking Approval Message
```
🎉 Booking Approved - Gaith Tours

Dear [Customer Name],
Great news! Your booking request has been approved.

📋 Booking Details:
• Hotel: [Hotel Name]
• Check-in: [Date]
• Check-out: [Date]
• Duration: [X] nights
• Guests: [X] adults, [X] children

💰 Invoice Information:
• Invoice ID: [Invoice ID]
• Amount: [Amount] SAR

📧 You will receive a detailed invoice via email shortly.
```

### Payment Confirmation Message
```
✅ Booking Confirmed - Gaith Tours

Dear [Customer Name],
Your payment has been received and your booking is now confirmed!

📋 Confirmed Booking:
• Hotel: [Hotel Name]
• Check-in: [Date]
• Check-out: [Date]

💳 Payment Confirmed:
• Amount: [Amount] SAR
• Payment ID: [Payment ID]

Have a wonderful trip! 🌟
```

## Testing

Use the test endpoint to verify WhatsApp functionality:

```bash
POST /api/admin/test-whatsapp
{
  "phoneNumber": "966501234567",
  "message": "Test message from Gaith Tours"
}
```

## Error Handling

- WhatsApp failures don't break the booking approval process
- All errors are logged for debugging
- Email notifications continue to work even if WhatsApp fails

## Cost & Limits

- **Free Tier**: 1,000 conversations per month
- **Production**: May require business verification and paid plan
- Each customer interaction starts a 24-hour conversation window

## Files Modified

- `backend/utils/whatsappService.js` - WhatsApp service implementation
- `backend/routes/admin.js` - Added WhatsApp to booking approval/denial
- `backend/routes/payments.js` - Added WhatsApp to payment confirmation
- `backend/docs/whatsapp-setup.md` - Setup instructions
