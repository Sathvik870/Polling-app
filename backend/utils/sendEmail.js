// server/utils/sendEmail.js
const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // 1. Create a transporter
    // We'll use Gmail as an example. For other services, configuration will differ.
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com', // Default to Gmail SMTP
        port: process.env.EMAIL_PORT || 587, // 587 for TLS, 465 for SSL
        secure: (process.env.EMAIL_PORT || 587) == 465, // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER, // Your Gmail address from .env
            pass: process.env.EMAIL_PASS  // Your Gmail App Password from .env
        },
        // For Gmail, you might need to allow "Less secure app access" if not using App Passwords,
        // or configure OAuth2. App Passwords are the recommended secure way.
        // If using other services like SendGrid, Mailgun, their SMTP details go here.
        // tls: {
        //     rejectUnauthorized: false //  Set to true in production if your cert is valid
        // }
    });

    // 2. Define the email options
    const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'Polling App'}" <${process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER}>`, // sender address
        to: options.to,          // list of receivers (string or array)
        subject: options.subject,  // Subject line
        text: options.text,        // plain text body
        html: options.html         // html body (optional, if you want to send rich text emails)
    };

    // 3. Actually send the email
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Message sent: %s', info.messageId);
        // You can return info or true if successful
        return info;
    } catch (error) {
        console.error('Error sending email: ', error);
        // throw error; // Or handle it as per your application's needs
        return null; // Or false
    }
};

module.exports = sendEmail;