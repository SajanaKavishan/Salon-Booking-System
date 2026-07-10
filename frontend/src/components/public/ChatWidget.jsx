import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Bot, ChevronDown, Loader2, Send } from 'lucide-react';
import { apiUrl } from '../../utils/apiConfig';

const initialMessages = [
  {
    id: 'welcome-message',
    role: 'assistant',
    text: 'Welcome to SalonDEES. Choose what you would like to know first, and I will keep it short and helpful.',
    createdAt: Date.now(),
  },
];

const rootActions = [
  { id: 'staff', label: 'How about your staff?', step: 'staff' },
  { id: 'services', label: 'I want to know about Services and Prices?', step: 'services' },
  { id: 'holidays', label: 'When are you closed?', step: 'holidays' },
  { id: 'booking-help', label: 'How Booking Works?', replyKey: 'bookingHelp' },
  { id: 'policies', label: 'What are Salon Policies?', step: 'policies' },
  { id: 'custom', label: 'I want to know something else...', step: 'custom_input' },
];

const askOnlyActions = [
  { id: 'custom-followup', label: 'I want to know something else?', step: 'custom_input' },
];

const STAFF_PAGE_SIZE = 4;

const staticReplies = {
  bookingHelp:
    'Booking works in a few simple steps: choose your service, select a preferred stylist or any available stylist, pick a date and time, then confirm your appointment. The booking page will only show valid options based on salon availability.',
  cancellationPolicy:
    'You can cancel or reschedule your appointment up to 2 hours before the scheduled time. This helps SalonDEES reopen the slot for another client.',
  phonePolicy:
    'Please enter a valid phone number when booking. SalonDEES may use it for appointment updates, reminders, late notices, or urgent schedule changes.',
  arrivalPolicy:
    'Please arrive at least 10 minutes before your appointment so there is enough time for check-in and preparation.',
  latePolicy:
    'If you are running late, tap the "I am late" button on your appointment screen. This lets the salon know early and helps the team manage the day schedule.',
  staffHelp:
    'Our staff include skilled stylists with different strengths. If you are unsure who to choose, select any available stylist during booking and SalonDEES will match you with an artist who is free for your selected service and time.',
  moreHelp:
    'Sure. What else would you like to know about SalonDEES? You can type your question below.',
};

const stepIntroReplies = {
  staff:
    'Sure. You can pick a stylist below to see a short profile, or choose help if you are not sure who fits your appointment.',
  services:
    'Of course. Choose what you would like to know about our services and prices.',
  holidays:
    'Please choose a month below. I will only show closure dates for that month.',
  policies:
    'SalonDEES policies are grouped below. Choose the one you want to know about.',
};

function getMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(date) {
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(date);
}

function getMonthOptions() {
  const now = new Date();
  return Array.from({ length: 4 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() + index, 1);
    return {
      id: `holiday-${getMonthKey(date)}`,
      label: index === 0 ? 'This Month' : index === 1 ? 'Next Month' : getMonthLabel(date),
      monthKey: getMonthKey(date),
      monthLabel: getMonthLabel(date),
    };
  });
}

function formatHolidayDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
}

function getStaffDescription(staff) {
  return staff?.description
    || staff?.bio
    || staff?.profileDescription
    || staff?.about
    || staff?.specialty
    || staff?.experience
    || '';
}

function TypingMessage({ text, shouldAnimate, onProgress, onComplete }) {
  const [displayText, setDisplayText] = useState('');
  const onProgressRef = useRef(onProgress);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!shouldAnimate) return undefined;

    let index = 0;

    const timer = setInterval(() => {
      index += 1;
      setDisplayText(text.slice(0, index));
      onProgressRef.current?.();

      if (index >= text.length) {
        clearInterval(timer);
        onCompleteRef.current?.();
      }
    }, 24);

    return () => clearInterval(timer);
  }, [shouldAnimate, text]);

  return shouldAnimate ? displayText : text;
}

function formatMessageTime(createdAt) {
  if (!createdAt) return 'Just now';

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - createdAt) / 1000));
  if (elapsedSeconds < 60) return 'Just now';

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;

  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(createdAt));
}

