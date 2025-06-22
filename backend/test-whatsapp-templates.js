const axios = require('axios');

// WhatsApp Cloud API credentials
const PHONE_NUMBER_ID = '703983149463496';
const ACCESS_TOKEN = 'EAAPnCPzlYAoBO3bTa19y1UkBVIG5iTrlgxYra87nQCNZBIi6u4ydKKidwIJx4ndH1ZBr2VWXSYMbtWSmiI453PUNLlLgvlANeGFcVs4dqK9DtZAIpdNFZB079ob2sv898GZBfNQuxdbRAHkDvdk1YAdPU37iY4Dsv2naNBjj8VkvvudEi2Mgy5FM1rVAjGmcFZCgZDZD';
const TO_PHONE_NUMBER = '201211477551';
const WABA_ID = '1784607309138809'; // <-- PASTE YOUR WABA_ID HERE

const WHATSAPP_API_URL = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;

// Test data for templates
const testData = {
    bookingApproval: {
        customer_name: 'أحمد محمد',
        hotel_name: 'فندق الريتز كارلتون الرياض',
        check_in_date: '25/12/2024',
        check_out_date: '28/12/2024',
        duration: '3',
        guest_count: '2',
        invoice_id: 'INV-2024-001234',
        amount: '1500'
    },
    paymentReminder: {
        customer_name: 'أحمد محمد',
        invoice_id: 'INV-2024-001234',
        amount: '1500',
        hotel_name: 'فندق الريتز كارلتون الرياض'
    },
    bookingConfirmation: {
        customer_name: 'أحمد محمد',
        hotel_name: 'فندق الريتز كارلتون الرياض',
        check_in_date: '25/12/2024',
        check_out_date: '28/12/2024',
        duration: '3',
        guest_count: '2',
        children_info: ' و طفل واحد',
        amount: '1500',
        payment_id: 'PAY-2024-567890'
    },
    bookingDenial: {
        customer_name: 'أحمد محمد',
        hotel_name: 'فندق الريتز كارلتون الرياض',
        check_in_date: '25/12/2024',
        check_out_date: '28/12/2024',
        denial_reason: 'عذراً، الفندق مكتمل الحجوزات في التواريخ المطلوبة'
    }
};

// Function to send WhatsApp template message
async function sendTemplateMessage(templateName, templateData) {
    try {
        // Validate template name
        if (!templateName || templateName.trim() === '') {
            throw new Error('Template name is required');
        }        const parameters = Object.keys(templateData).map(key => ({
            type: "text",
            parameter_name: key,
            text: templateData[key]
        }));

        const payload = {
            messaging_product: "whatsapp",
            to: TO_PHONE_NUMBER,
            type: "template",
            template: {
                name: templateName.trim(),
                language: {
                    code: "ar"
                },
                components: [
                    {
                        type: "body",
                        parameters: parameters
                    }
                ]
            }
        };

        console.log(`\n🚀 Sending template: ${templateName}`);
        console.log('📤 Payload:', JSON.stringify(payload, null, 2));

        const response = await axios.post(WHATSAPP_API_URL, payload, {
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Success! Message sent:', response.data);
        return response.data;

    } catch (error) {
        console.error(`❌ Error sending ${templateName}:`, error.response?.data || error.message);
        if (error.response?.data?.error?.error_data?.details) {
            console.error('📋 Error details:', error.response.data.error.error_data.details);
        }
        throw error;
    }
}

// Function to check available templates
async function checkAvailableTemplates() {
    try {
        console.log('🔍 Checking available templates...');

        const response = await axios.get(
            `https://graph.facebook.com/v18.0/${WABA_ID}/message_templates`,
            {
                headers: {
                    'Authorization': `Bearer ${ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                params: {
                    fields: 'name,status,language' // Request specific fields
                }
            }
        );

        console.log('📋 Available templates:');
        if (response.data.data && response.data.data.length > 0) {
            response.data.data.forEach(template => {
                console.log(`  • ${template.name} (Status: ${template.status}) - Language: ${template.language}`);
            });
        } else {
            console.log('  ❌ No templates found');
        }

        return response.data;

    } catch (error) {
        console.error('❌ Error checking templates:', error.response?.data || error.message);
        return null;
    }
}

// Function to send a simple text message (for testing connectivity)
async function sendSimpleTextMessage(message) {
    try {
        const payload = {
            messaging_product: "whatsapp",
            to: TO_PHONE_NUMBER,
            type: "text",
            text: {
                body: message
            }
        };

        console.log('📤 Sending simple text message...');

        const response = await axios.post(WHATSAPP_API_URL, payload, {
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Text message sent successfully:', response.data);
        return response.data;

    } catch (error) {
        console.error('❌ Error sending text message:', error.response?.data || error.message);
        throw error;
    }
}

// Test all templates
async function testAllTemplates() {
    console.log('🧪 Starting WhatsApp Template Tests');
    console.log('📱 Sending to:', TO_PHONE_NUMBER);
    console.log('🆔 Phone Number ID:', PHONE_NUMBER_ID);
    console.log('=' .repeat(50));

    // First, check available templates
    await checkAvailableTemplates();
    console.log('=' .repeat(50));

    const tests = [
        { name: 'booking_approval_ar', data: testData.bookingApproval },
        { name: 'payment_reminder_ar', data: testData.paymentReminder },
        { name: 'booking_confirmation_ar', data: testData.bookingConfirmation },
        { name: 'booking_denial_ar', data: testData.bookingDenial }
    ];

    for (const test of tests) {
        try {
            await sendTemplateMessage(test.name, test.data);
            console.log(`✅ ${test.name} - SUCCESS\n`);

            // Wait 2 seconds between messages to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
            console.log(`❌ ${test.name} - FAILED\n`);
        }
    }

    console.log('🏁 Template testing completed!');
}

// Test individual template
async function testSingleTemplate(templateName) {
    const templateMap = {
        'booking_approval_ar': testData.bookingApproval,
        'payment_reminder_ar': testData.paymentReminder,
        'booking_confirmation_ar': testData.bookingConfirmation,
        'booking_denial_ar': testData.bookingDenial
    };

    if (!templateMap[templateName]) {
        console.error('❌ Template not found. Available templates:');
        console.log(Object.keys(templateMap));
        return;
    }

    try {
        await sendTemplateMessage(templateName, templateMap[templateName]);
        console.log(`✅ Successfully sent ${templateName}`);
    } catch (error) {
        console.log(`❌ Failed to send ${templateName}`);
    }
}

// Check if template name is provided as command line argument
const command = process.argv[2];

if (command === 'check') {
    console.log('🔍 Checking available templates...');
    checkAvailableTemplates();
} else if (command === 'test-text') {
    console.log('📱 Testing simple text message...');
    sendSimpleTextMessage('اختبار الاتصال - غيث للسياحة');
} else if (command) {
    console.log(`🎯 Testing single template: ${command}`);
    testSingleTemplate(command);
} else {
    console.log('🎯 Testing all templates...');
    console.log('\n💡 Usage options:');
    console.log('  node test-whatsapp-templates.js                    - Test all templates');
    console.log('  node test-whatsapp-templates.js [template_name]    - Test a single template');
    console.log('  node test-whatsapp-templates.js check              - Check available templates on Meta');
    console.log('  node test-whatsapp-templates.js test-text          - Send a simple text message to test credentials');
    console.log('\n');
    testAllTemplates();
}

// Export functions for use in other files
module.exports = {
    sendTemplateMessage,
    testAllTemplates,
    testSingleTemplate,
    testData,
    checkAvailableTemplates,
    sendSimpleTextMessage
};
