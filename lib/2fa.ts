import { generateSecret, generateURI, verify } from 'otplib';

export const generateTwoFactorSecret = (email: string) => {
  const secret = generateSecret();
  const serviceName = 'CrabS3';
  const uri = generateURI({
    secret,
    issuer: serviceName,
    label: email,
  });

  return { secret, uri };
}

export const verifyTwoFactorToken = async (token: string, secret: string) => {
  try {
    const result = await verify({ token, secret });
    return result.valid;
  } catch (error) {
    console.error('Error verifying 2FA token:', error);
    return false;
  }
}
