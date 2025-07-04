// generate.js - Backend API Endpoint for Novaria AI

import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file

// Pastikan API_KEY ada di file .env Anda
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
    console.error("GEMINI_API_KEY is not defined in .env file.");
    // Exit process or handle gracefully if this is a serverless function
    // For Vercel, it's better to log and return an error response
}

const genAI = new GoogleGenerativeAI(API_KEY);

// Define available models and their safety settings
// Ini harus cocok dengan yang ada di frontend (script.js)
const MODELS_CONFIG = {
    'gemini-2.5-flash': {
        model: 'gemini-1.5-flash-latest', // Nama model yang sebenarnya di API Gemini
        generationConfig: {
            temperature: 0.9,
            topK: 1,
            topP: 1,
            maxOutputTokens: 2048,
        },
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
    },
    'gemini-2.0-flash': { // Asumsi ini adalah model 'smart' baru Anda
        model: 'gemini-1.5-pro-latest', // Nama model yang sebenarnya di API Gemini
        generationConfig: {
            temperature: 0.7, // Lebih fokus, kurang kreatif
            topK: 1,
            topP: 1,
            maxOutputTokens: 2048,
        },
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
    },
    'gemini-1.5-flash': { // Model 'other' Anda
        model: 'gemini-1.5-flash-latest', // Contoh, bisa diganti ke model lain jika ada
        generationConfig: {
            temperature: 0.8,
            topK: 1,
            topP: 1,
            maxOutputTokens: 2048,
        },
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
    },
    // Tambahkan model default jika selectedModel tidak ditemukan
    'default': {
        model: 'gemini-1.5-flash-latest', // Default model
        generationConfig: {
            temperature: 0.9,
            topK: 1,
            topP: 1,
            maxOutputTokens: 2048,
        },
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
    }
};


// Handler untuk Vercel Serverless Function
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { userMessage, conversationHistory, attachedFiles, selectedModel } = req.body;

        if (!userMessage && attachedFiles.length === 0) {
            return res.status(400).json({ message: 'User message or attached file is required.' });
        }

        // Tentukan model yang akan digunakan
        const modelConfig = MODELS_CONFIG[selectedModel] || MODELS_CONFIG.default;
        const model = genAI.getGenerativeModel({
            model: modelConfig.model,
            generationConfig: modelConfig.generationConfig,
            safetySettings: modelConfig.safetySettings,
        });

        // ============ Persiapan Percakapan ============
        // Pastikan format history sesuai dengan format Gemini API:
        // [
        //   { role: "user", parts: [{ text: "Hello" }] },
        //   { role: "model", parts: [{ text: "Hi there!" }] },
        // ]
        const formattedHistory = conversationHistory.map(msg => {
            return {
                role: msg.role === 'user' ? 'user' : 'model', // Gemini API expects 'user' or 'model'
                parts: [{ text: msg.content }]
            };
        });

        // ============ Persiapan Konten Input ============
        const parts = [];

        // Tambahkan attached files jika ada
        if (attachedFiles && attachedFiles.length > 0) {
            for (const file of attachedFiles) {
                // HANYA jika model mendukung multi-modal (contoh: gemini-1.5-flash-latest)
                // Pastikan Anda menggunakan model yang tepat di sini!
                // Perhatikan: Gemini 1.5 Pro atau Flash yang mendukung multi-modal
                if (modelConfig.model.includes('gemini-1.5-') || modelConfig.model.includes('gemini-2.0-')) {
                    parts.push({
                        inlineData: {
                            mimeType: file.mimeType,
                            data: file.data
                        }
                    });
                } else {
                    console.warn(`Model ${modelConfig.model} may not fully support multi-modal input. File will be ignored or might cause errors.`);
                    // Fallback: Jika model tidak multi-modal, Anda bisa deskripsikan file dalam teks
                    // parts.push({ text: `[File: ${file.mimeType}]` });
                }
            }
        }

        // Tambahkan pesan pengguna
        parts.push({ text: userMessage });


        const chat = model.startChat({
            history: formattedHistory,
            // Jika ada file atau context lain, bisa ditambahkan di sini (system instruction)
            // systemInstruction: "You are a helpful AI assistant named Novaria."
        });

        const result = await chat.sendMessage(parts);
        const responseText = result.response.text();

        // Di sini Anda bisa menambahkan logika untuk image generation jika diperlukan
        // Contoh sederhana (bukan bagian dari Gemini API langsung, biasanya butuh DALL-E/lainnya)
        let generatedImageUrl = null;
        // if (responseText.includes("[GENERATE_IMAGE]")) {
        //     // Panggil API image generation terpisah di sini
        //     // generatedImageUrl = await callImageGenerationApi(responseText);
        // }

        res.status(200).json({
            text: responseText,
            imageUrl: generatedImageUrl,
            modelUsed: selectedModel // Kirim kembali model yang digunakan
        });

    } catch (error) {
        console.error("Error in generate.js:", error);

        // Menangkap error spesifik dari Gemini API
        let errorMessage = "An unknown error occurred.";
        if (error.message.includes("blocked due to safety concerns")) {
            errorMessage = "Maaf, respons ini diblokir karena masalah keamanan konten. Coba formulasi ulang pertanyaan Anda.";
        } else if (error.message.includes("quota exceeded")) {
            errorMessage = "Maaf, kuota API telah habis. Silakan coba lagi nanti atau periksa pengaturan API Anda.";
        } else if (error.message.includes("400 Bad Request")) {
            errorMessage = "Maaf, permintaan tidak valid. Mungkin ada masalah dengan input Anda atau model yang tidak kompatibel dengan jenis input.";
        } else {
            errorMessage = `Maaf, terjadi kesalahan: ${error.message}`;
        }


        // Kirim error detail ke frontend
        res.status(500).json({ message: errorMessage });
    }
}