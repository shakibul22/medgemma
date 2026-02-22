const ENCRYPTION_API_URL = 'https://nafew-my-fastapi-model.hf.space/process';
const HF_TOKEN = import.meta.env.VITE_HF_TOKEN;

/**
 * Sends a text to the HuggingFace encryption endpoint.
 * Returns original_text, encrypted_text, decrypted_text, encryption_key_hex,
 * encrypted_embedding, and plain_embedding.
 */
export const encryptionApi = {
    async processText(text) {
        const response = await fetch(ENCRYPTION_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${HF_TOKEN}`,
            },
            body: JSON.stringify({ text }),
        });

        if (!response.ok) {
            throw new Error(`Encryption API error: ${response.status} ${response.statusText}`);
        }

        return response.json();
    },
};
