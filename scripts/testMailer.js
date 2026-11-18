require('dotenv').config();
const { sendVerificationEmail } = require('../utils/mailer');

async function testEmail() {
  try {
    console.log('Attempting to send test verification email...');

    // Use your own address. Keep this file out of git, since it holds a real email.
    const targetEmail = 'favourewoh99@gmail.com';
    const fakeToken = 'abc123mocktokenvalidationstring';

    const info = await sendVerificationEmail(targetEmail, fakeToken);

    console.log('Email sent successfully!');
    if (info) {
      console.log('Message ID:', info.messageId);
      console.log('Accepted:', info.accepted);
      console.log('Rejected:', info.rejected);
    }
  } catch (error) {
    console.error('Failed to send email:', error.message);
    process.exitCode = 1;
  }
}

testEmail();