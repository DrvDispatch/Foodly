// Test script to directly call Gemini API - Version 2
// Run with: npx tsx test-gemini.ts

import { GoogleGenAI } from '@google/genai';

async function testGemini() {
    const apiKey = 'AIzaSyBXKeO4wJq70HsToT_i0cnUWGPWu4UVMAA';

    console.log('Testing Gemini API v2...');
    console.log('API Key (first 20 chars):', apiKey.substring(0, 20) + '...');

    const ai = new GoogleGenAI({ apiKey });

    // Try different models
    const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-pro'];

    const simplePrompt = 'Say hello in one sentence.';

    for (const model of models) {
        console.log(`\n=== Testing model: ${model} ===`);
        try {
            const response = await ai.models.generateContent({
                model: model,
                contents: simplePrompt,
                config: {
                    temperature: 0.5,
                    maxOutputTokens: 100,
                },
            });
            console.log(`Response from ${model}:`, response.text);
        } catch (error: any) {
            console.log(`Error with ${model}:`, error.message);
        }
    }

    // Test the current model with longer output
    console.log('\n=== Testing gemini-3-flash-preview with longer output ===');
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: 'Write a short greeting message (2 sentences max).',
            config: {
                temperature: 0.5,
                maxOutputTokens: 500,
            },
        });
        console.log('Full response:', response.text);
        console.log('Response length:', response.text?.length);
    } catch (error: any) {
        console.log('Error:', error.message);
    }

    console.log('\n=== Done ===');
}

testGemini();
