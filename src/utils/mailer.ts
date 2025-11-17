import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.ethereal.email',
  port: 587,
  auth: {
    user: 'osborne.dickens83@ethereal.email',
    pass: 'tpfT1emsxBcgSxfRK2',
  },
});

// const transporter = nodemailer.createTransport({
//   host: "smtp.gmail.com",
//   port: 465,
//   secure: true,
//   auth: {
//     user: process.env.SMTP_USER,
//     pass: process.env.SMTP_PASS,
//   },
// });

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

export const removeMemberEmail = async (to: string, subject: string, html: any) => {
  await transporter.sendMail({
    from: process.env.FROM_EMAIL,
    to,
    subject,
    html,
  });
};
