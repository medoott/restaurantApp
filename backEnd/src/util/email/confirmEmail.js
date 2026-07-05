import nodemailer from "nodemailer";

let transporter;

const getTransporter = () => {
  if (transporter) return transporter;

  const smtpHost = process.env.SMTP_HOST || process.env.EMAIL_HOST;
  if (smtpHost) {
    const smtpPort = Number.parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || "587", 10) || 587;
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: process.env.SMTP_USER || process.env.EMAIL_USER
        ? {
            user: process.env.SMTP_USER || process.env.EMAIL_USER,
            pass: process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD,
          }
        : undefined,
    });
    return transporter;
  }

  const emailUser = process.env.EMAIL_USER || process.env.EMAIL_FROM;
  const emailPass = process.env.EMAIL_PASSWORD;
  if (!emailUser || !emailPass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  return transporter;
};

export const sendEmail = async ({
  appName = process.env.APP_NAME || "Brúne Coffee & Kitchen",
  to = "",
  cc = "",
  bcc = "",
  text = "",
  attachments = [],
  subject = "",
  html = "",
} = {}) => {
  const mailer = getTransporter();
  if (!mailer) return null;

  const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || "noreply@brune.coffee";

  return mailer.sendMail({
    from: `${appName} <${fromEmail}>`,
    to,
    cc,
    bcc,
    subject,
    html,
    text,
    attachments,
  });
};
