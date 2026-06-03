const dotenv = require('dotenv');
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
console.log('Gemini API Key:', apiKey ? 'Loaded (' + apiKey.substring(0, 5) + '...)' : 'Missing');

const prompt = 'Hello, analyze this text and return simple JSON format: {"response": "Hello World"}';
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json' }
  })
}).then(async res => {
  console.log('Status:', res.status);
  console.log('Body:', await res.text());
}).catch(err => {
  console.error('Error:', err);
});
