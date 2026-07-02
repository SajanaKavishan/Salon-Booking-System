import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Mail, Search, Trash2 } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const systemStartYear = 2026;
const currentYear = new Date().getFullYear();
const latestYear = Math.max(currentYear, systemStartYear);
const yearOptions = Array.from(
  { length: latestYear - systemStartYear + 1 },
  (_, index) => String(latestYear - index)
);
const monthOptions = [
  { value: 'all', label: 'All Months' },
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' }
];

const buildGmailReplyUrl = (email, name) => {
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: email || '',
    su: 'Reply from SalonDEES',
    body: `Hi ${name || 'there'},\n\n`
  });

  return `https://mail.google.com/mail/?${params.toString()}`;
};

function AdminMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [readActionId, setReadActionId] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalMessages, setTotalMessages] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const messagesPerPage = 6;

  const getAuthConfig = () => ({
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`
    }
  });

  const fetchMessages = async (pageToLoad = 1) => {
    try {
      if (pageToLoad === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const params = new URLSearchParams({
        page: String(pageToLoad),
        limit: String(messagesPerPage)
      });

      if (selectedYear) {
        params.set('year', selectedYear);
      }

      if (selectedMonth !== 'all') {
        params.set('month', selectedMonth);
      }

      const response = await axios.get(`${API_BASE_URL}/api/messages?${params.toString()}`, getAuthConfig());

      const fetchedMessages = Array.isArray(response.data?.messages)
        ? response.data.messages
        : Array.isArray(response.data)
          ? response.data
          : [];
      const currentPage = Number(response.data?.currentPage || pageToLoad);
      const fetchedTotalPages = Number(response.data?.totalPages || 1);
      const fetchedTotalMessages = Number(response.data?.totalMessages || fetchedMessages.length);

      setMessages((currentMessages) =>
        pageToLoad > 1
          ? [...currentMessages, ...fetchedMessages]
          : fetchedMessages
      );
      setPage(currentPage);
      setTotalPages(fetchedTotalPages);
      setTotalMessages(fetchedTotalMessages);
      setHasMore(currentPage < fetchedTotalPages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchMessages(1);
  }, [selectedYear, selectedMonth]);

  const filteredMessages = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return messages.filter((msg) => {
      const matchesStatus = filterStatus === 'all' || msg.isRead !== true;
      const searchableText = `${msg.name || ''} ${msg.email || ''} ${msg.message || ''}`.toLowerCase();
      const matchesSearch = !normalizedQuery || searchableText.includes(normalizedQuery);

      return matchesStatus && matchesSearch;
    });
  }, [filterStatus, messages, searchQuery]);

  const unreadCount = messages.filter((msg) => msg.isRead !== true).length;
  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    fetchMessages(page + 1);
  };

  const handleMarkAsRead = async (id) => {
    const currentMessage = messages.find((msg) => msg._id === id);
    if (!currentMessage || currentMessage.isRead === true || readActionId === id) return;

    try {
      setReadActionId(id);
      const response = await axios.put(`${API_BASE_URL}/api/messages/${id}/read`, {}, getAuthConfig());
      const updatedMessage = response.data;

      setMessages((currentMessages) =>
        currentMessages.map((msg) =>
          msg._id === id
            ? { ...msg, ...updatedMessage, isRead: true }
            : msg
        )
      );
    } catch (error) {
      console.error('Error marking message as read:', error);
    } finally {
      setReadActionId('');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      try {
        await axios.delete(`${API_BASE_URL}/api/messages/${id}`, getAuthConfig());
        setMessages((currentMessages) => currentMessages.filter((msg) => msg._id !== id));
      } catch (error) {
        console.error('Error deleting message:', error);
        alert('Failed to delete message');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] p-8 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="h-8 w-56 animate-pulse rounded bg-white/10" />
          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-64 animate-pulse rounded-2xl border border-neutral-800 bg-neutral-900/40" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="mt-2 font-serif text-3xl text-white sm:text-4xl">Customer Messages</h2>
            <p className="mt-3 text-sm text-neutral-400">
              {totalMessages} total messages, {unreadCount} unread loaded
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 xl:w-auto xl:flex-row">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:flex">
              <select
                value={selectedYear}
                onChange={(event) => setSelectedYear(event.target.value)}
                className="h-11 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-300 outline-none transition focus:border-[#d4af37]/50 focus:ring-2 focus:ring-[#d4af37]/10"
                aria-label="Filter messages by year"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>

              <select
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="h-11 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-300 outline-none transition focus:border-[#d4af37]/50 focus:ring-2 focus:ring-[#d4af37]/10"
                aria-label="Filter messages by month"
              >
                {monthOptions.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search name, email, message"
                className="h-11 w-full rounded-xl border border-neutral-800 bg-neutral-950/70 pl-10 pr-4 text-sm text-white outline-none transition focus:border-[#d4af37]/50 focus:ring-2 focus:ring-[#d4af37]/10"
              />
            </div>

            <div className="inline-flex h-11 rounded-xl border border-neutral-800 bg-neutral-950/70 p-1">
              {['all', 'unread'].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFilterStatus(status)}
                  className={`rounded-lg px-4 text-sm font-semibold capitalize transition ${
                    filterStatus === status
                      ? 'bg-[#d4af37] text-neutral-950'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {messages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/30 p-10 text-center text-neutral-400">
            No new messages.
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/30 p-10 text-center text-neutral-400">
            No messages match your current search or filter.
          </div>
        ) : (
          <div className="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredMessages.map((msg) => {
                const customerName = msg.name || 'Customer';
                const initial = customerName.trim().charAt(0).toUpperCase() || 'C';
                const isUnread = msg.isRead !== true;

                return (
                  <article
                    key={msg._id}
                    onMouseEnter={() => handleMarkAsRead(msg._id)}
                    onFocus={() => handleMarkAsRead(msg._id)}
                    className={`group relative flex min-h-[300px] flex-col bg-neutral-900/40 backdrop-blur-md border border-neutral-800 hover:border-[#d4af37]/40 rounded-2xl p-6 transition-all duration-300 ${
                      isUnread ? 'shadow-[0_0_0_1px_rgba(212,175,55,0.14)]' : ''
                    }`}
                    tabIndex={0}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#d4af37]/10 text-lg font-bold text-[#d4af37]">
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="truncate text-lg font-semibold text-white">{customerName}</h3>
                            {isUnread && (
                              <span className="h-2 w-2 shrink-0 rounded-full bg-[#d4af37] shadow-[0_0_16px_rgba(212,175,55,0.85)]" />
                            )}
                          </div>
                          <p className="truncate text-sm text-[#d4af37]">{msg.email}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDelete(msg._id)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-500/10 bg-red-500/5 text-red-400 transition hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-300"
                        title="Delete message"
                        aria-label="Delete message"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-5 border-t border-neutral-800 pt-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : 'Date unavailable'}
                      </p>
                      <p className="mt-4 whitespace-pre-wrap text-sm font-medium leading-6 text-neutral-300">
                        {msg.message}
                      </p>
                    </div>

                    <div className="mt-auto flex flex-col gap-3 pt-6 sm:flex-row">
                      <a
                        href={buildGmailReplyUrl(msg.email, customerName)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#d4af37] px-4 py-2.5 text-sm font-bold text-neutral-950 transition hover:bg-[#e2c45d]"
                      >
                        <Mail className="h-4 w-4" />
                        Reply via Email
                      </a>

                      {isUnread && (
                        <button
                          type="button"
                          onClick={() => handleMarkAsRead(msg._id)}
                          disabled={readActionId === msg._id}
                          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-neutral-700 px-4 py-2.5 text-sm font-semibold text-neutral-300 transition hover:border-[#d4af37]/40 hover:text-[#d4af37] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {readActionId === msg._id ? 'Marking...' : 'Mark as Read'}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            {hasMore && (
              <div className="flex justify-center py-8">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="rounded-xl border border-neutral-800 px-6 py-3 text-sm font-bold text-[#d4af37] transition hover:bg-[#d4af37] hover:text-neutral-950 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingMore ? 'Loading...' : 'Load More Messages'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminMessages;
