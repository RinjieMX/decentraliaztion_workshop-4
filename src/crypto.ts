import { webcrypto } from "crypto";
import * as process from "process";
import { error } from "console";

// #############
// ### Utils ###
// #############

// Function to convert ArrayBuffer to Base64 string
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString("base64");
}

// Function to convert Base64 string to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  var buff = Buffer.from(base64, "base64");
  return buff.buffer.slice(buff.byteOffset, buff.byteOffset + buff.byteLength);
}

// ################
// ### RSA keys ###
// ################

// Generates a pair of private / public RSA keys
type GenerateRsaKeyPair = {
  publicKey: webcrypto.CryptoKey;
  privateKey: webcrypto.CryptoKey;
};
export async function generateRsaKeyPair(): Promise<GenerateRsaKeyPair> {
  const { publicKey, privateKey } = await webcrypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: { name: "SHA-256"} ,
      },
      true,
      ["encrypt", "decrypt"],
  );
  error(await exportPubKey(publicKey));
  return { publicKey, privateKey };
}

// Export a crypto public key to a base64 string format
export async function exportPubKey(key: webcrypto.CryptoKey): Promise<string> {
  let mabase = arrayBufferToBase64(await webcrypto.subtle.exportKey(
      'spki',
      key
  ));
  return mabase;
}

// Export a crypto private key to a base64 string format
export async function exportPrvKey( key: webcrypto.CryptoKey | null ): Promise<string | null> {
  if (key == null){
    return null;
  }
  let mabase = arrayBufferToBase64(await webcrypto.subtle.exportKey('pkcs8', key));
  return mabase;
}

// Import a base64 string public key to its native format
export async function importPubKey(strKey: string ): Promise<webcrypto.CryptoKey> {
  const result = base64ToArrayBuffer(strKey);
  return webcrypto.subtle.importKey(
      "spki",
      result,
      {
        name: "RSA-OAEP",
        hash: { name: "SHA-256" }
      },
      true,
      ["encrypt"]
  );
}

// Import a base64 string private key to its native format
export async function importPrvKey( strKey: string ): Promise<webcrypto.CryptoKey> {
    let result = base64ToArrayBuffer(strKey);
    return webcrypto.subtle.importKey(
        "pkcs8",
        result,
        {
            name: "RSA-OAEP",
            hash: { name: "SHA-256" }
        },
        true,
        ["decrypt"]
    );
}

// Encrypt a message using an RSA public key
export async function rsaEncrypt( b64Data: string, strPublicKey: string ): Promise<string> {
  let publicKey = await importPubKey(strPublicKey);
  let messageArrayBuffer = base64ToArrayBuffer(b64Data);

  let encryptedArrayBuffer = await webcrypto.subtle.encrypt(
      {
        name: "RSA-OAEP"
      },
      publicKey,
      messageArrayBuffer
  );
  return arrayBufferToBase64(encryptedArrayBuffer);
}

// Decrypts a message using an RSA private key
export async function rsaDecrypt( data: string, privateKey: webcrypto.CryptoKey): Promise<string> {
    let dataArrayBuffer = base64ToArrayBuffer(data);

    let decryptedArrayBuffer = await webcrypto.subtle.decrypt(
        {
            name: "RSA-OAEP",
        },
        privateKey,
        dataArrayBuffer
    );
    return arrayBufferToBase64(decryptedArrayBuffer);
}

// ######################
// ### Symmetric keys ###
// ######################

// Generates a random symmetric key
export async function createRandomSymmetricKey(): Promise<webcrypto.CryptoKey> {
    const key = await webcrypto.subtle.generateKey(
        {
            name: 'AES-CBC',
            length: 256
        },
        true,
        ['encrypt', 'decrypt']
    );
    return key;
}

// Export a crypto symmetric key to a base64 string format
export async function exportSymKey(key: webcrypto.CryptoKey): Promise<string> {
    const exportedKey = await webcrypto.subtle.exportKey("raw", key);
    return arrayBufferToBase64(exportedKey);
}

// Import a base64 string format to its crypto native format
export async function importSymKey( strKey: string ): Promise<webcrypto.CryptoKey> {
    const result = base64ToArrayBuffer(strKey);
    return webcrypto.subtle.importKey(
        "raw",
        result,
        {
            name: "AES-CBC",
            length: 256
        },
        true,
        ['encrypt', 'decrypt']
    );
}

// Encrypt a message using a symmetric key
export async function symEncrypt( key: webcrypto.CryptoKey, data: string ): Promise<string> {
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);

    const vecteur = webcrypto.getRandomValues(new Uint8Array(16));

    const encryptedData = await webcrypto.subtle.encrypt(
        {
            name: "AES-CBC",
            iv: vecteur
        },
        key,
        encodedData
    );

    const combined = new Uint8Array([...vecteur, ...new Uint8Array(encryptedData)]);
    return arrayBufferToBase64(combined.buffer);
}

// Decrypt a message using a symmetric key
export async function symDecrypt( strKey: string, encryptedData: string ): Promise<string> {
    const key = await importSymKey(strKey);

    const encryptedArrayBuffer = base64ToArrayBuffer(encryptedData);
    const vecteur = encryptedArrayBuffer.slice(0, 16);
    const data = encryptedArrayBuffer.slice(16);

    const decryptedData = await webcrypto.subtle.decrypt(
        {
            name: "AES-CBC",
            iv: vecteur
        },
        key,
        data
    );

    const decoded = new TextDecoder().decode(decryptedData);
    return decoded;
}
