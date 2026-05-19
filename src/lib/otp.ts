import otpGenerator from 'otp-generator';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER,
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export const generateOTP = () => {
  return otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    specialChars: false,
    lowerCaseAlphabets: false,
    digits: true,
  });
};

export const sendOTPEmail = async (email: string, otp: string) => {
  const mailOptions = {
    from: `"ScanFlow Auth" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your ScanFlow Verification Code',
    text: `Your OTP is: ${otp}. It will expire in 10 minutes.`,
    html: `<b>Your OTP is: ${otp}</b><p>It will expire in 10 minutes.</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
};
