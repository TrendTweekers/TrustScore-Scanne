import nodemailer from 'nodemailer';

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
        }
        return nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });
    }
};

export const sendScoreDropAlert = async (shopEmail, shopUrl, oldScore, newScore) => {
    try {
        const transporter = await createTransporter();
        const drop = oldScore - newScore;
        
        const info = await transporter.sendMail({
            from: '"TrustScore Scanner" <alerts@trustscore.app>',
            to: shopEmail,
            subject: `⚠️ Alert: Trust Score Dropped for ${shopUrl}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>Trust Score Alert</h2>
                    <p>Your store's trust score has dropped by <strong>${drop} points</strong>.</p>
                    <ul>
                        <li>Previous Score: ${oldScore}</li>
                        <li>Current Score: ${newScore}</li>
                    </ul>
                    <p>Please log in to your dashboard to view the issues and fix them immediately to avoid losing sales.</p>
                    <a href="https://admin.shopify.com/store/${shopUrl.replace('.myshopify.com', '')}/apps/trustscore-scanner" style="background: #D82C0D; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Dashboard</a>
                </div>
            `,
        });

        console.log('Message sent: %s', info.messageId);
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
        return info;
    } catch (error) {
        console.error('Failed to send email:', error);
    }
};
