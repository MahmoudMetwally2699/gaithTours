# WhatsApp OTP Verification - Implementation Guide

## Current Status: ⏸️ DISABLED (Waiting for Template Approval)

Phone numbers are currently saved directly without OTP verification.

---

## When Template is Approved - Follow These Steps:

### Step 1: Get Your Template Details

From Meta Business Suite, note down:
- **Template Name**: e.g., `verification_code`
- **Language Code**: e.g., `ar` or `en`

### Step 2: Update WhatsApp Service

Edit `backend/utils/whatsappService.js`:

Find the `sendVerificationCode` method and replace the plain text message with template:

```javascript
async sendVerificationCode(phone, code, language = 'ar') {
  try {
    if (!this.accessToken || !this.phoneNumberId) {
      throw new Error('WhatsApp credentials not configured');
    }

    const formattedPhone = phone.replace(/[^\d]/g, '');

    console.log(`📱 Sending verification code to ${formattedPhone}`);

    // Use template instead of plain text
    const data = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'template',
      template: {
        name: 'YOUR_TEMPLATE_NAME_HERE',  // <-- Replace with your template name
        language: {
          code: language === 'ar' ? 'ar' : 'en'
        },
        components: [
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                text: code  // The 6-digit OTP code
              }
            ]
          }
        ]
      }
    };

    const response = await axios.post(this.baseUrl, data, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`✅ Verification code sent successfully to ${formattedPhone}`);
    return response.data;
  } catch (error) {
    console.error('❌ Failed to send verification code:', error.message);
    throw error;
  }
}
```

### Step 3: Restore PhoneNumberModal with OTP

Replace `frontend/src/components/PhoneNumberModal.tsx` with the full OTP version.

The full OTP version code is saved in:
`C:\Users\mahme\.gemini\antigravity\brain\94bc9302-af6f-49f1-a054-acdadd05acf8\PhoneNumberModal_OTP_backup.tsx`

---

## Backend Endpoints (Already Implemented)

These endpoints are already in `backend/routes/auth.js`:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/send-phone-code-auth` | POST | Send OTP to authenticated user |
| `/api/auth/verify-phone-code` | POST | Verify OTP code |

## Frontend API Methods (Already Implemented)

These methods are already in `frontend/src/services/api.ts`:

```typescript
authAPI.sendPhoneVerificationCode(phone, language)
authAPI.verifyPhoneCode(phone, code)
```

---

## User Model Fields (Already Added)

In `backend/models/User.js`:

```javascript
isPhoneVerified: { type: Boolean, default: false }
phoneVerificationCode: String  // Hashed OTP
phoneVerificationExpires: Date  // 10 min expiry
phoneVerificationLastSent: Date  // Rate limiting
```

---

## Template Example for Meta Business Suite

**Category**: Utility
**Name**: `verification_code`
**Languages**: Arabic, English

**Arabic Body**:
```
مرحباً من Gaith Tours! 🔐

رمز التحقق الخاص بك هو: {{1}}

صالح لمدة 10 دقائق. لا تشاركه مع أحد.
```

**English Body**:
```
Hello from Gaith Tours! 🔐

Your verification code is: {{1}}

Valid for 10 minutes. Do not share with anyone.
```

---

## Testing Checklist

When re-enabling OTP:

- [ ] Template approved in Meta
- [ ] Update template name in `whatsappService.js`
- [ ] Restore `PhoneNumberModal.tsx` with OTP flow
- [ ] Test with a real phone number
- [ ] Verify code is received on WhatsApp
- [ ] Verify code validation works
- [ ] Verify rate limiting (60 second cooldown)
- [ ] Verify code expiry (10 minutes)
