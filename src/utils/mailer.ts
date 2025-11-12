import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.ethereal.email',
  port: 587,
  // secure: false,
  auth: {
    user: 'viviane.littel@ethereal.email',
    pass: 'mB8X3TbbD1MVUkrzwp',
  },
  // tls: {
  //   rejectUnauthorized: false, // <-- Allow self-signed or invalid certs (only for dev)
  // },
});

export const sendOTPEmail = async (to: string, otp: string) => {
  const html = `
    <div style="font-family: Arial, sans-serif; font-size:14px; color:#111;">
      <p>Hi,</p>
      <p>Your password reset code is:</p>
      <p style="font-size:20px; font-weight:700; letter-spacing:4px;">${otp}</p>
      <p>This code will expire in ${process.env.OTP_EXPIRES_MIN || 10} minutes.</p>
      <p>If you did not request this, please ignore.</p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.FROM_EMAIL,
    to,
    subject: 'Password reset code',
    html,
  });
};

export const inviteMemberEmail = async (to: string, subject: string, html: any) => {
  await transporter.sendMail({
    from: process.env.FROM_EMAIL,
    to,
    subject,
    html,
  });
};