function ChatWidget({ mode = 'desktop-floating' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [shouldRenderChat, setShouldRenderChat] = useState(false);
  const [messages, setMessages] = useState(initialMessages);
  const [currentStep, setCurrentStep] = useState('root');
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [staffProfiles, setStaffProfiles] = useState([]);
  const [staffPage, setStaffPage] = useState(0);
  const [servicesList, setServicesList] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [isGuidedLoading, setIsGuidedLoading] = useState(false);
  const chatScrollRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typedMessageIdsRef = useRef(new Set());
  const shouldStickToBottomRef = useRef(true);

  const scrollToLatestMessage = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const handleChatScroll = () => {
    const scrollContainer = chatScrollRef.current;
    if (!scrollContainer) return;

    const distanceFromBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight;
    shouldStickToBottomRef.current = distanceFromBottom < 80;
  };

  useEffect(() => {
    if (isOpen) {
      scrollToLatestMessage();
    }
  }, [isOpen, messages]);

  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 640px)').matches;
    if (!isMobile || !isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setShouldRenderChat(true);
      return undefined;
    }

    const timer = setTimeout(() => {
      setShouldRenderChat(false);
    }, 260);

    return () => clearTimeout(timer);
  }, [isOpen]);

  const appendMessages = ({ userText, assistantText }) => {
    const now = Date.now();

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: `user-guided-${now}`,
        role: 'user',
        text: userText,
        createdAt: now,
      },
      {
        id: `assistant-guided-${now}`,
        role: 'assistant',
        text: assistantText,
        animate: true,
        createdAt: now,
      },
    ]);
  };

  const loadStaffProfiles = async () => {
    if (staffProfiles.length) return staffProfiles;

    const response = await axios.get(apiUrl('/api/staff/public-list'));
    const staff = Array.isArray(response.data)
      ? response.data.filter((item) => item?.name)
      : [];
    setStaffProfiles(staff);
    return staff;
  };

  const loadServices = async () => {
    if (servicesList.length) return servicesList;

    const response = await axios.get(apiUrl('/api/services'));
    const services = Array.isArray(response.data?.data)
      ? response.data.data
      : Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.services)
          ? response.data.services
          : [];
    setServicesList(services);
    return services;
  };

  const loadHolidays = async () => {
    if (holidays.length) return holidays;

    const response = await axios.get(apiUrl('/api/holidays'));
    const nextHolidays = Array.isArray(response.data?.holidays) ? response.data.holidays : [];
    setHolidays(nextHolidays);
    return nextHolidays;
  };

  const handleStaffAction = async (action) => {
    if (action.id === 'staff-help') {
      appendMessages({ userText: action.label, assistantText: staticReplies.staffHelp });
      setCurrentStep('ask_only');
      return;
    }

    const selected = staffProfiles.find((item) => (item._id || item.id || item.name) === action.staffId);
    const description = getStaffDescription(selected);
    appendMessages({
      userText: action.label,
      assistantText: selected
        ? `${selected.name}${description ? `: ${description}` : ' is a SalonDEES staff member.'}\n\nYou can choose ${selected.name} during booking if available for your selected time.`
        : 'That stylist profile is not available right now. You can still choose any available stylist during booking.',
    });
    setCurrentStep('ask_only');
  };

  const handleServicesAction = async (action) => {
    if (action.id === 'services-summary') {
      setIsGuidedLoading(true);
      try {
        const services = await loadServices();
        const serviceLines = services.slice(0, 6).map((service) => {
          const price = service.price ? ` - Rs. ${service.price}` : '';
          const duration = service.duration ? ` (${service.duration} min)` : '';
          return `${service.name}${price}${duration}`;
        });

        appendMessages({
          userText: action.label,
          assistantText: serviceLines.length
            ? `Here is a quick preview of SalonDEES services and prices:\n${serviceLines.join('\n')}\n\nFor the complete, live service list, continue through the booking flow.`
            : 'I could not find services to preview right now. Please continue to the booking page to check the latest service and price list.',
        });
      } catch {
        appendMessages({
          userText: action.label,
          assistantText: 'I could not load services and prices right now. Please check the booking page for the latest list.',
        });
      } finally {
        setIsGuidedLoading(false);
      }
      setCurrentStep('ask_only');
    }
  };

  const handleHolidayMonthAction = async (action) => {
    setIsGuidedLoading(true);
    try {
      const holidayList = await loadHolidays();
      const monthHolidays = holidayList.filter((holiday) => holiday.date?.startsWith(action.monthKey));
      const holidayText = monthHolidays.length
        ? monthHolidays
            .map((holiday) => {
              const timeText = holiday.isFullDay === false
                ? `partial closure ${holiday.hours?.start || ''}-${holiday.hours?.end || ''}`.trim()
                : 'closed';
              return `${formatHolidayDate(holiday.date)} - ${holiday.name} (${timeText})`;
            })
            .join('\n')
        : `No salon holidays are listed for ${action.monthLabel}.`;

      appendMessages({
        userText: action.label,
        assistantText: `Here is when SalonDEES is closed in ${action.monthLabel}:\n${holidayText}`,
      });
    } catch {
      appendMessages({
        userText: action.label,
        assistantText: 'I could not load closure dates right now. Please check the booking calendar before selecting a date.',
      });
    } finally {
      setIsGuidedLoading(false);
    }
    setCurrentStep('ask_only');
  };

  const handleQuickAction = async (action) => {
    if (action.step === 'custom_input') {
      setCurrentStep('custom_input');
      setInput('');
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `assistant-custom-${Date.now()}`,
          role: 'assistant',
          text: staticReplies.moreHelp,
          animate: true,
          createdAt: Date.now(),
        },
      ]);
      return;
    }

    if (action.step) {
      setCurrentStep(action.step);
      setInput('');
      if (action.step === 'staff') setStaffPage(0);
      if (stepIntroReplies[action.step]) {
        appendMessages({ userText: action.label, assistantText: stepIntroReplies[action.step] });
      }

      if (action.step === 'staff' && staffProfiles.length === 0) {
        try {
          setIsGuidedLoading(true);
          await loadStaffProfiles();
        } catch {
          setStaffProfiles([]);
        } finally {
          setIsGuidedLoading(false);
        }
      }
      return;
    }

    if (action.kind === 'staff-page') {
      setStaffPage((currentPage) => currentPage + 1);
      return;
    }

    if (action.replyKey) {
      appendMessages({ userText: action.label, assistantText: staticReplies[action.replyKey] });
      if (currentStep === 'root' || currentStep === 'policies' || currentStep === 'services') {
        setCurrentStep('ask_only');
      }
      return;
    }

    if (action.kind === 'staff') {
      await handleStaffAction(action);
      return;
    }

    if (action.kind === 'services') {
      await handleServicesAction(action);
      return;
    }

    if (action.kind === 'holiday-month') {
      await handleHolidayMonthAction(action);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedInput = input.trim();
    if (currentStep !== 'custom_input' || !trimmedInput || isSending) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmedInput,
      createdAt: Date.now(),
    };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput('');
    setIsSending(true);

    try {
      const response = await axios.post(apiUrl('/api/chatbot'), {
        message: trimmedInput,
        history: nextMessages,
      });

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: response.data?.reply || 'I am here to help with SalonDEES services, stylists, and timings.',
          animate: true,
          createdAt: Date.now(),
        },
      ]);
    } catch (error) {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          text: error.response?.data?.message || 'Sorry, the SalonDEES AI Assistant is unavailable right now.',
          animate: true,
          createdAt: Date.now(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handlePanelWheel = (event) => {
    if (window.matchMedia('(max-width: 640px)').matches) return;

    const scrollContainer = chatScrollRef.current;
    if (!scrollContainer) return;

    event.preventDefault();
    event.stopPropagation();
    scrollContainer.scrollTop += event.deltaY;
  };

  const isMobileTrigger = mode === 'mobile-trigger';
  const rootClassName = isMobileTrigger
    ? 'w-full sm:hidden'
    : 'fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-50 hidden flex-col items-end gap-3 sm:inset-x-auto sm:bottom-8 sm:right-8 sm:flex sm:gap-4';
  const panelPositionClassName = isMobileTrigger
    ? `fixed inset-x-3 top-[calc(env(safe-area-inset-top)+4.25rem)] z-50 max-[360px]:inset-x-2 ${
        isInputFocused
          ? 'bottom-[calc(env(safe-area-inset-bottom)+0.5rem)]'
          : 'bottom-[calc(env(safe-area-inset-bottom)+5.25rem)]'
      }`
    : '';
  const panelSizeClassName = isMobileTrigger
    ? 'h-auto w-auto'
    : 'h-[min(560px,calc(100svh-112px))] w-full sm:h-[min(600px,calc(100vh-110px))] sm:w-[410px]';
  const monthOptions = getMonthOptions();
  const visibleQuickActions = (() => {
    if (currentStep === 'custom_input') return [];
    if (currentStep === 'ask_only') return askOnlyActions;
    if (currentStep === 'staff') {
      const staff = staffProfiles;
      const pageStart = staffPage * STAFF_PAGE_SIZE;
      const visibleStaff = staff.slice(pageStart, pageStart + STAFF_PAGE_SIZE);
      const hasMoreStaff = pageStart + STAFF_PAGE_SIZE < staff.length;

      return [
        ...visibleStaff.map((profile) => ({
          id: `staff-${profile._id || profile.id || profile.name}`,
          label: profile.name,
          detail: getStaffDescription(profile),
          kind: 'staff',
          staffId: profile._id || profile.id || profile.name,
        })),
        ...(hasMoreStaff
          ? [{ id: `staff-more-${staffPage + 1}`, label: 'View More Staff', detail: `${staff.length - pageStart - STAFF_PAGE_SIZE} more`, kind: 'staff-page' }]
          : []),
        { id: 'staff-help', label: 'Help Me Choose', kind: 'staff' },
      ];
    }
    if (currentStep === 'services') {
      return [
        { id: 'services-summary', label: 'Show Service Preview', detail: 'Short list only', kind: 'services' },
        { id: 'services-booking', label: 'How Booking Works', replyKey: 'bookingHelp' },
      ];
    }
    if (currentStep === 'holidays') {
      return [
        ...monthOptions.map((month) => ({
          ...month,
          detail: '',
          kind: 'holiday-month',
        })),
      ];
    }
    if (currentStep === 'policies') {
      return [
        { id: 'policy-cancellation', label: 'Cancellation', detail: '2 hours before', replyKey: 'cancellationPolicy' },
        { id: 'policy-phone', label: 'Phone Number', detail: 'Use a valid number', replyKey: 'phonePolicy' },
        { id: 'policy-arrival', label: 'Arrival Time', detail: 'Come 10 minutes early', replyKey: 'arrivalPolicy' },
        { id: 'policy-late', label: 'Running Late', detail: 'Use the I am late button', replyKey: 'latePolicy' },
      ];
    }
    return rootActions;
  })();
  const showChatInput = currentStep === 'custom_input';

  return (
    <div className={rootClassName}>
      <style>
        {`
          @keyframes salonBotPulse {
            0%, 12%, 100% {
              transform: scale(1) rotate(0deg);
              opacity: 1;
            }
            24% {
              transform: scale(1.08) rotate(0deg);
              opacity: 0.94;
            }
            38% {
              transform: scale(1.05) rotate(9deg);
              opacity: 1;
            }
            50% {
              transform: scale(1.05) rotate(-7deg);
            }
            62% {
              transform: scale(1.04) rotate(5deg);
            }
            76% {
              transform: scale(1) rotate(0deg);
            }
          }

          @keyframes salonChatUnfold {
            from {
              opacity: 0;
              clip-path: inset(96% 0 0 0 round 24px);
              transform: translateY(18px) scaleX(0.9);
            }
            to {
              opacity: 1;
              clip-path: inset(0 0 0 0 round 24px);
              transform: translateY(0) scaleX(1);
            }
          }

          @keyframes salonChatFold {
            from {
              opacity: 1;
              clip-path: inset(0 0 0 0 round 24px);
              transform: translateY(0) scaleX(1);
            }
            to {
              opacity: 0;
              clip-path: inset(96% 0 0 0 round 24px);
              transform: translateY(18px) scaleX(0.9);
            }
          }

          @keyframes salonButtonSheen {
            0% {
              transform: translateX(-180%) skewX(-18deg);
            }
            58%, 100% {
              transform: translateX(280%) skewX(-18deg);
            }
          }

          .salon-chat-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: rgba(212, 175, 55, 0.75) transparent;
          }

          .salon-chat-scrollbar::-webkit-scrollbar {
            width: 5px;
          }

          .salon-chat-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }

          .salon-chat-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(212, 175, 55, 0.7);
            border-radius: 999px;
          }
        `}
      </style>
      {shouldRenderChat && (
        <div
          className={`fixed inset-0 z-40 bg-black/45 backdrop-blur-sm transition-opacity duration-260 sm:hidden ${
            isOpen ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden="true"
        />
      )}
      {shouldRenderChat && (
        <div
          onWheel={handlePanelWheel}
          className={`${panelPositionClassName} ${panelSizeClassName} flex origin-bottom-right flex-col overflow-hidden rounded-2xl border border-[#d4af37]/25 bg-[#101010]/95 shadow-2xl shadow-black/60 backdrop-blur-md transition-[bottom] duration-300 ease-out sm:rounded-3xl ${
            isOpen
              ? 'animate-[salonChatUnfold_360ms_cubic-bezier(0.16,1,0.3,1)_both]'
              : 'animate-[salonChatFold_260ms_ease-in_both]'
          }`}
        >
          <div className="relative overflow-hidden border-b border-[#d4af37]/20 bg-black/80 px-3.5 py-3 backdrop-blur-md sm:px-5 sm:py-4">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.18),transparent_34%)]" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[#d4af37]/40 bg-[#d4af37] text-neutral-950 shadow-lg shadow-[#d4af37]/20 sm:h-11 sm:w-11">
                  <Bot size={19} strokeWidth={2.4} />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-[0.95rem] font-bold tracking-wide text-white sm:text-lg">SalonDEES Concierge</h3>
                </div>
              </div>

              {isMobileTrigger ? (
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#d4af37]/25 bg-[#141414] text-[#d4af37] transition hover:bg-[#d4af37]/10"
                  aria-label="Minimize SalonDEES Concierge"
                >
                  <ChevronDown size={20} strokeWidth={2.7} />
                </button>
              ) : (
                <div className="h-9 w-9" aria-hidden="true" />
              )}
            </div>
          </div>

          <div
            ref={chatScrollRef}
            onScroll={handleChatScroll}
            className="salon-chat-scrollbar flex-1 overscroll-contain space-y-3 overflow-y-auto bg-[#101010] px-3 py-4 sm:space-y-4 sm:px-4 sm:py-5"
          >
            {messages.map((message, index) => {
              const isUser = message.role === 'user';
              const messageId = message.id || `${message.role}-${index}`;
              const shouldAnimateMessage = !isUser && message.animate && !typedMessageIdsRef.current.has(messageId);

              return (
                <div
                  key={messageId}
                  className={`flex items-start gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="mt-1 hidden h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#d4af37]/25 bg-[#141414] text-[#d4af37] min-[380px]:flex">
                      <Bot size={15} strokeWidth={2.3} />
                    </div>
                  )}
                  <div className={`flex max-w-[88%] flex-col max-[360px]:max-w-[92%] sm:max-w-[82%] ${isUser ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`whitespace-pre-wrap px-3.5 py-2.5 text-sm leading-relaxed shadow-lg max-[360px]:text-[0.82rem] sm:px-4 sm:py-3 ${
                        isUser
                          ? 'rounded-2xl rounded-br-md border border-white/10 bg-gradient-to-r from-[#2a2a2a] to-[#1f1f1f] font-medium text-white shadow-black/20'
                          : 'rounded-2xl rounded-bl-md border border-[#d4af37]/25 bg-[#141414] text-neutral-100 shadow-black/20'
                      }`}
                    >
                      {isUser ? (
                        message.text
                      ) : (
                        <TypingMessage
                          text={message.text}
                          shouldAnimate={shouldAnimateMessage}
                          onProgress={() => {
                            if (shouldStickToBottomRef.current) {
                              scrollToLatestMessage('auto');
                            }
                          }}
                          onComplete={() => typedMessageIdsRef.current.add(messageId)}
                        />
                      )}
                    </div>
                    {!isUser && (
                      <p className="mt-1.5 px-1 text-[0.72rem] font-medium leading-none text-neutral-500">
                        SalonDEES Concierge • AI Agent • {formatMessageTime(message.createdAt)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {isSending && (
              <div className="flex items-end gap-2 justify-start">
                <div className="mb-1 hidden h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#d4af37]/25 bg-[#141414] text-[#d4af37] min-[380px]:flex">
                  <Bot size={15} strokeWidth={2.3} />
                </div>
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-[#d4af37]/25 bg-[#141414] px-4 py-3 text-sm text-neutral-300 shadow-lg shadow-black/20">
                  <Loader2 size={16} className="animate-spin text-[#d4af37]" />
                  Thinking...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {visibleQuickActions.length > 0 && (
            <div className="flex flex-col items-end gap-2 border-t border-[#d4af37]/10 bg-[#101010] px-4 pb-3 pt-3">
              {isGuidedLoading && (
                <div className="flex w-fit items-center gap-2 rounded-full border border-[#d4af37]/20 bg-[#141414] px-4 py-2 text-xs font-medium text-neutral-400">
                  <Loader2 size={14} className="animate-spin text-[#d4af37]" />
                  Loading options...
                </div>
              )}
              {visibleQuickActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => handleQuickAction(action)}
                  disabled={isGuidedLoading}
                  className="luxury-pill group flex w-fit max-w-full items-center gap-3 text-left disabled:cursor-wait disabled:opacity-60 max-[360px]:px-3 max-[360px]:text-xs"
                >
                  <span className="min-w-0">
                    <span className="block truncate">{action.label}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {showChatInput && (
            <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-[#d4af37]/15 bg-[#141414] p-2.5 sm:p-3.5">
              <input
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                placeholder="Ask SalonDEES Concierge..."
                aria-label="Ask SalonDEES Concierge"
                className="min-w-0 flex-1 rounded-full border border-[#d4af37]/20 bg-[#101010] px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 max-[360px]:px-3 max-[360px]:text-[0.82rem]"
                disabled={isSending}
              />
              <button
                type="submit"
                disabled={!input.trim() || isSending}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#d4af37] text-neutral-950 shadow-lg shadow-[#d4af37]/25 transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-45 max-[360px]:h-10 max-[360px]:w-10"
                aria-label="Send message"
              >
                {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </form>
          )}
        </div>
      )}

      {isMobileTrigger ? (
        !shouldRenderChat && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group relative flex min-h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-full border border-[#d4af37]/35 bg-black/45 px-8 py-3.5 text-base font-semibold text-white shadow-[0_12px_30px_rgba(15,15,15,0.45)] backdrop-blur-sm transition duration-300 ease-out hover:scale-[1.02] hover:bg-[#d4af37]/10 hover:shadow-[0_18px_40px_rgba(212,175,55,0.18)] max-[380px]:min-h-11 max-[380px]:py-3 max-[380px]:text-sm"
          aria-label="Open SalonDEES Concierge"
        >
          <span className="pointer-events-none absolute inset-y-[-35%] left-0 w-1/2 bg-gradient-to-r from-transparent via-[#d4af37]/45 to-transparent opacity-75 animate-[salonButtonSheen_3.8s_ease-in-out_infinite]" />
          <Bot className="relative" size={18} strokeWidth={2.4} />
          <span className="relative">Ask Concierge</span>
        </button>
        )
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="group relative overflow-hidden rounded-full bg-[#d4af37] p-3.5 text-neutral-950 shadow-2xl shadow-black/35 transition-all duration-500 ease-in-out hover:scale-110 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-[#d4af37]/30 sm:p-4"
          aria-label={isOpen ? 'Close SalonDEES AI Assistant' : 'Open SalonDEES AI Assistant'}
        >
          <span className="pointer-events-none absolute inset-0 rounded-full bg-white/20 opacity-0 transition group-hover:opacity-100" />
          <span
            className={`relative flex origin-center ${!isOpen ? 'animate-[salonBotPulse_3.2s_ease-in-out_infinite]' : ''}`}
          >
            {isOpen ? <ChevronDown size={28} strokeWidth={2.8} /> : <Bot size={28} strokeWidth={2.5} />}
          </span>
        </button>
      )}
    </div>
  );
}

export default ChatWidget;
