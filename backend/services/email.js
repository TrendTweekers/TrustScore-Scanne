const nodemailer = require('nodemailer');

// Create a test account if no real credentials are provided
let testAccount = null;

const createTransporter = async () => {
    if (process.env.EMAIL_HOST) {
        return nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            secure: process.env.EMAIL_SECURE === 'true',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });
    } else {
        if (!testAccount) {
            testAccount = await nodemailer.createTestAccount();
            console.log('Created Ethereal Test Account:', testAccount.user);
            console.log('Preview URL will be logged for sent emails.');
        }
        return nodemailer.createTransport({
            host: testAccount.smtp.host,
            port: testAccount.smtp.port,
            secure: testAccount.smtp.secure,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });
    }
};

const sendScoreDropAlert = async (email, shop, oldScore, newScore) => {
    try {
        const transporter = await createTransporter();
        const info = await transporter.sendMail({
            from: '"TrustScore Scanner" <alerts@trustscore.app>',
            to: email || `merchant@${shop}`, // Use provided email or fallback
            subject: `🚨 Trust Score Alert: Score Dropped for ${shop}`,
            text: `Your Trust Score dropped from ${oldScore} to ${newScore}. Login to see details.`,
            html: `<b>Your Trust Score dropped from ${oldScore} to ${newScore}.</b><br>Login to the app to see details and fix issues.`,
        });

        console.log("Message sent: %s", info.messageId);
        if (testAccount) {
             console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
        }
    } catch (e) {
        console.error("Failed to send email alert:", e);
    }
};

module.exports = { sendScoreDropAlert };
