# WhatsApp Templates Test Guide

This directory contains test files to verify your WhatsApp templates are working correctly.

## Prerequisites

1. **Environment Variables**: Make sure you have set up your environment variables in `.env`:
   ```
   WHATSAPP_ACCESS_TOKEN=your_access_token_here
   WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
   ```

2. **Template Approval**: Ensure your Arabic templates are approved in Meta Business Manager:
   - `booking_approval_ar`
   - `payment_reminder_ar`
   - `booking_confirmation_ar`
   - `booking_denial_ar`

## Test Files

### 1. `test-whatsapp-templates-complete.js`
Comprehensive test suite for both English and Arabic templates.

**Run all tests:**
```bash
node test-whatsapp-templates-complete.js
```

**Test specific components:**
```bash
# Check configuration only
node test-whatsapp-templates-complete.js --config-only

# Test simple message only
node test-whatsapp-templates-complete.js --simple-only

# Test English templates only
node test-whatsapp-templates-complete.js --english-only

# Test Arabic templates only
node test-whatsapp-templates-complete.js --arabic-only

# Show help
node test-whatsapp-templates-complete.js --help
```

### 2. `test-whatsapp-templates.js`
Basic test suite for existing English templates.

```bash
node test-whatsapp-templates.js
```

## Template Status Codes

Common WhatsApp API error codes you might encounter:

- **133010**: Account not registered with Meta Cloud API
- **131056**: Message template not approved or configured
- **131021**: Invalid recipient phone number
- **100**: Invalid parameter (check template parameters)

## Test Phone Number

The tests use `966501234567` as the test phone number. Make sure:
1. This number is registered with WhatsApp
2. You have permission to send messages to this number
3. Or update the phone number in the test files to your own number

## Arabic Template Structure

Your Arabic templates should have these exact names in Meta Business Manager:
- `booking_approval_ar`
- `payment_reminder_ar`
- `booking_confirmation_ar`
- `booking_denial_ar`

## Troubleshooting

1. **Templates not working**: Check Meta Business Manager for template approval status
2. **Phone number errors**: Verify the test phone number is WhatsApp-enabled
3. **Authentication errors**: Verify your access token and phone number ID
4. **Parameter errors**: Check that template parameters match the expected format

## Next Steps

After successful testing:
1. Integrate the Arabic template methods into your booking flow
2. Add language detection or user preference settings
3. Update your admin interface to support both languages
4. Consider adding more languages as needed
