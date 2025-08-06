"use client";

import { getAuth, signOut } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { 
  PaperAirplaneIcon, 
  PlusIcon, 
  ArrowRightOnRectangleIcon,
  DocumentTextIcon,
  SparklesIcon,
  ClockIcon,
  UserIcon,
  Cog6ToothIcon,
  ChatBubbleLeftRightIcon,
  BoltIcon,
  StopIcon
} from '@heroicons/react/24/outline';
import { 
  ChatBubbleLeftRightIcon as ChatBubbleLeftRightIconSolid,
  SparklesIcon as SparklesIconSolid
} from '@heroicons/react/24/solid';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
  isTyping?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
}

export default function ChatPage() {
  const auth = getAuth(app);
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string>('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle authentication state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/');
      }
    });
    return () => unsubscribe();
  }, [auth, router]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [message]);

  // Scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Create new chat session
  const createNewChat = () => {
    const newChatId = Date.now().toString();
    const newSession: ChatSession = {
      id: newChatId,
      title: 'New Chat',
      lastMessage: '',
      timestamp: new Date()
    };
    
    setChatSessions(prev => [newSession, ...prev]);
    setCurrentChatId(newChatId);
    setMessages([]);
  };

  // Send message to Python backend
  const sendMessageToAPI = async (userMessage: string) => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          chatId: currentChatId
        }),
      });

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Error calling API:', error);
      return "I'm sorry, I'm having trouble connecting to my services right now. Please try again.";
    }
  };

  // Handle sending a message
  const handleSendMessage = async (e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.preventDefault();
    if (!message.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: message.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsTyping(true);

    // Create typing indicator
    const typingMessage: Message = {
      id: 'typing',
      sender: 'bot',
      text: '',
      timestamp: new Date(),
      isTyping: true
    };
    
    setMessages(prev => [...prev, typingMessage]);

    try {
      // Call Python API
      const botResponse = await sendMessageToAPI(userMessage.text);
      
      // Remove typing indicator and add actual response
      setMessages(prev => {
        const withoutTyping = prev.filter(msg => msg.id !== 'typing');
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: botResponse,
          timestamp: new Date()
        };
        return [...withoutTyping, botMessage];
      });

      // Update chat session
      if (currentChatId) {
        setChatSessions(prev => prev.map(session => 
          session.id === currentChatId 
            ? { ...session, lastMessage: userMessage.text, timestamp: new Date() }
            : session
        ));
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => {
        const withoutTyping = prev.filter(msg => msg.id !== 'typing');
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: "I apologize, but I encountered an error processing your request. Please try again.",
          timestamp: new Date()
        };
        return [...withoutTyping, errorMessage];
      });
    } finally {
      setIsTyping(false);
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Typing dots animation
  const TypingIndicator = () => (
    <div className="flex items-center space-x-1">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
      <span className="text-gray-400 text-sm ml-2">Sera is typing...</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white flex overflow-hidden">
      {/* Background gradient - matching landing page */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900 pointer-events-none"></div>
      
      {/* Subtle grid pattern - matching landing page */}
      <div 
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      ></div>

      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 bg-black/50 backdrop-blur-sm border-r border-gray-800/50 flex flex-col relative z-10`}>
        <div className={`${isSidebarOpen ? 'p-6' : 'p-0'} transition-all duration-300 overflow-hidden`}>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                <SparklesIconSolid className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">Hey Sera</span>
            </div>
          </div>

          {/* New Chat Button */}
          <button
            onClick={createNewChat}
            className="w-full flex items-center gap-3 px-4 py-3 mb-6 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/20 text-white rounded-xl hover:from-blue-600/30 hover:to-purple-600/30 hover:border-blue-500/30 transition-all group"
          >
            <PlusIcon className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" />
            <span className="font-medium">New Chat</span>
          </button>

          {/* Recent Chats */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-400 mb-3 px-2">Recent Chats</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {chatSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => setCurrentChatId(session.id)}
                  className={`w-full text-left p-3 rounded-lg transition-all hover:bg-white/5 group ${
                    currentChatId === session.id ? 'bg-white/10 border border-white/10' : 'border border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <ChatBubbleLeftRightIcon className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{session.lastMessage || 'New Chat'}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {session.timestamp.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2 mb-6">
            <h3 className="text-sm font-medium text-gray-400 mb-3 px-2">Quick Actions</h3>
            <button className="w-full flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-all">
              <DocumentTextIcon className="w-4 h-4" />
              <span className="text-sm">Upload Document</span>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-all">
              <BoltIcon className="w-4 h-4" />
              <span className="text-sm">Quick Analysis</span>
            </button>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className={`mt-auto ${isSidebarOpen ? 'p-6' : 'p-0'} border-t border-gray-800/50 transition-all duration-300 overflow-hidden`}>
          <div className="space-y-2">
            <button className="w-full flex items-center gap-3 px-3 py-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
              <Cog6ToothIcon className="w-4 h-4" />
              <span className="text-sm">Settings</span>
            </button>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
            >
              <ArrowRightOnRectangleIcon className="w-4 h-4" />
              <span className="text-sm">Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800/50 bg-black/30 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-white/10 rounded-lg transition-all"
            >
              <ChatBubbleLeftRightIcon className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center">
                <SparklesIcon className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="font-semibold">Sera Assistant</h1>
                <p className="text-xs text-gray-400">AI-powered policy analysis</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Online
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-2xl mx-auto">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center mb-6">
                <SparklesIconSolid className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Welcome to Hey Sera!
              </h2>
              <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                I'm your AI assistant specialized in policy document analysis. Upload documents, ask questions, or start a conversation to get precise insights.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg">
                <div className="p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all cursor-pointer">
                  <DocumentTextIcon className="w-6 h-6 text-blue-400 mb-2" />
                  <h3 className="font-medium mb-1">Analyze Document</h3>
                  <p className="text-sm text-gray-400">Upload and get insights from policy docs</p>
                </div>
                <div className="p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all cursor-pointer">
                  <BoltIcon className="w-6 h-6 text-purple-400 mb-2" />
                  <h3 className="font-medium mb-1">Quick Question</h3>
                  <p className="text-sm text-gray-400">Ask me anything about policies</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-4 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.sender === 'user' 
                      ? 'bg-gradient-to-r from-blue-600 to-blue-500' 
                      : 'bg-gradient-to-r from-green-500 to-blue-500'
                  }`}>
                    {msg.sender === 'user' ? (
                      <UserIcon className="w-4 h-4 text-white" />
                    ) : (
                      <SparklesIcon className="w-4 h-4 text-white" />
                    )}
                  </div>

                  {/* Message */}
                  <div className={`flex-1 max-w-3xl ${msg.sender === 'user' ? 'text-right' : ''}`}>
                    <div className={`inline-block p-4 rounded-2xl ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white'
                        : 'bg-white/10 text-white border border-white/10'
                    }`}>
                      {msg.isTyping ? (
                        <TypingIndicator />
                      ) : (
                        <div className="whitespace-pre-wrap break-words">{msg.text}</div>
                      )}
                    </div>
                    <div className={`text-xs text-gray-500 mt-2 ${msg.sender === 'user' ? 'text-right' : ''}`}>
                      <ClockIcon className="w-3 h-3 inline mr-1" />
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="p-6 bg-black/30 backdrop-blur-sm border-t border-gray-800/50">
          <div className="max-w-4xl mx-auto">
            <div className="relative flex items-end gap-3 p-3 bg-white/5 rounded-2xl border border-white/10 focus-within:border-blue-500/50 transition-all">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about policies or documents..."
                className="flex-1 bg-transparent text-white placeholder-gray-400 resize-none focus:outline-none min-h-[24px] max-h-[200px] py-2"
                rows={1}
                disabled={isTyping}
              />
              
              {isTyping ? (
                <button
                  type="button"
                  className="p-2 bg-red-600 hover:bg-red-700 rounded-full transition-all"
                  onClick={() => setIsTyping(false)}
                >
                  <StopIcon className="w-5 h-5 text-white" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!message.trim()}
                  onClick={handleSendMessage}
                  className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full hover:from-blue-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PaperAirplaneIcon className="w-5 h-5 text-white" />
                </button>
              )}
            </div>
            
            <div className="flex items-center justify-between mt-3 px-3">
              <p className="text-xs text-gray-500">
                Press Enter to send, Shift+Enter for new line
              </p>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>{message.length} characters</span>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  AI Ready
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .min-h-screen {
          height: 100vh;
        }
        .overflow-y-auto {
          scrollbar-width: thin;
          scrollbar-color: #374151 transparent;
        }
        .overflow-y-auto::-webkit-scrollbar {
          width: 6px;
        }
        .overflow-y-auto::-webkit-scrollbar-track {
          background: transparent;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: #374151;
          border-radius: 3px;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: #4b5563;
        }
      `}</style>
    </div>
  );
}