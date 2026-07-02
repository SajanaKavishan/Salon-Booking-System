const Groq = require('groq-sdk');
const Service = require('../models/Service');
const Staff = require('../models/Staff');
const SalonSettings = require('../models/SalonSettings');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const GROQ_MODEL = 'llama-3.1-8b-instant';
const DEFAULT_REPLY = 'I am here to help with SalonDEES services, stylists, and timings.';

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
- Address: ${settings?.address || 'Not listed'}

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
Be polite, premium, and welcoming.
Speak in the language the user uses, Sinhala or English.
Provide details only about Salon Services, Stylists, and timings.
If asked about booking, tell them to click the "Appointments" or "Book Now" buttons on the website.
Do not answer unrelated questions. Politely guide users back to SalonDEES services, stylists, timings, or booking.
Use the live salon context below as your source of truth.

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

    if (!process.env.GROQ_API_KEY) {
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
