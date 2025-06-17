const axios = require('axios');

// Test WhatsApp credentials
const WHATSAPP_PHONE_NUMBER_ID = '703983149463496'; // Replace with your Phone Number ID
const WHATSAPP_ACCESS_TOKEN = 'EAAPnCPzlYAoBO3bTa19y1UkBVIG5iTrlgxYra87nQCNZBIi6u4ydKKidwIJx4ndH1ZBr2VWXSYMbtWSmiI453PUNLlLgvlANeGFcVs4dqK9DtZAIpdNFZB079ob2sv898GZBfNQuxdbRAHkDvdk1YAdPU37iY4Dsv2naNBjj8VkvvudEi2Mgy5FM1rVAjGmcFZCgZDZD'; // Replace with your Access Token
const TEST_PHONE_NUMBER = '201211477551'; // Replace with the recipient number you are testing with

// !!!!! IMPORTANT: CONFIGURE THIS SECTION FOR TEMPLATE TESTING !!!!!
// Find an APPROVED template in your WhatsApp Manager.
// If it has variables like {{1}}, {{2}}, you MUST provide them in the components.
const TEST_TEMPLATE_NAME = 'hello_world'; // REPLACE with your actual approved template name
const TEST_TEMPLATE_LANGUAGE_CODE = 'en_US'; // REPLACE with your template's language code
const TEST_TEMPLATE_COMPONENTS = [ // Set to null or empty array [] if your template has NO variables OR buttons
  // Example for a template with ONE variable in the body: "Hello {{1}}!"
  // {
  //   "type": "body",
  //   "parameters": [
  //     { "type": "text", "text": "Test User Name" } // Value for {{1}}
  //   ]
  // }
  // Example for a template with TWO variables in the body: "Order {{1}} is {{2}}."
  // {
  //   "type": "body",
  //   "parameters": [
  //     { "type": "text", "text": "12345" },         // Value for {{1}}
  //     { "type": "text", "text": "confirmed" }      // Value for {{2}}
  //   ]
  // }
  // Example for a template with a URL button that has a dynamic part in the URL
  // {
  //   "type": "button",
  //   "sub_type": "url",
  //   "index": "0", // 0-indexed button
  //   "parameters": [
  //       { "type": "text", "text": "dynamic_part_of_url" } // e.g., if button URL is https://example.com/{{1}}
  //   ]
  // }
];
// If your template has no variables or dynamic buttons, set TEST_TEMPLATE_COMPONENTS to null or []

async function diagnosticTests() {
  console.log('🔍 WhatsApp API Diagnostic Script');
  console.log('=================================\n');

  await testAccessToken();
  await testPhoneNumberIdAndWABA(); // Combined and enhanced
  await testListMessageTemplates(); // More focused template listing
  await testSendTextFreeform(); // To test 24-hour window / test numbers
  await testSendTemplateMessage(); // To test production-like sending
}

async function testAccessToken() {
  console.log('🔑 Test 1: Access Token Validation');
  console.log('----------------------------------');
  try {
    const url = `https://graph.facebook.com/v22.0/me?access_token=${WHATSAPP_ACCESS_TOKEN}`;
    const response = await axios.get(url);
    console.log('✅ Access token is valid.');
    console.log('   App ID associated with token:', response.data.id);
    console.log('   App Name associated with token:', response.data.name);

    // Debugging permissions
    const debugTokenUrl = `https://graph.facebook.com/debug_token?input_token=${WHATSAPP_ACCESS_TOKEN}&access_token=${WHATSAPP_ACCESS_TOKEN}`; // App token can debug itself
    const debugResponse = await axios.get(debugTokenUrl);
    if (debugResponse.data.data) {
        console.log('   Token Scopes/Permissions:', debugResponse.data.data.scopes.join(', '));
        if (!debugResponse.data.data.scopes.includes('whatsapp_business_messaging') || !debugResponse.data.data.scopes.includes('whatsapp_business_management')) {
            console.warn('   ⚠️ WARNING: Token might be missing `whatsapp_business_messaging` or `whatsapp_business_management` scope!');
        }
    }
  } catch (error) {
    console.log('❌ Access token is invalid, expired, or has issues.');
    logDetailedError(error);
  }
  console.log('');
}

