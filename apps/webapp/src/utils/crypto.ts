import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const keyString = process.env.ENCRYPT_API;
if (!keyString) {
    throw new Error("ENCRYPT_API is not defined in environment variables.");
}
const key = Buffer.from(keyString, "hex");
if (key.length !== 32) {
    throw new Error("ENCRYPT_API must be a 64-character hex string.");
}

/**
 * Encrypts a plaintext string.
 * @param textToEncrypt The string to encrypt.
 * @returns A string containing the iv, auth tag, and encrypted text, separated by colons.
 */
export function encrypt(textToEncrypt: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(textToEncrypt, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypts a string that was encrypted with the `encrypt` function.
 * @param encryptedData The combined string (iv:authTag:encryptedText).
 * @returns The original plaintext string.
 */
export function decrypt(encryptedData: string): string {
    try {
        const parts = encryptedData.split(":");
        if (parts.length !== 3) {
            throw new Error("Invalid encrypted data format.");
        }
        const [ivHex, authTagHex, encryptedText] = parts;

        const iv = Buffer.from(ivHex, "hex");
        const authTag = Buffer.from(authTagHex, "hex");

        const decipher = createDecipheriv(ALGORITHM, key, iv);

        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedText, "hex", "utf8");
        decrypted += decipher.final("utf8");

        return decrypted;
    } catch (error) {
        console.error("Decryption failed:", error);
        throw new Error("Failed to decrypt data. It may be corrupted or invalid.");
    }
}