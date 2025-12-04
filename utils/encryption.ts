
// Simple XOR obfuscation to hide words from plain sight
// We use encodeURIComponent to handle Unicode (Cyrillic) characters safely before btoa

export const xorCipher = (text: string): string => {
  const key = 42; 
  // Encode to UTF-8 escaped string first to ensure all chars are < 128 (safe for btoa after XOR)
  const safeText = encodeURIComponent(text);
  
  let result = '';
  for (let i = 0; i < safeText.length; i++) {
    result += String.fromCharCode(safeText.charCodeAt(i) ^ key);
  }
  return btoa(result);
};

export const xorDecipher = (encoded: string): string => {
  const key = 42;
  try {
      const text = atob(encoded);
      let result = '';
      for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(text.charCodeAt(i) ^ key);
      }
      return decodeURIComponent(result);
  } catch (e) {
      console.error("Decryption failed", e);
      return "Error";
  }
};
