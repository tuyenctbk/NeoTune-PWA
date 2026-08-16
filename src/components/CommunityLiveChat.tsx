import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Users, Sparkles, Radio } from 'lucide-react';
import { RadioStation, StationChatMessage } from '../types';
import { firebaseService } from '../services/firebaseService';
import { triggerHaptic } from '../utils/haptics';

interface CommunityLiveChatProps {
  station: RadioStation;
  className?: string;
}

export const CommunityLiveChat: React.FC<CommunityLiveChatProps> = ({ station, className = '' }) => {
  const [messages, setMessages] = useState<StationChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!station || !station.id) return;
    
    // Subscribe to real-time chat messages for this station
    const unsubscribe = firebaseService.subscribeStationChat(station.id, (msgs) => {
      setMessages(msgs);
    });

    return () => {
      unsubscribe();
    };
  }, [station.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setIsSending(true);
    setChatError(null);

    try {
      triggerHaptic('medium');
      await firebaseService.sendStationChatMessage(station.id, textToSend);
    } catch (err: any) {
      console.error('Failed to send chat message:', err);
      setChatError('Failed to send. Please check your network.');
      setInputText(textToSend); // Restore text on failure
    } finally {
      setIsSending(false);
    }
  };

  const currentUser = firebaseService.getCurrentUser();

  return (
    <div className={`rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md overflow-hidden flex flex-col ${className}`}>
      {/* Header */}
      <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-white/[0.03]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-white truncate">Station Community Chat</h3>
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] truncate">
              {station.name} listeners
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-zinc-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
          <Users className="w-3 h-3 text-cyan-400" />
          <span>{Math.max(1, messages.length * 2 + 1)} online</span>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="p-3.5 flex-1 overflow-y-auto space-y-3 max-h-64 sm:max-h-80 min-h-[160px]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-500">
              <Sparkles className="w-5 h-5 text-cyan-400/60" />
            </div>
            <p className="text-xs font-medium text-zinc-300">
              No chat messages yet for <span className="text-cyan-400">{station.name}</span>
            </p>
            <p className="text-[11px] text-[var(--text-muted)] max-w-xs">
              Be the first listener to send a greeting or share what you think of this station!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = currentUser?.uid === msg.userId;
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0 overflow-hidden border border-white/10">
                  {msg.userPhoto ? (
                    <img src={msg.userPhoto} alt={msg.userName} className="w-full h-full object-cover" />
                  ) : (
                    msg.userName.substring(0, 2).toUpperCase()
                  )}
                </div>

                <div className={`max-w-[78%] space-y-1 ${isMe ? 'items-end text-right' : ''}`}>
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 px-0.5">
                    <span className="font-semibold text-zinc-200 truncate">{msg.userName}</span>
                    <span>•</span>
                    <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div
                    className={`p-2.5 rounded-2xl text-xs leading-relaxed ${
                      isMe
                        ? 'bg-cyan-500 text-black font-medium rounded-tr-none'
                        : 'bg-white/10 text-white rounded-tl-none border border-white/5'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Notice */}
      {chatError && (
        <div className="px-3 py-1.5 text-[10px] text-rose-300 bg-rose-500/10 border-t border-rose-500/20">
          {chatError}
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 bg-black/20 flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Chat with ${station.name} listeners...`}
          maxLength={300}
          className="flex-1 bg-white/5 border border-white/10 focus:border-cyan-400/50 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none transition-all"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isSending}
          className="p-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black font-bold transition-all shrink-0 cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
