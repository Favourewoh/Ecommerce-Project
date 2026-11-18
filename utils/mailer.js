const nodemailer = require("nodemailer");

// Create a transporter using SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, 
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// creating a function to send emails and also catch unsucessful runs
const sendEmail = async ({ to, subject, text }) => {
  await transporter.sendMail({ 
    from: process.env.EMAIL_FROM, 
    to, 
    subject, 
    text 
    });
};


// creating a function to send emails and also catch unsucessful runs

// now to build the verification link and trigger sendEmail
const sendVerificationEmail = async(email, rawToken) => {
    const verificationUrl = `${process.env.APP_URL}/api/v1/auth/verify-email?token=${rawToken}`;
    const subject = "Verify your email address";
    const text = `Please verify your account by clicking the following link: ${verificationUrl}`;



    return await sendEmail({
        to: email,
        subject,
        text
    });
};

// Password reset mail
const sendPasswordResetEmail = async(email, rawToken) => {
    const resetUrl = `${process.env.APP_URL}/reset-password?token=${rawToken}`;
    const subject = "Reset your password";
    const text = `Please verify your account by clicking the following link: ${resetUrl}`;



    return await sendEmail({
        to: email,
        subject,
        text
    });
};

module.exports = {
    sendEmail,
    sendVerificationEmail,
    sendPasswordResetEmail
};
