const Groq = require('groq-sdk');
const Service = require('../models/Service');
const Staff = require('../models/Staff');
const SalonSettings = require('../models/SalonSettings');

const GROQ_MODEL = 'llama-3.1-8b-instant';
const DEFAULT_REPLY = 'I am here to help with SalonDEES services, stylists, timings, and beauty care guidance.';
const CHAT_FAILURE_REPLY = 'The SalonDEES assistant is taking a short break. Please try again in a moment or contact the salon for booking help.';
const MAX_USER_MESSAGE_LENGTH = 500;
const MAX_HISTORY_MESSAGES = 6;
const MAX_HISTORY_CHARACTERS = 2000;
const GROQ_TIMEOUT_MS = 8000;
let groqClient = null;

// Initialize Groq client if API key is available
const getGroqClient = () => {
  if (!process.env.GROQ_API_KEY) {
    return null;
  }

  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  return groqClient;
};

// Mapping of day keys to their corresponding labels for display purposes
const dayLabels = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

// Function to format the opening hours of the salon into a readable string
const formatOpeningHours = (openingHours = {}) => {
  return Object.entries(dayLabels)
    .map(([key, label]) => {
      const hours = openingHours?.[key];
      if (!hours || hours.isOpen === false) {
        return `${label}: Closed`;
      }

      return `${label}: ${hours.start || '09:00'} - ${hours.end || '17:00'}`;
    })
    .join('\n');
};

// Function to build the salon context by fetching services, staff, and settings from the database
const buildSalonContext = async () => {
  const [services, staff, settings] = await Promise.all([
    Service.find({ isActive: { $ne: false } }).select('name price duration').lean(),
    Staff.find({ isActive: { $ne: false } }).select('name specialty description workingHours offDays').lean(),
    SalonSettings.findOne({}).lean(),
  ]);

  const serviceLines = services.length
    ? services
        .map((service) => `- ${service.name}: LKR ${service.price}, about ${service.duration} minutes`)
        .join('\n')
    : '- No services are currently listed in the system.';

  const staffLines = staff.length
    ? staff
        .map((member) => {
          const start = member.workingHours?.start || '09:00';
          const end = member.workingHours?.end || '17:00';
          const offDays = Array.isArray(member.offDays) && member.offDays.length
            ? member.offDays.join(', ')
            : 'None';
          const description = String(member.description || '').trim().substring(0, 500);
          const profileText = description ? ` Description: ${description}` : '';

          return `- ${member.name}: ${member.specialty}, works ${start} - ${end}, off days: ${offDays}.${profileText}`;
        })
        .join('\n')
    : '- No stylists are currently listed in the system.';

  return `
Salon profile:
- Name: ${settings?.salonName || 'SalonDEES'}
- Contact number: ${settings?.contactNumber || 'Not listed'}
- Address: ${settings?.address || 'Pothuhera Junction'}

Salon services:
${serviceLines}

Stylists:
${staffLines}

Opening hours:
${formatOpeningHours(settings?.openingHours)}
`;
};

// Function to convert chat history into a format suitable for Groq API
const toGroqMessages = (history = []) => {
  if (!Array.isArray(history)) {
    return [];
  }

  const recentMessages = history
    .filter((item) => item?.text && ['user', 'assistant', 'model'].includes(item.role))
    .slice(-MAX_HISTORY_MESSAGES)
    .map((item) => ({
      role: item.role === 'user' ? 'user' : 'assistant',
      content: String(item.text).trim(),
    }));

  const boundedMessages = [];
  let remainingCharacters = MAX_HISTORY_CHARACTERS;

  for (let index = recentMessages.length - 1; index >= 0 && remainingCharacters > 0; index -= 1) {
    const message = recentMessages[index];
    const content = message.content.slice(0, remainingCharacters);
    if (!content) continue;

    boundedMessages.unshift({ ...message, content });
    remainingCharacters -= content.length;
  }

  return boundedMessages;
};

