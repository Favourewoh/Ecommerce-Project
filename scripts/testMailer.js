require('dotenv').config();
const { sendVerificationEmail } = require('../utils/mailer');

async function testEmail() {
    try {
        console.log('Attempting to send test verification email...');
        
        // Replace 'your-email@example.com' with your actual personal/signup email address to test
        const targetEmail = 'favourewoh99@gmail.com'; 
        const fakeToken = 'abc123mocktokenvalidationstring';

        const result = await sendVerificationEmail(targetEmail, fakeToken);
        
        console.log('Email sent successfully!');
        console.log('Resend Response Data:', result);
    } catch (error) {
        console.error('Failed to send email:', error.message);
    }
}

testEmail();