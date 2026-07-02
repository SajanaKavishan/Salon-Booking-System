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
    <div className="fixed bottom-6 right-5 z-50 flex flex-col items-end gap-4 sm:bottom-8 sm:right-8">
      {isOpen && (
        <div className="flex h-[min(560px,calc(100vh-120px))] w-[calc(100vw-40px)] max-w-sm flex-col overflow-hidden rounded-2xl border border-[#d4af37]/30 bg-neutral-950 shadow-2xl shadow-black/50">
          <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d4af37] text-neutral-950 shadow-lg shadow-[#d4af37]/20">
                <Bot size={22} strokeWidth={2.4} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">SalonDEES AI Assistant</h3>
                <div className="mt-1 flex items-center gap-2 text-xs text-neutral-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
                  Online
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-full p-2 text-neutral-400 transition hover:bg-neutral-900 hover:text-white"
              aria-label="Close chat"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-neutral-950 px-4 py-5">
            {messages.map((message, index) => {
              const isUser = message.role === 'user';

              return (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed shadow ${
                      isUser
                        ? 'rounded-br-sm bg-[#d4af37] text-neutral-950'
                        : 'rounded-bl-sm border border-neutral-800 bg-neutral-900 text-neutral-200'
                    }`}
                  >
                    {message.text}
                  </div>
                </div>
              );
            })}

            {isSending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-300">
                  <Loader2 size={16} className="animate-spin text-[#d4af37]" />
                  Thinking...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-neutral-800 bg-neutral-950 p-3">
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about services, stylists, or timings..."
              className="min-w-0 flex-1 rounded-full border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-[#d4af37]"
              disabled={isSending}
            />
            <button
              type="submit"
              disabled={!input.trim() || isSending}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#d4af37] text-neutral-950 shadow-lg shadow-[#d4af37]/20 transition hover:scale-105 hover:bg-[#e6c552] disabled:cursor-not-allowed disabled:opacity-50"
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
        className="bg-[#d4af37] text-neutral-950 p-4 rounded-full shadow-lg cursor-pointer transition-all hover:scale-110 focus:outline-none focus:ring-4 focus:ring-[#d4af37]/30"
        aria-label={isOpen ? 'Close SalonDEES AI Assistant' : 'Open SalonDEES AI Assistant'}
      >
        {isOpen ? <X size={28} strokeWidth={2.5} /> : <Bot size={28} strokeWidth={2.5} />}
      </button>
    </div>
  );
}

export default ChatWidget;