// Function to build the system prompt for the AI assistant, incorporating the salon context and guidelines for interaction
const buildSystemPrompt = (salonContext) => `
You are the official AI Assistant of SalonDEES management system.
Your persona is a polite, premium, welcoming salon concierge and expert beauty/grooming consultant.
Speak in the language the user uses, Sinhala or English, and keep the tone warm, professional, and salon-host friendly.
Core SalonDEES details are the top priority: location at Pothuhera Junction, opening hours, services, stylists, and stylist off-days.
Use the live salon context below as your source of truth for salon services, prices, timings, stylists, off-days, contact details, and opening hours.
You may answer beauty and grooming consultation questions, including hair care tips, skin care guidance, styling suggestions, product/routine advice, and preparation or aftercare for salon services.
You may handle friendly small talk and chit-chat briefly while keeping the conversation refined and helpful.
If the user asks about coming in, appointments, reservations, availability, or booking, smoothly guide them to use the "Book Appointment", "Appointments", or "Book Now" feature on the website.
Every appointment requires the customer to choose one specific stylist. Never offer, recommend, or imply an "any stylist" or automatic stylist-assignment option. If the customer is unsure, briefly compare the listed stylists and ask them to select one before booking.
For medical, allergy, or severe skin/scalp issues, provide general care guidance only and suggest consulting a qualified healthcare professional.
Do not answer topics unrelated to SalonDEES, beauty, grooming, hair care, skin care, styling, small talk, or booking. Politely guide users back to SalonDEES or beauty care.

${salonContext}
`;

// Function to build the complete chat messages array for the Groq API, including the system prompt, chat history, and the user's current message
const buildChatMessages = (salonContext, history, userMessage) => {
  const boundedHistory = toGroqMessages(history);
  const lastHistoryMessage = boundedHistory[boundedHistory.length - 1];
  const deduplicatedHistory = lastHistoryMessage?.role === 'user'
    && lastHistoryMessage.content === userMessage
    ? boundedHistory.slice(0, -1)
    : boundedHistory;

  return [
    { role: 'system', content: buildSystemPrompt(salonContext) },
    ...deduplicatedHistory,
    { role: 'user', content: userMessage },
  ];
};

const requestGroqCompletion = async (groq, messages, timeoutMs = GROQ_TIMEOUT_MS) => {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    return await groq.chat.completions.create(
      {
        model: GROQ_MODEL,
        messages,
        temperature: 0.6,
        max_tokens: 500,
      },
      { signal: abortController.signal }
    );
  } finally {
    clearTimeout(timeoutId);
  }
};

// Main handler for chat requests, processing user messages and returning AI-generated replies
const handleChat = async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    const userMessage = typeof message === 'string' ? message.trim() : '';

    if (!userMessage) {
      return res.status(400).json({ message: 'Message is required.' });
    }

    if (userMessage.length > MAX_USER_MESSAGE_LENGTH) {
      return res.status(400).json({
        message: `Message must be ${MAX_USER_MESSAGE_LENGTH} characters or fewer.`,
      });
    }

    const groq = getGroqClient();
    if (!groq) {
      console.error('Chatbot configuration error: GROQ_API_KEY is not configured.');
      return res.status(503).json({
        message: CHAT_FAILURE_REPLY,
        code: 'AI_UNAVAILABLE',
      });
    }

    const salonContext = await buildSalonContext();
    const completion = await requestGroqCompletion(
      groq,
      buildChatMessages(salonContext, history, userMessage)
    );
    const reply = completion.choices?.[0]?.message?.content || DEFAULT_REPLY;

    return res.status(200).json({ reply });
  } catch (error) {
    console.error('Chatbot Error:', error);
    return res.status(503).json({
      message: CHAT_FAILURE_REPLY,
      code: error?.name === 'AbortError' ? 'AI_TIMEOUT' : 'AI_UNAVAILABLE',
    });
  }
};

module.exports = {
  handleChat,
  _test: {
    GROQ_TIMEOUT_MS,
    MAX_HISTORY_CHARACTERS,
    MAX_HISTORY_MESSAGES,
    buildChatMessages,
    buildSystemPrompt,
    requestGroqCompletion,
    toGroqMessages,
  },
};
