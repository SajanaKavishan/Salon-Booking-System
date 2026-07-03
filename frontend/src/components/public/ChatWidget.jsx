import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Bot, ChevronDown, Loader2, Send } from 'lucide-react';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');

const initialMessages = [
  {
    role: 'assistant',
    text: 'Welcome to SalonDEES. How may I help you with our services, stylists, or opening hours today?',
  },
];

const quickActions = [
  'Book Appointment',
  'View Services',
  'Opening Hours',
  'Find Stylist',
];

function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [shouldRenderChat, setShouldRenderChat] = useState(false);
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatScrollRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedInput = input.trim();
    if (!trimmedInput || isSending) return;

    const userMessage = { role: 'user', text: trimmedInput };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput('');
    setIsSending(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/chatbot`, {
        message: trimmedInput,
        history: messages,
      });

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          role: 'assistant',
          text: response.data?.reply || 'I am here to help with SalonDEES services, stylists, and timings.',
        },
      ]);
    } catch (error) {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          role: 'assistant',
          text: error.response?.data?.message || 'Sorry, the SalonDEES AI Assistant is unavailable right now.',
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

  return (
    <div className="fixed inset-x-3 bottom-4 z-50 flex flex-col items-end gap-3 sm:inset-x-auto sm:bottom-8 sm:right-8 sm:gap-4">
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
          onWheel={handlePanelWheel}
          className={`flex h-[min(560px,calc(100svh-96px))] w-full origin-bottom-right flex-col overflow-hidden rounded-2xl border border-[#d4af37]/25 bg-[#101010]/95 shadow-2xl shadow-black/60 backdrop-blur-md sm:h-[min(600px,calc(100vh-110px))] sm:w-[410px] sm:rounded-3xl ${
            isOpen
              ? 'animate-[salonChatUnfold_360ms_cubic-bezier(0.16,1,0.3,1)_both]'
              : 'animate-[salonChatFold_260ms_ease-in_both]'
          }`}
        >
          <div className="relative overflow-hidden border-b border-[#d4af37]/20 bg-black/80 px-4 py-3.5 backdrop-blur-md sm:px-5 sm:py-4">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.18),transparent_34%)]" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#d4af37]/40 bg-[#d4af37] text-neutral-950 shadow-lg shadow-[#d4af37]/20 sm:h-11 sm:w-11">
                  <Bot size={20} strokeWidth={2.4} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white sm:text-[15px]">SalonDEES Concierge</h3>
                  <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/5 px-2 py-0.5 text-[10px] font-medium text-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
                    Online
                  </div>
                </div>
              </div>

              <div className="h-9 w-9" aria-hidden="true" />
            </div>
          </div>

          <div ref={chatScrollRef} className="salon-chat-scrollbar flex-1 space-y-3 overflow-y-auto bg-[#101010] px-3 py-4 sm:space-y-4 sm:px-4 sm:py-5">
            {messages.map((message, index) => {
              const isUser = message.role === 'user';

              return (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="mb-1 hidden h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#d4af37]/25 bg-[#141414] text-[#d4af37] min-[380px]:flex">
                      <Bot size={15} strokeWidth={2.3} />
                    </div>
                  )}
                  <div
                    className={`max-w-[86%] whitespace-pre-wrap px-3.5 py-2.5 text-sm leading-relaxed shadow-lg sm:max-w-[82%] sm:px-4 sm:py-3 ${
                      isUser
                        ? 'rounded-2xl rounded-br-md border border-white/10 bg-gradient-to-r from-[#2a2a2a] to-[#1f1f1f] font-medium text-white shadow-black/20'
                        : 'rounded-2xl rounded-bl-md border border-[#d4af37]/25 bg-[#141414] text-neutral-100 shadow-black/20'
                    }`}
                  >
                    {message.text}
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

          <div className="flex gap-2 overflow-x-auto border-t border-[#d4af37]/15 bg-[#101010] px-3 py-2.5 sm:flex-wrap sm:overflow-visible sm:px-4 sm:py-3">
            {quickActions.map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => setInput(action)}
                className="shrink-0 rounded-full border border-[#d4af37]/25 bg-[#141414] px-3 py-1.5 text-xs font-medium text-neutral-200 transition hover:border-[#d4af37]/50 hover:bg-[#d4af37]/10"
              >
                {action}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-[#d4af37]/15 bg-[#141414] p-3 sm:p-3.5">
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about services, stylists, or timings..."
              className="min-w-0 flex-1 rounded-full border border-[#d4af37]/20 bg-[#101010] px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20"
              disabled={isSending}
            />
            <button
              type="submit"
              disabled={!input.trim() || isSending}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#d4af37] text-neutral-950 shadow-lg shadow-[#d4af37]/25 transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-45"
              aria-label="Send message"
            >
              {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={`group relative overflow-hidden rounded-full p-3.5 shadow-2xl shadow-black/35 transition-all duration-500 ease-in-out hover:scale-110 hover:shadow-xl focus:outline-none focus:ring-4 sm:p-4 ${
          isOpen
            ? 'bg-[#d4af37] text-neutral-950 focus:ring-[#d4af37]/30'
            : 'bg-[#d4af37] text-neutral-950 focus:ring-[#d4af37]/30'
        }`}
        aria-label={isOpen ? 'Close SalonDEES AI Assistant' : 'Open SalonDEES AI Assistant'}
      >
        <span className="pointer-events-none absolute inset-0 rounded-full bg-white/20 opacity-0 transition group-hover:opacity-100" />
        <span
          className={`relative flex origin-center ${!isOpen ? 'animate-[salonBotPulse_3.2s_ease-in-out_infinite]' : ''}`}
        >
          {isOpen ? <ChevronDown size={28} strokeWidth={2.8} /> : <Bot size={28} strokeWidth={2.5} />}
        </span>
      </button>
    </div>
  );
}

export default ChatWidget;
