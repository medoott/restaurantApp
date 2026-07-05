export const confirmEmailTemplate = ({ link } = {}) => {
  const safeLink = String(link || "#");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Confirm your email</title>
  </head>
  <body style="margin:0;background:#f8f1e8;font-family:Arial,Helvetica,sans-serif;color:#2a1b12;">
    <div style="max-width:640px;margin:0 auto;padding:40px 20px;">
      <div style="background:linear-gradient(180deg,#2a1b12 0%,#4a2e18 100%);border-radius:24px 24px 0 0;padding:28px 32px;color:#f7efe4;">
        <p style="margin:0;font-size:12px;letter-spacing:.28em;text-transform:uppercase;opacity:.8;">Brúne Coffee & Kitchen</p>
        <h1 style="margin:12px 0 0;font-size:30px;line-height:1.1;">Confirm your email address</h1>
      </div>
      <div style="background:#fff;border:1px solid #eadfce;border-top:0;border-radius:0 0 24px 24px;padding:32px;">
        <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">
          Welcome. Please confirm your email to finish creating your account.
        </p>
        <p style="margin:0 0 28px;font-size:14px;line-height:1.6;color:#6f4d2f;">
          If you did not create this account, you can ignore this email.
        </p>
        <a href="${safeLink}" style="display:inline-block;background:#2a1b12;color:#f7efe4;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:700;">
          Verify email address
        </a>
        <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#8d6d4f;">
          If the button does not work, copy and paste this link into your browser:
        </p>
        <p style="margin:8px 0 0;word-break:break-all;font-size:12px;line-height:1.5;color:#8d6d4f;">${safeLink}</p>
      </div>
    </div>
  </body>
</html>`;
};
