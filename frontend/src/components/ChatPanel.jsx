import React, { useState, useEffect, useRef } from 'react';
import { Send, X, MessageSquareQuote } from 'lucide-react';
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
    <div className="absolute top-0 right-0 bottom-0 w-[340px] bg-[#0a0a0eba]/90 backdrop-blur-2xl border-l border-white/10 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/20 text-blue-400">
                <MessageSquareQuote size={16} />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-[#111]"></span>
            </div>
            <div>
                <h3 className="text-white text-sm font-bold tracking-wide">Proximity Chat</h3>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">{room.includes('-') ? 'Nearby area' : room}</p>
            </div>
        </div>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Messages Array */}
      <div className="flex-1 p-5 overflow-y-auto hidden-scrollbar flex flex-col gap-4">
        {messages.map((msg, idx) => {
            const isMe = msg.senderId === socket.id;
            const isSystem = msg.senderId === 'system';

            if (isSystem) {
                return (
                    <div key={idx} className="flex justify-center my-2">
                        <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] text-gray-400 font-medium tracking-wide uppercase border border-white/5 shadow-sm">
                            {msg.message}
                        </span>
                    </div>
                )
            }

            return (
              <div key={idx} className={`flex flex-col max-w-[85%] ${isMe ? 'self-end' : 'self-start'}`}>
                <div className={`flex items-baseline gap-2 mb-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-[11px] font-semibold text-gray-400 ml-1">{isMe ? 'You' : msg.username}</span>
                    {msg.timestamp && (
                        <span className="text-[9px] text-gray-600 font-medium">
                            {new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }).format(new Date(msg.timestamp))}
                        </span>
                    )}
                </div>
                <div className={`rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed shadow-sm ${isMe ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-tr-sm' : 'bg-white/10 text-gray-100 rounded-tl-sm border border-white/5'}`}>
                  {msg.message}
                </div>
              </div>
            );
        })}
        <div ref={endOfMessagesRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-4 border-t border-white/5 bg-[#050505]/50">
          <div className="relative flex items-end bg-white/5 border border-white/10 rounded-2xl p-1 focus-within:border-blue-500/50 focus-within:bg-white/10 transition-colors">
            <input 
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Message..."
              className="w-full bg-transparent text-white px-4 py-3 outline-none text-[13px] placeholder-gray-500"
            />
            <button 
                type="submit" 
                disabled={!inputText.trim()}
                className="m-1 w-10 h-10 flex flex-shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:hover:bg-blue-600"
            >
              <Send size={16} className="translate-x-[1px] translate-y-[1px]" />
            </button>
          </div>
      </form>
    </div>
  );
}
