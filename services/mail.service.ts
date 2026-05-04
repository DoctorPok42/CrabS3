import nodemailer from "nodemailer";

declare global {
  var _mailerTransport: nodemailer.Transporter | undefined;
}

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.example.com",
  port: 587,
  secure: false,
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  rateDelta: 1000,
  rateLimit: 10,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

if (process.env.NODE_ENV !== "production") {
  globalThis._mailerTransport = transporter;
}

transporter.verify().then(() => {
  console.log("SMTP ready", new Date().toISOString());
}).catch((err) => {
  console.error("SMTP connection failed:", err.message);
});

export async function sendNotificationEmail(to: string, fileId: string) {
  const from = process.env.SMTP_FROM || "<EMAIL>";
  const downloadLink = `${process.env.BASE_URL || "http://localhost:3000"}/file/${fileId}`;

  try {
    await transporter.sendMail({
      from,
      to,
      subject: "Your file has been uploaded",
      text: `Your file has been successfully uploaded. You can download it using the following link: ${downloadLink}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;">
          <div style="min-height: 30vh; display: flex; align-items: center; justify-content: center; padding: 20px; padding-bottom: 10px;">
            <div style="background: #fafafa; border-radius: 24px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1); max-width: 500px; width: 100%; overflow: hidden;">
              <!-- Header with gradient -->
              <div style="background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); padding: 40px 20px; text-align: center; color: white;">
                <div style="font-size: 48px; margin-bottom: 12px;">🦀</div>
                <h1 style="margin: 0; font-size: 28px; font-weight: 700;">Upload Successful!</h1>
                <p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Your file is ready to share</p>
              </div>

              <!-- Content -->
              <div style="padding: 40px 30px;">
                <div style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(129, 140, 248, 0.1) 100%); border-left: 4px solid #3b82f6; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
                  <p style="margin: 0; color: #1f2937; font-size: 15px; line-height: 1.6;">
                    Great! Your file has been successfully uploaded to CrabS3. Your download link is ready and waiting for you.
                  </p>
                </div>

                <!-- CTA Button -->
                <div style="margin-bottom: 30px; text-align: center;">
                  <a href="${downloadLink}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; transition: transform 0.2s; box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);">
                    Download Your File
                  </a>
                </div>

                <!-- Link fallback -->
                <div style="background: white; border-radius: 12px; padding: 16px; margin-bottom: 30px;">
                  <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Direct Link:</p>
                  <p style="margin: 0; word-break: break-all; font-size: 12px; color: #3b82f6; font-family: 'Courier New', monospace;">
                    <a href="${downloadLink}" style="color: #3b82f6; text-decoration: none;">${downloadLink}</a>
                  </p>
                </div>

                <!-- Footer info -->
                <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.6; text-align: center;">
                  Thank you for using <strong>CrabS3</strong>!
                  <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center;">
                    No cloud. No bill. Just S3 buckets full of crabs. 🦀
                  </p>
                </p>
              </div>

              <!-- Bottom accent -->
              <div style="background: linear-gradient(90deg, #3b82f6 0%, #1e40af 50%, #3b82f6 100%); height: 4px;"></div>
            </div>
          </div>
        </body>
        </html>
      `,
    });
  } catch (error) {
    console.error("Failed to send notification email:", error instanceof Error ? error.message : String(error));
  }
}

