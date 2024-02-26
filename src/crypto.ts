import { webcrypto } from "crypto";
import * as process from "process";

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
        modulusLength: 4096,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"],
  );

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
  let result = base64ToArrayBuffer(strKey);
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
      ["encrypt"]
  );
}

// Encrypt a message using an RSA public key
export async function rsaEncrypt( b64Data: string, strPublicKey: string ): Promise<string> {
  let publicKey = await importPrvKey(strPublicKey);
  let messageArrayBuffer = base64ToArrayBuffer(b64Data);

  let encryptedArrayBuffer = await webcrypto.subtle.encrypt(
      {
        name: "RSA-OAEP"
      },
      publicKey,
      messageArrayBuffer
  );

  let encryptedBase64 = arrayBufferToBase64(encryptedArrayBuffer);

  return encryptedBase64;
}

// Decrypts a message using an RSA private key
export async function rsaDecrypt( data: string, privateKey: webcrypto.CryptoKey): Promise<string> {
    let dataArrayBuffer = base64ToArrayBuffer(data);

    let decryptedArrayBuffer = await webcrypto.subtle.decrypt(
        {
            name: "RSA-OAEP"
        },
        privateKey,
        dataArrayBuffer
    );

    let decryptedBase64 = arrayBufferToBase64(decryptedArrayBuffer);

    return decryptedBase64;
}

// ######################
// ### Symmetric keys ###
// ######################

// Generates a random symmetric key
export async function createRandomSymmetricKey(): Promise<webcrypto.CryptoKey> {
  // TODO implement this function using the crypto package to generate a symmetric key.
  //      the key should be used for both encryption and decryption. Make sure the
  //      keys are extractable.

  // remove this
  return {} as any;
}

// Export a crypto symmetric key to a base64 string format
export async function exportSymKey(key: webcrypto.CryptoKey): Promise<string> {
  // TODO implement this function to return a base64 string version of a symmetric key

  // remove this
  return "";
}

// Import a base64 string format to its crypto native format
export async function importSymKey(
  strKey: string
): Promise<webcrypto.CryptoKey> {
  // TODO implement this function to go back from the result of the exportSymKey function to it's native crypto key object

  // remove this
  return {} as any;
}

// Encrypt a message using a symmetric key
export async function symEncrypt(
  key: webcrypto.CryptoKey,
  data: string
): Promise<string> {
  // TODO implement this function to encrypt a base64 encoded message with a public key
  // tip: encode the data to a uin8array with TextEncoder

  return "";
}

// Decrypt a message using a symmetric key
export async function symDecrypt(
  strKey: string,
  encryptedData: string
): Promise<string> {
  // TODO implement this function to decrypt a base64 encoded message with a private key
  // tip: use the provided base64ToArrayBuffer function and use TextDecode to go back to a string format

  return "";
}
