import React, { useState, useEffect, useRef } from 'react';
import { Send, X } from 'lucide-react';
import { socket } from '../utils/socket';

export default function ChatPanel({ room, messages, setMessages, onClose }) {
  const [inputText, setInputText] = useState('');
  const endOfMessagesRef = useRef(null);

  // Auto scroll
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (inputText.trim()) {
      socket.emit('send_message', { room, message: inputText });
      setInputText('');
    }
  };

  return (
    <div className="absolute top-0 right-0 bottom-0 w-80 bg-[#111] border-l border-gray-800 shadow-2xl flex flex-col z-50 transform transition-transform duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#151515]">
        <h3 className="text-white font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Proximity Chat
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition cursor-pointer">
          <X size={18} />
        </button>
      </div>

      {/* Messages Array */}
      <div className="flex-1 min-h-[250px] max-h-[300px] p-3 overflow-y-auto flex flex-col gap-3">
        {messages.map((msg, idx) => {
            const isMe = msg.senderId === socket.id;
            return (
              <div key={idx} className={`flex flex-col max-w-[85%] ${isMe ? 'self-end' : 'self-start'}`}>
                {!isMe && <span className="text-xs text-gray-400 ml-1 mb-1">{msg.username}</span>}
                <div className={`rounded-2xl px-4 py-2 text-sm shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-100 rounded-bl-none'}`}>
                  {msg.message}
                </div>
              </div>
            );
        })}
        <div ref={endOfMessagesRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-gray-700 flex gap-2">
        <input 
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-gray-800 border border-gray-600 text-white rounded-full px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
        />
        <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 shadow-lg">
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
