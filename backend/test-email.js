const nodemailer = require('nodemailer');
require('dotenv').config();

// Test email configuration
const testEmailConfig = async () => {
  console.log('Testing email configuration...');
  console.log('EMAIL_HOST:', process.env.EMAIL_HOST);
  console.log('EMAIL_PORT:', process.env.EMAIL_PORT);
  console.log('EMAIL_USER:', process.env.EMAIL_USER);
  console.log('EMAIL_FROM:', process.env.EMAIL_FROM);
  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    console.log('Verifying transporter...');

    // Verify connection configuration
    await transporter.verify();
    console.log('✅ Email transporter verified successfully!');

    // Send a test email
    console.log('Sending test email...');
    const testEmail = {
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_USER, // Send to self for testing
      subject: '🧪 Test Email from Gaith Tours',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">✅ Test Email Successful!</h2>
          <p>This is a test email to verify the email configuration is working properly.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p>If you received this email, your email service is configured correctly!</p>
        </div>
      `
    };

    const info = await transporter.sendMail(testEmail);
    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));

  } catch (error) {
    console.error('❌ Email test failed:');
    console.error('Error details:', error);

    if (error.code === 'EAUTH') {
      console.log('\n📋 Suggestions for EAUTH error:');
      console.log('1. Check if 2-factor authentication is enabled on Gmail');
      console.log('2. Use an App Password instead of regular password');
      console.log('3. Verify the email and password are correct');
    } else if (error.code === 'ECONNECTION') {
      console.log('\n📋 Suggestions for ECONNECTION error:');
      console.log('1. Check your internet connection');
      console.log('2. Verify SMTP settings (host, port)');
      console.log('3. Check if firewall is blocking the connection');
    }
  }
};

testEmailConfig();
