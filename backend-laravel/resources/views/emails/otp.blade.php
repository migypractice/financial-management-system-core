<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your One-Time Password (OTP)</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      color: #1e293b;
      margin: 0;
      padding: 30px 15px;
    }
    .email-container {
      max-width: 520px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .header {
      background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
      padding: 30px 20px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 6px 0 0;
      font-size: 13px;
      color: #c7d2fe;
    }
    .content {
      padding: 32px 28px;
    }
    .greeting {
      font-size: 15px;
      margin-bottom: 16px;
      color: #334155;
    }
    .message {
      font-size: 14px;
      line-height: 1.6;
      color: #64748b;
      margin-bottom: 24px;
    }
    .otp-box {
      background: #f1f5f9;
      border: 2px dashed #cbd5e1;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      margin: 24px 0;
    }
    .otp-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #64748b;
      margin-bottom: 8px;
    }
    .otp-code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 34px;
      font-weight: 800;
      letter-spacing: 10px;
      color: #4338ca;
      display: inline-block;
    }
    .expiry {
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
      margin-top: 10px;
    }
    .footer {
      border-top: 1px solid #f1f5f9;
      padding: 20px 28px;
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.5;
      text-align: center;
      background: #fafafa;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>ARCHON NELL INCORPORATED</h1>
      <p>Financial Management System — Two-Factor Authentication</p>
    </div>

    <div class="content">
      <div class="greeting">
        Hello <strong>{{ $userName ?? 'Administrator' }}</strong>,
      </div>

      <div class="message">
        A sign-in attempt was initiated for your Financial System account. Please use the verification code below to complete your login.
      </div>

      <div class="otp-box">
        <div class="otp-label">Your Verification Code</div>
        <div class="otp-code">{{ $otpCode }}</div>
        <div class="expiry">⏱️ This code will expire in <strong>10 minutes</strong>.</div>
      </div>

      <div class="message" style="margin-bottom: 0;">
        If you did not initiate this request, please change your password immediately or contact system security.
      </div>
    </div>

    <div class="footer">
      This is an automated security notification from Archon Nell Financial Management Core.<br>
      Please do not reply directly to this email.
    </div>
  </div>
</body>
</html>
