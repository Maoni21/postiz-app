import { sign, verify } from 'jsonwebtoken';
import { hashSync, compareSync } from 'bcrypt';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

export class AuthService {
  static hashPassword(password: string) {
    return hashSync(password, 10);
  }
  static comparePassword(password: string, hash: string) {
    return compareSync(password, hash);
  }
  static signJWT(value: object) {
    return sign(value, process.env.JWT_SECRET!);
  }
  static verifyJWT(token: string) {
    return verify(token, process.env.JWT_SECRET!);
  }

  static fixedEncryption(value: string) {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(process.env.JWT_SECRET!, 'salt', 32);
    const iv = Buffer.alloc(16, 0);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return encrypted;
  }

  static fixedDecryption(hash: string) {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(process.env.JWT_SECRET!, 'salt', 32);
    const iv = Buffer.alloc(16, 0);

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(hash, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}