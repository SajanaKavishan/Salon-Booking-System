import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Bot, Loader2, Send, X } from 'lucide-react';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');

const initialMessages = [
  {
    role: 'assistant',
    text: 'Welcome to SalonDEES. How may I help you with our services, stylists, or opening hours today?',
  },
];

function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, messages]);

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

  return (
    <div className="fixed bottom-5 right-4 z-50 flex flex-col items-end gap-4 sm:bottom-8 sm:right-8">
      {isOpen && (
        <div className="flex h-[min(610px,calc(100vh-110px))] w-[calc(100vw-32px)] max-w-[410px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#111827]/95 shadow-2xl shadow-black/60 backdrop-blur-md">
          <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-emerald-950 via-slate-950 to-neutral-950 px-5 py-4">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.24),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.18),transparent_32%)]" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#d4af37]/40 bg-[#d4af37] text-neutral-950 shadow-lg shadow-[#d4af37]/20">
                  <Bot size={22} strokeWidth={2.4} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white sm:text-[15px]">SalonDEES AI Assistant</h3>
                  <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium text-emerald-100">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.95)]" />
                    Online
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-neutral-300 transition hover:bg-white/10 hover:text-white"
                aria-label="Close chat"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto bg-[#111827] px-4 py-5 [scrollbar-color:#334155_transparent]">
            {messages.map((message, index) => {
              const isUser = message.role === 'user';

              return (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#d4af37]/25 bg-slate-950 text-[#d4af37]">
                      <Bot size={15} strokeWidth={2.3} />
                    </div>
                  )}
                  <div
                    className={`max-w-[82%] whitespace-pre-wrap px-4 py-3 text-sm leading-relaxed shadow-lg ${
                      isUser
                        ? 'rounded-2xl rounded-br-md bg-[#d4af37] font-medium text-neutral-950 shadow-[#d4af37]/10'
                        : 'rounded-2xl rounded-bl-md border border-white/10 bg-slate-950/80 text-neutral-100 shadow-black/20'
                    }`}
                  >
                    {message.text}
                  </div>
                </div>
              );
            })}

            {isSending && (
              <div className="flex items-end gap-2 justify-start">
                <div className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#d4af37]/25 bg-slate-950 text-[#d4af37]">
                  <Bot size={15} strokeWidth={2.3} />
                </div>
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-neutral-300 shadow-lg shadow-black/20">
                  <Loader2 size={16} className="animate-spin text-[#d4af37]" />
                  Thinking...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-white/10 bg-slate-950/95 p-3.5">
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about services, stylists, or timings..."
              className="min-w-0 flex-1 rounded-full border border-white/10 bg-[#111827] px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20"
              disabled={isSending}
            />
            <button
              type="submit"
              disabled={!input.trim() || isSending}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#d4af37] text-neutral-950 shadow-lg shadow-[#d4af37]/25 transition hover:scale-105 hover:bg-[#e6c552] disabled:cursor-not-allowed disabled:opacity-45"
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
        className="group relative overflow-hidden rounded-full bg-[#d4af37] p-4 text-neutral-950 shadow-2xl shadow-black/35 transition-all hover:scale-110 hover:bg-[#e6c552] focus:outline-none focus:ring-4 focus:ring-[#d4af37]/30"
        aria-label={isOpen ? 'Close SalonDEES AI Assistant' : 'Open SalonDEES AI Assistant'}
      >
        <span className="pointer-events-none absolute inset-0 bg-white/20 opacity-0 transition group-hover:opacity-100" />
        <span className="relative flex">
          {isOpen ? <X size={28} strokeWidth={2.5} /> : <Bot size={28} strokeWidth={2.5} />}
        </span>
      </button>
    </div>
  );
}

export default ChatWidget;