async function testPhoneNumberIdAndWABA() {
  console.log('📱 Test 2: Phone Number ID & WABA Validation');
  console.log('-------------------------------------------');
  if (!WHATSAPP_PHONE_NUMBER_ID) {
    console.log('⚠️ WHATSAPP_PHONE_NUMBER_ID is not set. Skipping test.');
    console.log('');
    return;
  }
  try {
    const fields = [
      'display_phone_number', 'verified_name', 'quality_rating',
      'code_verification_status', 'is_official_business_account',
      'account_mode', 'name_status', 'new_name_status', 'status',
      'certificate', 'wa_business_account_id' // Crucial for getting WABA details
    ].join(',');

    const url = `https://graph.facebook.com/v22.0/${WHATSAPP_PHONE_NUMBER_ID}?fields=${fields}&access_token=${WHATSAPP_ACCESS_TOKEN}`;
    const response = await axios.get(url);

    console.log('✅ Phone Number ID details retrieved:');
    console.log('   Display Phone Number:', response.data.display_phone_number);
    console.log('   Verified Name:', response.data.verified_name || 'N/A');
    console.log('   Quality Rating:', response.data.quality_rating);
    console.log('   Code Verification Status:', response.data.code_verification_status);
    console.log('   Is Official Business Account:', response.data.is_official_business_account);
    console.log('   Account Mode (from Phone Node):', response.data.account_mode || 'N/A - Check WABA');
    console.log('   Phone Number Status:', response.data.status); // e.g., CONNECTED
    console.log('   Certificate:', response.data.certificate ? 'Present' : 'Not Present/Not Applicable');
    console.log('   WABA ID:', response.data.wa_business_account_id);

    if (response.data.wa_business_account_id) {
      console.log('\n   Attempting to fetch WABA details using WABA ID:', response.data.wa_business_account_id);
      const wabaFields = [
        'name', 'message_template_namespace', 'account_review_status',
        'business_verification_status', 'country', 'ownership_type',
        'primary_funding_source', 'purchase_order_number', 'timezone_id',
        'on_behalf_of_business_info', 'disable_event_logging_for_account_messages'
      ].join(',');
      const wabaUrl = `https://graph.facebook.com/v22.0/${response.data.wa_business_account_id}?fields=${wabaFields}&access_token=${WHATSAPP_ACCESS_TOKEN}`;
      try {
        const wabaResponse = await axios.get(wabaUrl);
        console.log('   ✅ WABA details retrieved:');
        console.log('      WABA Name:', wabaResponse.data.name);
        console.log('      Template Namespace:', wabaResponse.data.message_template_namespace);
        console.log('      Account Review Status:', wabaResponse.data.account_review_status);
        console.log('      Business Verification Status (on WABA):', wabaResponse.data.business_verification_status || 'N/A');
        console.log('      Country:', wabaResponse.data.country);
        console.log('      Timezone ID:', wabaResponse.data.timezone_id);
        if (wabaResponse.data.business_verification_status !== 'verified' && wabaResponse.data.account_review_status !== 'APPROVED') {
            console.warn('      ⚠️ WARNING: WABA Business Verification or Account Review may not be complete/approved. This is critical for production sending.');
        }
      } catch (wabaError) {
        console.log('   ❌ Could not fetch WABA details.');
        logDetailedError(wabaError);
      }
    } else {
      console.log('   ⚠️ WABA ID not found on Phone Number node. Cannot fetch WABA details directly.');
    }

  } catch (error) {
    console.log('❌ Error fetching Phone Number ID or WABA details.');
    logDetailedError(error);
  }
  console.log('');
}

async function testListMessageTemplates() {
  console.log('📋 Test 3: List Message Templates');
  console.log('----------------------------------');
  if (!WHATSAPP_PHONE_NUMBER_ID) {
    console.log('⚠️ WHATSAPP_PHONE_NUMBER_ID is not set. Skipping test.');
    console.log('');
    return;
  }
  try {
    const url = `https://graph.facebook.com/v22.0/${WHATSAPP_PHONE_NUMBER_ID}/message_templates?access_token=${WHATSAPP_ACCESS_TOKEN}&fields=name,status,category,language,components`;
    const response = await axios.get(url);

    if (response.data.data && response.data.data.length > 0) {
      console.log(`✅ Found ${response.data.data.length} message template(s):`);
      response.data.data.forEach((template, index) => {
        console.log(`   ${index + 1}. Name: ${template.name}`);
        console.log(`      Status: ${template.status}`);
        console.log(`      Language: ${template.language}`);
        console.log(`      Category: ${template.category}`);
        if (template.components) {
            console.log(`      Components: ${template.components.map(c => c.type + (c.format ? ` (${c.format})` : '')).join(', ')}`);
        }
        if (template.name === TEST_TEMPLATE_NAME && template.language === TEST_TEMPLATE_LANGUAGE_CODE && template.status !== 'APPROVED') {
            console.warn(`      ⚠️ WARNING: Your TEST_TEMPLATE_NAME ('${TEST_TEMPLATE_NAME}') for language '${TEST_TEMPLATE_LANGUAGE_CODE}' is NOT APPROVED. Status: ${template.status}`);
        } else if (template.name === TEST_TEMPLATE_NAME && template.language === TEST_TEMPLATE_LANGUAGE_CODE && template.status === 'APPROVED'){
            console.log(`      👍 Your TEST_TEMPLATE_NAME ('${TEST_TEMPLATE_NAME}') is APPROVED.`);
        }
      });
      const testTemplateExists = response.data.data.some(t => t.name === TEST_TEMPLATE_NAME && t.language === TEST_TEMPLATE_LANGUAGE_CODE && t.status === 'APPROVED');
      if (!testTemplateExists) {
        console.warn(`\n   ⚠️ WARNING: The configured TEST_TEMPLATE_NAME ('${TEST_TEMPLATE_NAME}') with language '${TEST_TEMPLATE_LANGUAGE_CODE}' was not found among approved templates.`);
        console.warn(`      Please verify the name, language, and approval status in WhatsApp Manager.`);
      }
    } else {
      console.log('⚠️ No message templates found for this Phone Number ID.');
      console.log('   This is expected if you haven\'t created any or if they are not associated with this number.');
    }
  } catch (error) {
    console.log('❌ Could not list message templates.');
    logDetailedError(error);
  }
  console.log('');
}

async function testSendTextFreeform() {
  console.log('💬 Test 4: Send Freeform Text Message (Tests 24hr window / Verified Test Recipient)');
  console.log('---------------------------------------------------------------------------------');
  if (!TEST_PHONE_NUMBER) {
    console.log('⚠️ TEST_PHONE_NUMBER is not set. Skipping test.');
    console.log('');
    return;
  }
  try {
    const cleanNumber = TEST_PHONE_NUMBER.replace(/[^\d]/g, '');
    const url = `https://graph.facebook.com/v22.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      to: cleanNumber,
      type: 'text',
      text: {
        preview_url: false,
        body: `Test freeform message from diagnostic script at ${new Date().toLocaleTimeString()}. If you receive this, it means freeform messages to this number are working (either it's a verified test recipient OR you're within the 24-hour customer service window).`
      }
    };

    console.log(`   Attempting to send freeform text to: ${cleanNumber}`);
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    console.log(`   ✅ Freeform text message accepted by API.`);
    console.log(`      Message ID: ${response.data.messages[0].id}`);
    console.log(`      (Check if message is DELIVERED to ${cleanNumber})`);
  } catch (error) {
    console.log(`   ❌ Error sending freeform text message to ${TEST_PHONE_NUMBER}.`);
    logDetailedError(error);
    console.log('      This is EXPECTED if the recipient is NOT a verified test number AND has NOT messaged you in the last 24 hours.');
    if (error.response?.data?.error?.code === 131047) {
        console.log('      💡 Error 131047: Re-engagement message. User has not sent a message in the last 24 hours (and you sent a non-template). This is expected for non-test numbers outside the window.');
    }
  }
  console.log('');
}

async function testSendTemplateMessage() {
  console.log(`💌 Test 5: Send Template Message ('${TEST_TEMPLATE_NAME}')`);
  console.log('-------------------------------------------------------');
  if (!TEST_PHONE_NUMBER) {
    console.log('⚠️ TEST_PHONE_NUMBER is not set. Skipping test.');
    console.log('');
    return;
  }
  if (!TEST_TEMPLATE_NAME) {
    console.log('⚠️ TEST_TEMPLATE_NAME is not configured. Skipping template send test.');
    console.log('');
    return;
  }

  try {
    const cleanNumber = TEST_PHONE_NUMBER.replace(/[^\d]/g, '');
    const url = `https://graph.facebook.com/v22.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      to: cleanNumber,
      type: 'template',
      template: {
        name: TEST_TEMPLATE_NAME,
        language: {
          code: TEST_TEMPLATE_LANGUAGE_CODE
        }
      }
    };

    // Add components only if they are defined and not empty
    if (TEST_TEMPLATE_COMPONENTS && TEST_TEMPLATE_COMPONENTS.length > 0) {
      payload.template.components = TEST_TEMPLATE_COMPONENTS;
    }

    console.log(`   Attempting to send template '${TEST_TEMPLATE_NAME}' to: ${cleanNumber}`);
    console.log(`   Payload: ${JSON.stringify(payload, null, 2)}`);

    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`   ✅ Template message accepted by API.`);
    console.log(`      Message ID: ${response.data.messages[0].id}`);
    console.log(`      (Check if message is DELIVERED to ${cleanNumber})`);

  } catch (error) {
    console.log(`   ❌ Error sending template message '${TEST_TEMPLATE_NAME}' to ${TEST_PHONE_NUMBER}.`);
    logDetailedError(error);
     if (error.response?.data?.error?.code === 132000 || error.response?.data?.error?.code === 132001 || error.response?.data?.error?.error_subcode === 2494008) {
        console.log('      💡 This often means: Template does not exist, is not approved, language mismatch, or parameters/components mismatch with the approved template definition.');
        console.log('         Double-check template name, language, approval status, and components in WhatsApp Manager and your script configuration.');
    }
  }
  console.log('');
}


function logDetailedError(error) {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    console.error('      Error Status:', error.response.status);
    console.error('      Error Data:', JSON.stringify(error.response.data, null, 2));
    if (error.response.data.error) {
        const fbError = error.response.data.error;
        console.error(`      FB Error Code: ${fbError.code}`);
        console.error(`      FB Error Type: ${fbError.type}`);
        console.error(`      FB Error Message: ${fbError.message}`);
        if (fbError.error_subcode) console.error(`      FB Error Subcode: ${fbError.error_subcode}`);
        if (fbError.fbtrace_id) console.error(`      FB Trace ID: ${fbError.fbtrace_id} (Provide this to Meta support if needed)`);
        if (fbError.error_data) console.error(`      FB Error Data (details): ${JSON.stringify(fbError.error_data)}`);

    }
  } else if (error.request) {
    // The request was made but no response was received
    console.error('      Error Request:', error.request);
    console.error('      No response received from server.');
  } else {
    // Something happened in setting up the request that triggered an Error
    console.error('      Error Message:', error.message);
  }
}

async function showRecommendations() {
  console.log('💡 RECOMMENDATIONS & NEXT STEPS');
  console.log('=================================\n');

  console.log('GENERAL CHECKS:');
  console.log('1. 🌐 META APP DASHBOARD (developers.facebook.com/apps/YOUR_APP_ID/whatsapp/api-setup):');
  console.log('   - Verify the Sender Phone Number is connected and has a GREEN quality rating.');
  console.log('   - If testing freeform messages to numbers NOT in 24hr window: Add recipient numbers to the "Test Numbers" list and verify them.');
  console.log('2. 🏢 META BUSINESS MANAGER (business.facebook.com):');
  console.log('   - Ensure "Business Verification" is COMPLETE and VERIFIED (Security Center or Business Info).');
  console.log('3. 💬 WHATSAPP MANAGER (Accessible from App Dashboard or Business Manager):');
  console.log('   - Check WABA Status: Account Review Status (should be APPROVED), Business Verification Status.');
  console.log('   - Check Phone Number Status: Connected, Quality Rating (GREEN), no flags.');
  console.log('   - Message Templates: Verify names, languages, and statuses (must be APPROVED). Ensure components (variables, buttons) in your code MATCH the approved template EXACTLY.');
  console.log('   - Account Mode: Should be "LIVE" or production equivalent for sending to any number (after business verification). If in "Sandbox" or "Development", restrictions apply.');

  console.log('\nIF MESSAGES ARE ACCEPTED BY API (you get a Message ID) BUT NOT DELIVERED:');
  console.log('   - For FREEFORM TEXT: Recipient must be a verified test number OR have messaged you in the last 24 hours.');
  console.log('   - For TEMPLATE MESSAGES:');
  console.log('     - Template name, language, and components must EXACTLY match an APPROVED template.');
  console.log('     - WABA must be fully approved and live (Business Verification + Account Review).');
  console.log('     - Recipient number must be a valid WhatsApp number and not have blocked you.');
  console.log('     - Check for any restrictions or quality issues on your Sender Phone Number or WABA in WhatsApp Manager.');
  console.log('     - Review WhatsApp Commerce and Business policies for compliance.');

  console.log('\nIF SCRIPT SHOWS ERRORS for fetching WABA/Template details:');
  console.log('   - Verify `WHATSAPP_ACCESS_TOKEN` has `whatsapp_business_messaging` AND `whatsapp_business_management` permissions.');
  console.log('   - Ensure `WHATSAPP_PHONE_NUMBER_ID` is correct.');

  console.log('\nTROUBLESHOOTING SPECIFIC ERRORS:');
  console.log('   - Error 131047 (Re-engagement): You sent a freeform message outside the 24hr window to a non-test number. Use a template.');
  console.log('   - Error 132000/132001/subcode 2494008 (Template issues): Template name/language/components mismatch, or template not approved. Check WhatsApp Manager carefully.');
  console.log('   - Error 131026 (Recipient not on WhatsApp): The number is not a valid WhatsApp account.');
  console.log('   - (#100) errors for field access: Often permission issues or the specific API structure for your WABA type. The detailed WABA check in Test 2 tries to mitigate this.');

  console.log('\nContact Meta Support via your Business Manager if issues persist after thorough checks.');
}

// Main execution
async function main() {
  if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN || !TEST_PHONE_NUMBER) {
    console.error("❌ CRITICAL ERROR: WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN, or TEST_PHONE_NUMBER is not set at the top of the script. Please configure them.");
    return;
  }
  if (!TEST_TEMPLATE_NAME) {
    console.warn("⚠️ WARNING: TEST_TEMPLATE_NAME is not set. Template sending test will be skipped or may fail if it defaults to an invalid name.");
  }


  await diagnosticTests();
  await showRecommendations();

  console.log('\n✨ Diagnostic complete!');
  console.log('Review the output above carefully. Pay attention to ✅ (successes), ⚠️ (warnings), and ❌ (errors).');
}

// Run the diagnostic
main().catch(error => {
    console.error("\n💥 UNHANDLED ERROR IN MAIN EXECUTION:");
    logDetailedError(error);
});
