/**
 * Simulated TenSEAL encryption flow for MedGemma Chat.
 * In a real-world scenario, this would use a WASM-based TenSEAL build.
 */

/**
 * Encrypts cleartext into a Base64 serialized ciphertext.
 * @param {string} text - Cleartext to encrypt.
 * @returns {Promise<string>} - Base64 encoded ciphertext.
 */
export const encrypt = async (text) => {
    // Simulate heavy computation
    await new Promise((resolve) => setTimeout(resolve, 150));

    // We use a prefix to identify our "encrypted" payload for simulation
    const prefix = "ts_enc_id_v1:";
    const buffer = new TextEncoder().encode(prefix + text);
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

    return base64;
};

/**
 * Generates a session-specific encryption token.
 * @returns {string} - Random token string.
 */
export const generateToken = () => {
    return "tk_" + Math.random().toString(36).slice(2, 10);
};

/**
 * Simulates a "Cryptic Embed" by overlapping cipher with a token.
 * @param {string} cipher - The Base64 encrypted text.
 * @param {string} token - The encryption token.
 * @returns {Object} - The embedded cryptic payload.
 */
export const crypticEmbed = async (cipher, token) => {
    await new Promise((resolve) => setTimeout(resolve, 80));

    // We represent the "embedding" as a combined structure 
    // that backend would parse as high-dimensional data
    return {
        token,
        payload: `embed_v2(${cipher})`,
        timestamp: Date.now(),
        digest: "sha256:medgemma_" + token.slice(-4)
    };
};

/**
 * Decrypts a Base64 serialized ciphertext into cleartext.
 */
export const decrypt = async (base64) => {
    // Simulate heavy computation
    await new Promise((resolve) => setTimeout(resolve, 100));

    try {
        // If it's the new complex payload, extract the cipher first
        let cipherString = base64;
        if (typeof base64 === 'object' && base64.payload) {
            cipherString = base64.payload.replace("embed_v2(", "").replace(")", "");
        }

        const decoded = atob(cipherString);
        const prefix = "ts_enc_id_v1:";

        if (decoded.startsWith(prefix)) {
            return decoded.slice(prefix.length);
        }

        return decoded;
    } catch (e) {
        console.error("Decryption failed", e);
        return "[DECRYPTION_ERROR]";
    }
};
