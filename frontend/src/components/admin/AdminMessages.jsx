import React, { useState, useEffect } from 'react';
import axios from 'axios';

function AdminMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Get all messages from the backend when the component mounts
  const fetchMessages = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/messages');
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  // Delete a message by its ID
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this message?")) {
      try {
        await axios.delete(`http://localhost:5000/api/messages/${id}`);
        // Remove the deleted message from the state to update the UI
        setMessages(messages.filter((msg) => msg._id !== id));
      } catch (error) {
        console.error('Error deleting message:', error);
        alert('Failed to delete message');
      }
    }
  };

  if (loading) return <div className="p-8 text-white">Loading messages...</div>;

  return (
    <div className="p-8 bg-[#0a0a0a] min-h-screen text-white">
      <h2 className="text-3xl font-serif mb-6 text-[#d4af37]">Customer Messages</h2>

      {messages.length === 0 ? (
        <p className="text-gray-400">No new messages.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {messages.map((msg) => (
            <div key={msg._id} className="bg-[#111111] p-6 rounded-md border border-white/10 relative">
              
              {/* Delete Button */}
              <button 
                onClick={() => handleDelete(msg._id)}
                className="absolute top-4 right-4 text-red-500 hover:text-red-700 transition"
                title="Delete Message"
              >
                ✕
              </button>

              <div className="mb-4 border-b border-white/5 pb-4">
                <h3 className="text-xl font-semibold">{msg.name}</h3>
                <p className="text-[#d4af37] text-lg">{msg.email}</p>
                <p className="text-gray-500 text-sm mt-1">
                  {new Date(msg.createdAt).toLocaleString()}
                </p>
              </div>
              
              <p className="text-gray-300 font-bold whitespace-pre-wrap">
                {msg.message}
              </p>
              
              {/* Email Reply Button */}
              <a 
                href={`mailto:${msg.email}`}
                className="inline-block mt-6 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-lg rounded transition"
              >
                Reply via Email
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminMessages;