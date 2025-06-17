const axios = require('axios');

console.log('🚀 WhatsApp API Test Script (Multiple Message Types)');
console.log('====================================================\n');

// Configuration
const PHONE_NUMBER_ID = '659856587219070';
const ACCESS_TOKEN = 'EAAPnCPzlYAoBO3bTa19y1UkBVIG5iTrlgxYra87nQCNZBIi6u4ydKKidwIJx4ndH1ZBr2VWXSYMbtWSmiI453PUNLlLgvlANeGFcVs4dqK9DtZAIpdNFZB079ob2sv898GZBfNQuxdbRAHkDvdk1YAdPU37iY4Dsv2naNBjj8VkvvudEi2Mgy5FM1rVAjGmcFZCgZDZD';
const TO_PHONE_NUMBER = '201211477551'; // Your phone number without +

// Different message types to test
const messageTypes = {
  template_hello: {
    type: "template",
    template: {
      name: "hello_world",
      language: {
        code: "en_US"
      }
    }
  },

  text_simple: {
    type: "text",
    text: {
      body: "🌟 Hello from Gaith Tours! This is a simple text message test."
    }
  },

  text_detailed: {
    type: "text",
    text: {
      body: "🏛️ *Welcome to Gaith Tours* 🏛️\n\n✨ Discover the magic of Egypt with us!\n\n🔹 Premium tour packages\n🔹 Expert local guides\n🔹 Unforgettable experiences\n\n📱 Contact us for your dream vacation!\n\n_Sent: " + new Date().toLocaleString() + "_"
    }
  },

  text_booking: {
    type: "text",
    text: {
      body: "🎫 *Booking Confirmation* 🎫\n\nDear Valued Customer,\n\nYour tour booking has been received!\n\n📅 Date: " + new Date().toLocaleDateString() + "\n🕐 Time: " + new Date().toLocaleTimeString() + "\n🏛️ Destination: Ancient Egypt Tour\n\n✅ We'll contact you soon with details.\n\nThank you for choosing Gaith Tours! 🌟"
    }
  }
};

// Choose which message type to send (change this to test different messages)
const MESSAGE_TYPE = 'template_hello'; // Change back to template to establish conversation first

console.log(`🧪 Testing WhatsApp API with ${MESSAGE_TYPE} message...`);
console.log(`📱 Sending to: +${TO_PHONE_NUMBER}`);
console.log(`📞 Using Phone Number ID: ${PHONE_NUMBER_ID}`);
console.log(`🔑 Access Token: ${ACCESS_TOKEN.substring(0, 20)}...\n`);

const sendMessage = async () => {
  try {
    const url = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`;

    // Get the selected message payload
    const selectedMessage = messageTypes[MESSAGE_TYPE];

    const payload = {
      messaging_product: "whatsapp",
      to: TO_PHONE_NUMBER,
      ...selectedMessage
    };

    console.log(`📤 Sending ${MESSAGE_TYPE} message...`);
    console.log(`URL: ${url}`);
    console.log(`Payload: ${JSON.stringify(payload, null, 2)}\n`);

    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });    console.log('✅ SUCCESS!');
    console.log(`Response Status: ${response.status}`);
    console.log(`Response Data: ${JSON.stringify(response.data, null, 2)}\n`);

    // Check if it's a text message
    if (selectedMessage.type === 'text') {
      console.log('⚠️  TEXT MESSAGE SENT BUT MAY NOT BE DELIVERED:');
      console.log('- Text messages require active 24-hour conversation window');
      console.log('- If you don\'t receive it, the conversation window is closed');
      console.log('- Solution: Use template_hello first to open conversation window');
    } else if (selectedMessage.type === 'template') {
      console.log('✅ TEMPLATE MESSAGE SENT - Should be delivered immediately');
      console.log('- Template messages don\'t require conversation window');
      console.log('- Now you have 24 hours to send text messages');
    }

  } catch (error) {
    console.log('❌ ERROR!');
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Error Data: ${JSON.stringify(error.response.data, null, 2)}`);

      // Specific error handling
      if (error.response.data?.error) {
        const errorInfo = error.response.data.error;
        console.log('\n🔍 Error Analysis:');
        console.log('- Error Type:', errorInfo.type);
        console.log('- Error Code:', errorInfo.code);
        console.log('- Error Message:', errorInfo.message);

        if (errorInfo.code === 131026) {
          console.log('\n💡 TEMPLATE ISSUE:');
          console.log('The hello_world template might not be available.');
          console.log('Check your WhatsApp Business Manager for approved templates.');
        } else if (errorInfo.code === 190) {
          console.log('\n💡 ACCESS TOKEN ISSUE:');
          console.log('Your access token is invalid, expired, or malformed.');
          console.log('1. Go to your Meta for Developers dashboard');
          console.log('2. Navigate to your WhatsApp app');
          console.log('3. Generate a new access token');
          console.log('4. Make sure the token has whatsapp_business_messaging permissions');
        } else if (errorInfo.code === 131047 || errorInfo.code === 131051) {
          console.log('\n💡 TEXT MESSAGE ISSUE:');
          console.log('Text messages require an active conversation window (24 hours).');
          console.log('Try using template_hello instead, or start conversation first.');
        } else if (errorInfo.code === 133010) {
          console.log('\n💡 PHONE NUMBER ISSUE:');
          console.log('Phone number not registered with WhatsApp Business API.');
        }
      }
    } else {
      console.log(`Error: ${error.message}`);
    }
  }
};

// Function to check conversation window status
const checkConversationWindow = async () => {
  try {
    console.log('🔍 Checking conversation window status...\n');

    // First send template to establish conversation
    const templatePayload = {
      messaging_product: "whatsapp",
      to: TO_PHONE_NUMBER,
      type: "template",
      template: {
        name: "hello_world",
        language: {
          code: "en_US"
        }
      }
    };

    const url = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`;

    console.log('📤 Step 1: Sending template to open conversation window...');
    const templateResponse = await axios.post(url, templatePayload, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (templateResponse.status === 200) {
      console.log('✅ Template sent successfully! Conversation window is now OPEN for 24 hours.');

      // Wait 2 seconds then send text message
      console.log('\n⏳ Waiting 2 seconds before sending text message...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('📤 Step 2: Now sending text message...');
      const textPayload = {
        messaging_product: "whatsapp",
        to: TO_PHONE_NUMBER,
        type: "text",
        text: {
          body: "🎉 *SUCCESS!* 🎉\n\nThis text message was sent AFTER the template message opened the conversation window.\n\nYou should receive BOTH messages:\n1️⃣ Hello World template\n2️⃣ This text message\n\n✨ Conversation window is now active for 24 hours!"
        }
      };

      const textResponse = await axios.post(url, textPayload, {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (textResponse.status === 200) {
        console.log('✅ Text message sent successfully!');
        console.log('📱 You should now receive BOTH messages on your phone.');
      }
    }

  } catch (error) {
    console.log('❌ Error in conversation window test:', error.response?.data || error.message);
  }
};

// New custom Gaith Tours messages that will work after template
const customMessages = {
  welcome: {
    type: "text",
    text: {
      body: "🏺 *مرحباً بك في رحلات جيث* 🏺\n\n*Welcome to Gaith Tours!*\n\n🌟 We specialize in unforgettable Egyptian experiences:\n\n🔸 Pyramid Tours & Ancient Wonders\n🔸 Nile River Cruises\n🔸 Red Sea Adventures\n🔸 Cultural Heritage Tours\n🔸 Desert Safari Expeditions\n\n📞 Contact us: +20 XXX XXX XXXX\n🌐 www.gaithtours.com\n\n✨ Your Egyptian adventure starts here!"
    }
  },

  booking_inquiry: {
    type: "text",
    text: {
      body: "📋 *Booking Inquiry - Gaith Tours*\n\nThank you for your interest!\n\n🗓️ *Available Packages:*\n\n1️⃣ Giza Pyramids Day Tour - $50\n2️⃣ Cairo & Alexandria 2-Days - $120\n3️⃣ Luxor Ancient Temples - $80\n4️⃣ Aswan & Abu Simbel - $150\n5️⃣ Red Sea Diving - $90\n\n📱 Reply with package number for details\n⏰ Book now for special discounts!\n\n🎫 Gaith Tours - Your Egyptian Journey Awaits"
    }
  },

  promotion: {
    type: "text",
    text: {
      body: "🎉 *SPECIAL OFFER - Gaith Tours* 🎉\n\n🔥 *LIMITED TIME: 25% OFF!*\n\n🏛️ *Featured Tours:*\n✅ Pyramids + Sphinx + Egyptian Museum\n✅ Professional Egyptologist Guide\n✅ Lunch + Transportation Included\n✅ Small Groups (Max 8 people)\n\n💰 *Regular Price:* $100\n🎯 *Special Price:* $75\n\n📅 *Valid until:* End of June 2025\n📞 *Book Now:* WhatsApp us back!\n\n🌟 Don't miss this incredible deal!"
    }
  }
};

// Function to send template + custom follow-up message
const sendTemplateAndFollowUp = async (customMessageType = 'welcome') => {
  try {
    const url = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`;

    // Step 1: Send template to open conversation window
    console.log('📤 Step 1: Sending template message to open conversation window...');

    const templatePayload = {
      messaging_product: "whatsapp",
      to: TO_PHONE_NUMBER,
      type: "template",
      template: {
        name: "hello_world",
        language: {
          code: "en_US"
        }
      }
    };

    const templateResponse = await axios.post(url, templatePayload, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Template sent successfully!');
    console.log(`Template Message ID: ${templateResponse.data.messages[0].id}\n`);

    // Step 2: Wait a moment, then send custom message
    console.log('⏱️ Waiting 3 seconds before sending custom message...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log(`📤 Step 2: Sending custom ${customMessageType} message...`);

    const customPayload = {
      messaging_product: "whatsapp",
      to: TO_PHONE_NUMBER,
      ...customMessages[customMessageType]
    };

    console.log(`Custom Message Payload: ${JSON.stringify(customPayload, null, 2)}\n`);

    const customResponse = await axios.post(url, customPayload, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Custom message sent successfully!');
    console.log(`Custom Message ID: ${customResponse.data.messages[0].id}\n`);

    return {
      template: templateResponse.data,
      custom: customResponse.data
    };

  } catch (error) {
    console.log('❌ ERROR in template + follow-up!');
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Error Data: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.log(`Error: ${error.message}`);
    }
    throw error;
  }
};

// Main execution
const main = async () => {
  console.log('📋 AVAILABLE CUSTOM MESSAGES:');
  console.log('- welcome: Gaith Tours welcome message with services');
  console.log('- booking_inquiry: Tour packages with pricing');
  console.log('- promotion: Special offer with discount');
  console.log('\n🎯 SOLUTION: Template + Custom Message\n');

  try {
    // Choose which custom message to send after template
    const customMessageType = 'welcome'; // Change to: 'welcome', 'booking_inquiry', or 'promotion'

    console.log(`🚀 Sending template + ${customMessageType} message...\n`);

    const results = await sendTemplateAndFollowUp(customMessageType);

    console.log('🎉 SUCCESS! Both messages sent:');
    console.log(`- Template Message ID: ${results.template.messages[0].id}`);
    console.log(`- Custom Message ID: ${results.custom.messages[0].id}`);

  } catch (error) {
    console.log('❌ Test failed. Check error details above.');
  }

  console.log('\n✨ Test complete\n');

  console.log('📋 WHY THIS WORKS:');
  console.log('1. Template message opens 24-hour conversation window');
  console.log('2. Custom text messages can then be sent within that window');
  console.log('3. You should receive both messages on your phone');
  console.log('\n💡 TO CHANGE CUSTOM MESSAGE:');
  console.log('Edit the customMessageType variable in main() function');
  console.log('Options: welcome, booking_inquiry, promotion');
};

// Run the test
main().catch(console.error);