export async function sendDownloadNotificationEmail(to: string, fileId: string) {
  if (!to) {
    console.warn(`No notification email sent for file ${fileId} because no email_sender is set.`);
    return;
  }

  const from = process.env.SMTP_FROM || "<EMAIL>";
  const downloadLink = `${process.env.BASE_URL || "http://localhost:3000"}/file/${fileId}`;

  try {
    await transporter.sendMail({
      from,
      to,
      subject: "Your file has been downloaded",
      text: `Your file has been downloaded. You can view it using the following link: ${downloadLink}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;">
          <div style="min-height: 30vh; display: flex; align-items: center; justify-content: center; padding: 20px; padding-bottom: 10px;">
            <div style="background: #fafafa; border-radius: 24px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1); max-width: 500px; width: 100%; overflow: hidden;">
              <!-- Header with gradient -->
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center; color: white;">
                <div style="font-size: 48px; margin-bottom: 12px;">📥</div>
                <h1 style="margin: 0; font-size: 28px; font-weight: 700;">Download Complete!</h1>
                <p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Someone accessed your file</p>
              </div>

              <!-- Content -->
              <div style="padding: 40px 30px;">
                <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%); border-left: 4px solid #10b981; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
                  <p style="margin: 0; color: #1f2937; font-size: 15px; line-height: 1.6;">
                    Someone has successfully downloaded your file from CrabS3. Your notification preference has been honored.
                  </p>
                </div>

                <!-- CTA Button -->
                <div style="margin-bottom: 30px; text-align: center;">
                  <a href="${downloadLink}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; transition: transform 0.2s; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);">
                    View File Details
                  </a>
                </div>

                <!-- Link fallback -->
                <div style="background: white; border-radius: 12px; padding: 16px; margin-bottom: 30px;">
                  <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">File Link:</p>
                  <p style="margin: 0; word-break: break-all; font-size: 12px; color: #10b981; font-family: 'Courier New', monospace;">
                    <a href="${downloadLink}" style="color: #10b981; text-decoration: none;">${downloadLink}</a>
                  </p>
                </div>

                <!-- Footer info -->
                <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.6; text-align: center;">
                  Thanks for using <strong>CrabS3</strong>!
                  <p style="margin-top: 0; font-size: 12px; color: #6b7280; text-align: center;">
                    No cloud. No bill. Just S3 buckets full of crabs. 🦀
                  </p>
                </p>
              </div>

              <!-- Bottom accent -->
              <div style="background: linear-gradient(90deg, #10b981 0%, #059669 50%, #10b981 100%); height: 4px;"></div>
            </div>
          </div>
        </body>
        </html>
      `,
    });
  } catch (error) {
    console.error("Failed to send download notification email:", error instanceof Error ? error.message : String(error));
  }
}

export async function sendRecipientNotificationEmail(to: string, fileId: string, senderEmail?: string) {
  if (!to) {
    console.warn(`No recipient email sent for file ${fileId} because no email_recipient is set.`);
    return;
  }

  const from = process.env.SMTP_FROM || "<EMAIL>";
  const downloadLink = `${process.env.BASE_URL || "http://localhost:3000"}/file/${fileId}`;

  try {
    await transporter.sendMail({
      from,
      to,
      subject: "A file has been shared with you",
      text: `${senderEmail || "Someone"} has shared a file with you on CrabS3. You can download it using the following link: ${downloadLink}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;">
          <div style="min-height: 30vh; display: flex; align-items: center; justify-content: center; padding: 20px; padding-bottom: 10px;">
            <div style="background: #fafafa; border-radius: 24px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1); max-width: 500px; width: 100%; overflow: hidden;">
              <!-- Header with gradient -->
              <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); padding: 40px 20px; text-align: center; color: white;">
                <div style="font-size: 48px; margin-bottom: 12px;">📤</div>
                <h1 style="margin: 0; font-size: 28px; font-weight: 700;">File Shared With You!</h1>
                <p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">You have received a file on CrabS3</p>
              </div>

              <!-- Content -->
              <div style="padding: 40px 30px;">
                <div style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(109, 40, 217, 0.1) 100%); border-left: 4px solid #8b5cf6; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
                  <p style="margin: 0; color: #1f2937; font-size: 15px; line-height: 1.6;">
                    ${senderEmail ? `<strong>${senderEmail}</strong> has` : "Someone has"} shared a file with you on CrabS3. Click the button below to download it.
                  </p>
                </div>

                <!-- CTA Button -->
                <div style="margin-bottom: 30px; text-align: center;">
                  <a href="${downloadLink}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; transition: transform 0.2s; box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);">
                    Download File
                  </a>
                </div>

                <!-- Link fallback -->
                <div style="background: white; border-radius: 12px; padding: 16px; margin-bottom: 30px;">
                  <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Direct Link:</p>
                  <p style="margin: 0; word-break: break-all; font-size: 12px; color: #8b5cf6; font-family: 'Courier New', monospace;">
                    <a href="${downloadLink}" style="color: #8b5cf6; text-decoration: none;">${downloadLink}</a>
                  </p>
                </div>

                <!-- Footer info -->
                <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.6; text-align: center;">
                  Using <strong>CrabS3</strong> to share files securely.
                  <p style="margin: 8px 0 0 0; font-size: 12px; color: #6b7280; text-align: center;">
                    No cloud. No bill. Just S3 buckets full of crabs. 🦀
                  </p>
                </p>
              </div>

              <!-- Bottom accent -->
              <div style="background: linear-gradient(90deg, #8b5cf6 0%, #6d28d9 50%, #8b5cf6 100%); height: 4px;"></div>
            </div>
          </div>
        </body>
        </html>
      `,
    });
  } catch (error) {
    console.error("Failed to send recipient notification email:", error instanceof Error ? error.message : String(error));
  }
}
