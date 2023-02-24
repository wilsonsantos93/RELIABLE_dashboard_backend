import crypto from 'crypto';

const ALGORITHM = "aes-256-cbc";
const KEY = "vOVH6sdmpNWjRRIqCc7rdxs01lwHzfr4";
const IV = crypto.randomBytes(16);

// Encrypting text
export function encrypt(text: string) {
   let cipher = crypto.createCipheriv('aes-256-cbc', KEY, IV);
   let encrypted = cipher.update(text);
   encrypted = Buffer.concat([encrypted, cipher.final()]);
   return { iv: IV.toString('hex'), encryptedData: encrypted.toString('hex') };
}

// Decrypting text
export function decrypt(text: { iv: string, encryptedData: string }) {
   let iv = Buffer.from(text.iv, 'hex');
   let encryptedText = Buffer.from(text.encryptedData, 'hex');
   let decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
   let decrypted = decipher.update(encryptedText);
   decrypted = Buffer.concat([decrypted, decipher.final()]);

   return decrypted.toString();
}