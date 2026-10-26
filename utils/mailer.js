const { Resend } = require('resend');

// starting up resend with my API key

const resend = new Resend(process.env.RESEND_API_KEY);

// creating a function to send emails and also catch unsucessful runs

const sendEmail = async ({ to, subject, text}) => {
    const {data, error} = await resend.emails.send({
        from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
        to,
        subject,
        text
    });

    if(error) {
        throw new Error (`Resend error: ${error.message}`);
    };

    return data;
};

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

module.exports = {
    sendEmail,
    sendVerificationEmail
};
