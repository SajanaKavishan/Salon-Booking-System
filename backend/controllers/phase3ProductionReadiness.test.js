const test = require('node:test');
const assert = require('node:assert/strict');

process.env.CLOUDINARY_URL ||= 'cloudinary://test-key:test-secret@test-cloud';

const appointmentController = require('./appointmentController');
const chatController = require('./chatController');

const {
  isMissingOrAnyStylist,
  resolveStatusTransition,
} = appointmentController._test;
const {
  GROQ_TIMEOUT_MS,
  MAX_HISTORY_CHARACTERS,
  MAX_HISTORY_MESSAGES,
  buildSystemPrompt,
  requestGroqCompletion,
  toGroqMessages,
} = chatController._test;

test('appointment state machine permits only the production transition matrix', () => {
  const allowedTransitions = [
    ['pending', 'confirmed'],
    ['pending', 'cancelled'],
    ['pending', 'CANCELLED_BY_SALON'],
    ['confirmed', 'completed'],
    ['confirmed', 'cancelled'],
    ['confirmed', 'CANCELLED_BY_SALON'],
    ['confirmed', 'NO_SHOW'],
  ];

  allowedTransitions.forEach(([currentStatus, requestedStatus]) => {
    const transition = resolveStatusTransition({ currentStatus, requestedStatus, userRole: 'admin' });
    assert.equal(transition.isOverride, false);
  });

  [
    ['completed', 'confirmed'],
    ['cancelled', 'pending'],
    ['CANCELLED_BY_SALON', 'confirmed'],
    ['no-show', 'pending'],
    ['pending', 'completed'],
  ].forEach(([currentStatus, requestedStatus]) => {
    assert.throws(
      () => resolveStatusTransition({ currentStatus, requestedStatus, userRole: 'admin' }),
      (error) => error.statusCode === 400 && /not allowed/i.test(error.message)
    );
  });
});

test('terminal status reversion requires an audited admin override reason', () => {
  assert.throws(
    () => resolveStatusTransition({
      currentStatus: 'completed',
      requestedStatus: 'pending',
      overrideStatusTransition: true,
      userRole: 'admin',
    }),
    (error) => error.statusCode === 400 && /overridereason/i.test(error.message)
  );

  assert.throws(
    () => resolveStatusTransition({
      currentStatus: 'completed',
      requestedStatus: 'pending',
      overrideStatusTransition: true,
      overrideReason: 'Customer service recovery',
      userRole: 'staff',
    }),
    (error) => error.statusCode === 403 && /only administrators/i.test(error.message)
  );

  const override = resolveStatusTransition({
    currentStatus: 'completed',
    requestedStatus: 'pending',
    overrideStatusTransition: true,
    overrideReason: '  Customer service recovery  ',
    userRole: 'admin',
  });
  assert.equal(override.isOverride, true);
  assert.equal(override.overrideReason, 'Customer service recovery');
});

test('specific stylist guard rejects every retired fallback sentinel', () => {
  [undefined, null, '', 'any', 'Any Stylist', 'Any Available Stylist'].forEach((value) => {
    assert.equal(isMissingOrAnyStylist(value), true);
  });
  assert.equal(isMissingOrAnyStylist('64b64c3f2f5f5b1c8c123453'), false);
});

test('chat history is bounded to six messages and 2,000 total characters', () => {
  const history = Array.from({ length: 10 }, (_, index) => ({
    role: index % 2 === 0 ? 'user' : 'assistant',
    text: `${index}-${'x'.repeat(450)}`,
  }));
  const messages = toGroqMessages(history);
  const totalCharacters = messages.reduce((total, message) => total + message.content.length, 0);

  assert.ok(messages.length <= MAX_HISTORY_MESSAGES);
  assert.ok(totalCharacters <= MAX_HISTORY_CHARACTERS);
  assert.match(messages.at(-1).content, /^9-/);
});

test('chat prompt requires a specific stylist and Groq requests carry an abort signal', async () => {
  assert.match(buildSystemPrompt('Test salon context'), /choose one specific stylist/i);
  assert.equal(GROQ_TIMEOUT_MS, 8000);

  let receivedSignal;
  const fakeGroq = {
    chat: {
      completions: {
        create: async (_payload, options) => {
          receivedSignal = options.signal;
          return { choices: [] };
        },
      },
    },
  };

  await requestGroqCompletion(fakeGroq, []);
  assert.ok(receivedSignal instanceof AbortSignal);
});

test('Groq request timeout aborts a stalled external call', async () => {
  const stalledGroq = {
    chat: {
      completions: {
        create: (_payload, options) => new Promise((_resolve, reject) => {
          options.signal.addEventListener('abort', () => {
            const error = new Error('Request aborted');
            error.name = 'AbortError';
            reject(error);
          }, { once: true });
        }),
      },
    },
  };

  await assert.rejects(
    requestGroqCompletion(stalledGroq, [], 5),
    (error) => error.name === 'AbortError'
  );
});
