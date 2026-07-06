const Groq = require('groq-sdk');
const Service = require('../models/Service');
const Staff = require('../models/Staff');
const SalonSettings = require('../models/SalonSettings');

const GROQ_MODEL = 'llama-3.1-8b-instant';
const DEFAULT_REPLY = 'I am here to help with SalonDEES services, stylists, timings, and beauty care guidance.';
const MAX_USER_MESSAGE_LENGTH = 500;
let groqClient = null;

const getGroqClient = () => {
  if (!process.env.GROQ_API_KEY) {
    return null;
  }

  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  return groqClient;
};

const dayLabels = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

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

const buildSalonContext = async () => {
  const [services, staff, settings] = await Promise.all([
    Service.find({}).select('name price duration').lean(),
    Staff.find({}).select('name specialty workingHours offDays').lean(),
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

          return `- ${member.name}: ${member.specialty}, works ${start} - ${end}, off days: ${offDays}`;
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

const toGroqMessages = (history = []) => {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter((item) => item?.text && ['user', 'assistant', 'model'].includes(item.role))
    .slice(-12)
    .map((item) => ({
      role: item.role === 'user' ? 'user' : 'assistant',
      content: String(item.text).slice(0, 2000),
    }));
};

const buildSystemPrompt = (salonContext) => `
You are the official AI Assistant of SalonDEES management system.
Your persona is a polite, premium, welcoming salon concierge and expert beauty/grooming consultant.
Speak in the language the user uses, Sinhala or English, and keep the tone warm, professional, and salon-host friendly.
Core SalonDEES details are the top priority: location at Pothuhera Junction, opening hours, services, stylists, and stylist off-days.
Use the live salon context below as your source of truth for salon services, prices, timings, stylists, off-days, contact details, and opening hours.
You may answer beauty and grooming consultation questions, including hair care tips, skin care guidance, styling suggestions, product/routine advice, and preparation or aftercare for salon services.
You may handle friendly small talk and chit-chat briefly while keeping the conversation refined and helpful.
If the user asks about coming in, appointments, reservations, availability, or booking, smoothly guide them to use the "Book Appointment", "Appointments", or "Book Now" feature on the website.
For medical, allergy, or severe skin/scalp issues, provide general care guidance only and suggest consulting a qualified healthcare professional.
Do not answer topics unrelated to SalonDEES, beauty, grooming, hair care, skin care, styling, small talk, or booking. Politely guide users back to SalonDEES or beauty care.

${salonContext}
`;

const buildChatMessages = (salonContext, history, userMessage) => [
  { role: 'system', content: buildSystemPrompt(salonContext) },
  ...toGroqMessages(history),
  { role: 'user', content: userMessage },
];

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
      return res.status(500).json({ message: 'Groq API key is not configured.' });
    }

    const salonContext = await buildSalonContext();
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: buildChatMessages(salonContext, history, userMessage),
      temperature: 0.6,
      max_tokens: 500,
    });
    const reply = completion.choices?.[0]?.message?.content || DEFAULT_REPLY;

    return res.status(200).json({ reply });
  } catch (error) {
    console.error('Chatbot Error:', error);
    return res.status(500).json({
      message: 'The AI assistant is temporarily unavailable. Please try again shortly.',
    });
  }
};

module.exports = { handleChat };
