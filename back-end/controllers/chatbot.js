const { GoogleGenerativeAI } = require('@google/generative-ai');
const { AppError } = require('../errors/errorCodes');

exports.sendMessage = async (req, res, next) => {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        const { message, previousMessages } = req.body;
        
        if (!apiKey) {
            return res.status(500).json({ error: 'GEMINI_API_KEY is not configured in backend .env' });
        }

        if (!message) {
            return next(new AppError('Message is required', 400));
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            systemInstruction: "You are a counseling, soothing, and highly supportive AI chatbot designed for a mental wellness app called ZenAura. Your primary purpose is to listen abstractly to the user's problems, deeply validate their feelings, and then gently suggest practical and comforting solutions. Always speak in a warm, empathetic, non-judgmental, and reassuring tone."
        });

        // Let's format previous messages into chat history format
        const history = (previousMessages || []).map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }));

        const chat = model.startChat({
            history: history,
        });

        const result = await chat.sendMessage(message);
        const responseText = result.response.text();

        res.status(200).json({ reply: responseText });
    } catch (error) {
        console.error('Error generating AI response:', error);
        next(new AppError('Failed to communicate with AI', 500));
    }
};
