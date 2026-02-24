const nodemailer = require("nodemailer");

const createTransporter = () => {
    if (!process.env.SMTP_HOST || !process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
        return null;
    }

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true", // true for 465, false for 587
        auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD
        }
    });
};

const sendMail = async (to, subject, text) => {
    const transporter = createTransporter();

    if (!transporter) {
        console.log("=== EMAIL (SMTP not configured, printing to console) ===");
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Body: ${text}`);
        console.log("=========================================================");
        return;
    }

    try {
        await transporter.sendMail({
            from: process.env.SMTP_EMAIL,
            to,
            subject,
            text
        });
        console.log(`Email sent to ${to}`);
    } catch (error) {
        console.log("Email send failed:", error.message);
    }
};

// send confirmation email with QR attached
const sendRegistrationEmail = async (to, participantName, eventName, organizerName, eventStart, qrDataUrl, eventType) => {
    const transporter = createTransporter();

    // Strip the data:image/png;base64, prefix to get raw base64
    const base64Data = qrDataUrl.split(",")[1];

    const html = `
<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
  <div style="background:#2563eb;padding:24px 32px">
    <h1 style="color:white;margin:0;font-size:22px">Registration Confirmed! ✅</h1>
  </div>
  <div style="padding:28px 32px">
    <p style="margin:0 0 8px;font-size:15px">Hi <strong>${participantName}</strong>,</p>
    <p style="margin:0 0 20px;color:#475569">You have successfully registered for <strong>${eventName}</strong> by <strong>${organizerName}</strong>.</p>
    ${
        eventType === "normal"
            ? `<p style="margin:0 0 20px;color:#475569">Event starts: <strong>${eventStart}</strong></p>
               <p style="margin:0 0 12px;color:#374151;font-weight:600">Your attendance QR code:</p>
               <p style="margin:0 0 8px;font-size:13px;color:#64748b">Show this at the venue to mark your attendance.</p>
               <div style="text-align:center;margin:20px 0">
                 <img src="cid:qrcode" alt="Attendance QR" style="width:200px;height:200px;border:4px solid #e2e8f0;border-radius:8px" />
               </div>`
            : `<p style="margin:0 0 12px;color:#374151;font-weight:600">Your order QR code:</p>
               <p style="margin:0 0 8px;font-size:13px;color:#64748b">Present this when collecting your merchandise.</p>
               <div style="text-align:center;margin:20px 0">
                 <img src="cid:qrcode" alt="Order QR" style="width:200px;height:200px;border:4px solid #e2e8f0;border-radius:8px" />
               </div>`
    }
    <p style="margin:24px 0 0;font-size:13px;color:#94a3b8">This QR code is unique to you. Do not share it.</p>
  </div>
</div>`;

    if (!transporter) {
        console.log("=== REGISTRATION EMAIL (SMTP not configured) ===");
        console.log(`To: ${to} | Event: ${eventName}`);
        console.log("================================================");
        return;
    }

    try {
        await transporter.sendMail({
            from: `"Event Platform" <${process.env.SMTP_EMAIL}>`,
            to,
            subject: `Registration Confirmed: ${eventName}`,
            html,
            attachments: [{
                filename: "ticket-qr.png",
                content: base64Data,
                encoding: "base64",
                cid: "qrcode"
            }]
        });
        console.log(`Registration email sent to ${to}`);
    } catch (error) {
        console.log("Registration email failed:", error.message);
    }
};

module.exports = { sendMail, sendRegistrationEmail };
