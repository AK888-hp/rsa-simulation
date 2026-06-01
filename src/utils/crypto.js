import forge from 'node-forge';

// --- HYBRID AES + RSA (PREVIOUS IMPLEMENTATION - KEPT FOR REFERENCE) ---
export const generateRSAKeys = () => {
  return new Promise((resolve, reject) => {
    forge.pki.rsa.generateKeyPair({ bits: 1024, workers: 2 }, (err, keypair) => {
      if (err) return reject(err);
      const publicKeyPem = forge.pki.publicKeyToPem(keypair.publicKey);
      const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey);
      resolve({ publicKeyPem, privateKeyPem });
    });
  });
};

export const generateAESKey = () => {
  const key = forge.random.getBytesSync(32); // 256 bits
  const iv = forge.random.getBytesSync(16);  // 128 bits
  return { key: forge.util.bytesToHex(key), iv: forge.util.bytesToHex(iv) };
};

export const encryptAES = (text, hexKey, hexIv) => {
  const key = forge.util.hexToBytes(hexKey);
  const iv = forge.util.hexToBytes(hexIv);
  const cipher = forge.cipher.createCipher('AES-CBC', key);
  cipher.start({ iv: iv });
  cipher.update(forge.util.createBuffer(text, 'utf8'));
  cipher.finish();
  return cipher.output.toHex();
};

export const decryptAES = (encryptedHex, hexKey, hexIv) => {
  try {
    const key = forge.util.hexToBytes(hexKey);
    const iv = forge.util.hexToBytes(hexIv);
    const decipher = forge.cipher.createDecipher('AES-CBC', key);
    decipher.start({ iv: iv });
    decipher.update(forge.util.createBuffer(forge.util.hexToBytes(encryptedHex)));
    if (decipher.finish()) return decipher.output.toString('utf8');
    return "Decryption Failed";
  } catch (err) {
    return "Decryption Error";
  }
};

export const encryptRSA = (data, publicKeyPem) => {
  try {
    const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
    const encrypted = publicKey.encrypt(data, 'RSA-OAEP', { md: forge.md.sha256.create() });
    return forge.util.bytesToHex(encrypted);
  } catch (err) {
    return null;
  }
};

export const decryptRSA = (encryptedHex, privateKeyPem) => {
  try {
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
    const encryptedBytes = forge.util.hexToBytes(encryptedHex);
    return privateKey.decrypt(encryptedBytes, 'RSA-OAEP', { md: forge.md.sha256.create() });
  } catch (err) {
    return null;
  }
};

// --- NEW MATH-FOCUSED BIGINT PURE RSA IMPLEMENTATION ---

// Helper: Greatest Common Divisor for BigInt
const gcd = (a, b) => {
  while (b !== 0n) {
    let temp = b;
    b = a % b;
    a = temp;
  }
  return a;
};

// Helper: Modular Inverse for BigInt (Extended Euclidean Algorithm)
const modInverse = (a, m) => {
  let m0 = m;
  let y = 0n, x = 1n;
  if (m === 1n) return 0n;
  while (a > 1n) {
    let q = a / m;
    let t = m;
    m = a % m;
    a = t;
    t = y;
    y = x - q * y;
    x = t;
  }
  if (x < 0n) x += m0;
  return x;
};

// Helper: Modular Exponentiation (base^exp % mod)
export const modPow = (base, exp, mod) => {
  let res = 1n;
  base = base % mod;
  while (exp > 0n) {
    if (exp % 2n === 1n) res = (res * base) % mod;
    exp = exp / 2n;
    base = (base * base) % mod;
  }
  return res;
};

// Check if a number is prime (simple check for small educational primes)
export const isPrime = (numStr) => {
  try {
    const num = BigInt(numStr);
    if (num <= 1n) return false;
    if (num <= 3n) return true;
    if (num % 2n === 0n || num % 3n === 0n) return false;
    for (let i = 5n; i * i <= num; i += 6n) {
      if (num % i === 0n || num % (i + 2n) === 0n) return false;
    }
    return true;
  } catch (e) {
    return false;
  }
};

// Generate Keys directly from user-provided p and q
export const generateCustomRSAKeys = (pStr, qStr) => {
  const p = BigInt(pStr);
  const q = BigInt(qStr);
  
  if (p === q) throw new Error("p and q must be distinct primes.");
  
  const n = p * q;
  if (n <= 255n) {
      throw new Error("p * q must be > 255 to safely encrypt byte data.");
  }
  
  const phi = (p - 1n) * (q - 1n);
  
  // Find e (public exponent)
  let e = 3n; // Start with 3, though 65537 is common in real world
  while (e < phi) {
      if (gcd(e, phi) === 1n) break;
      e += 2n;
  }
  
  // Find d (private exponent)
  const d = modInverse(e, phi);
  
  return { 
    n: n.toString(), 
    phi: phi.toString(), 
    e: e.toString(), 
    d: d.toString() 
  };
};

// Encrypt string using custom RSA (byte by byte)
export const encryptCustomRSA = (text, eStr, nStr) => {
  const e = BigInt(eStr);
  const n = BigInt(nStr);
  
  // Convert text to UTF-8 bytes to handle normal files
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  
  const encryptedArray = [];
  for (let i = 0; i < bytes.length; i++) {
    const m = BigInt(bytes[i]);
    // C = M^e mod n
    const c = modPow(m, e, n);
    encryptedArray.push(c.toString());
  }
  
  // Return comma separated string of encrypted numbers
  return encryptedArray.join(',');
};

// Decrypt using custom RSA (byte by byte)
export const decryptCustomRSA = (encryptedData, dStr, nStr) => {
  const d = BigInt(dStr);
  const n = BigInt(nStr);
  
  const encryptedArray = encryptedData.split(',').filter(x => x.trim() !== '');
  const decryptedBytes = new Uint8Array(encryptedArray.length);
  
  for (let i = 0; i < encryptedArray.length; i++) {
    const c = BigInt(encryptedArray[i]);
    // M = C^d mod n
    const m = modPow(c, d, n);
    decryptedBytes[i] = Number(m);
  }
  
  // Convert bytes back to string
  const decoder = new TextDecoder();
  return decoder.decode(decryptedBytes);
};
