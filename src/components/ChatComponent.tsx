"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Send, Upload, FileText, Loader2, MessageCircle, Trash2, Plus, Menu, Edit3, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Types (keeping your existing interfaces)
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatSession {
  id: string;
  messages: Message[];
  documents: string[];
  created_at: string;
  last_updated: string;
}

interface Document {
  id: string;
  filename: string;
  uploaded_at: string;
  file_type: string;
  file_size: number;
  text_length: number;
}

interface ChatMetadata {
  id: string;
  created_at: string;
  last_updated: string;
  message_count: number;
  document_count: number;
  last_message_preview?: string;
}

interface ChatComponentProps {
  initialChatId?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Optimized Message Component
const MessageComponent = React.memo(({ message, isLatest }: { message: Message; isLatest: boolean }) => {
  const isUser = message.role === 'user';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`group w-full text-white ${!isUser ? 'bg-gray-900/30' : ''}`}
    >
      <div className="flex p-4 gap-4 text-base md:gap-6 md:max-w-2xl lg:max-w-[38rem] xl:max-w-3xl md:py-6 lg:px-0 m-auto">
        <div className="flex-shrink-0 flex flex-col relative items-end">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isUser 
              ? 'bg-gradient-to-r from-blue-500 to-purple-500' 
              : 'bg-gradient-to-r from-green-500 to-blue-500'
          }`}>
            {isUser ? (
              <span className="text-white text-sm font-medium">U</span>
            ) : (
              <span className="text-white text-sm font-medium">S</span>
            )}
          </div>
        </div>
        <div className="relative flex w-full flex-col lg:w-[calc(100%-115px)]">
          <div className="font-semibold select-none text-white">
            {isUser ? 'You' : 'Sera'}
          </div>
          <div className="flex-col gap-1 md:gap-3">
            <div className="flex flex-grow flex-col gap-3">
              <div className="min-h-[20px] flex flex-col items-start gap-4 whitespace-pre-wrap break-words text-gray-100">
                {message.content}
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-400 mt-2">
            {new Date(message.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

MessageComponent.displayName = 'MessageComponent';

// Chat Item Component with inline editing
const ChatItem = React.memo(({ 
  chat, 
  isActive, 
  onSelect, 
  onDelete, 
  onRename 
}: {
  chat: ChatMetadata;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (newTitle: string) => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(chat.last_message_preview || 'New Chat');
  const [isHovered, setIsHovered] = useState(false);

  const handleSave = () => {
    onRename(editTitle);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(chat.last_message_preview || 'New Chat');
    setIsEditing(false);
  };

  return (
    <div
      className={`group relative flex items-center gap-2 break-all rounded-lg bg-gray-900/50 hover:bg-gray-800/70 cursor-pointer py-2 px-2 transition-colors ${
        isActive ? 'bg-gray-800/70' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onSelect}
    >
      <div className="flex-shrink-0">
        <MessageCircle size={16} className="text-gray-400" />
      </div>
      
      {isEditing ? (
        <div className="flex-1 flex items-center gap-1">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="flex-1 bg-gray-800/70 text-white text-sm border border-gray-600 outline-none rounded px-2 py-1"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') handleCancel();
            }}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSave();
            }}
            className="p-1 text-green-400 hover:text-green-300"
          >
            <Check size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCancel();
            }}
            className="p-1 text-red-400 hover:text-red-300"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <>
          <div className="flex-1 text-sm overflow-hidden">
            <div className="relative max-h-5 overflow-hidden break-all text-gray-100">
              {chat.last_message_preview || 'New Chat'}
            </div>
          </div>
          
          {isHovered && !isActive && (
            <div className="absolute right-1 flex gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                className="p-1 text-gray-400 hover:text-gray-200"
              >
                <Edit3 size={12} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-1 text-gray-400 hover:text-red-400"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
});

ChatItem.displayName = 'ChatItem';

// Optimized Chat History Sidebar
const ChatHistorySidebar = React.memo(({ 
  chats, 
  currentChatId, 
  onChatSelect, 
  onNewChat, 
  onDeleteChat,
  onRenameChat,
  isLoading,
  isVisible,
  onToggle 
}: {
  chats: ChatMetadata[];
  currentChatId: string | null;
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
  onRenameChat: (chatId: string, newTitle: string) => void;
  isLoading: boolean;
  isVisible: boolean;
  onToggle: () => void;
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-64 bg-black border-r border-gray-800 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-800">
        <button
          onClick={onNewChat}
          className="flex items-center gap-2 flex-1 text-left py-2 px-3 rounded-md border border-gray-700 text-sm text-gray-100 hover:bg-gray-900/50 transition-colors"
        >
          <Plus size={16} />
          New chat
        </button>
        <button
          onClick={onToggle}
          className="ml-2 p-2 text-gray-400 hover:text-gray-200"
        >
          <X size={16} />
        </button>
      </div>
      
      {/* Chat History */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center items-center h-20">
            <Loader2 size={20} className="animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {chats.map((chat) => (
              <ChatItem
                key={chat.id}
                chat={chat}
                isActive={currentChatId === chat.id}
                onSelect={() => onChatSelect(chat.id)}
                onDelete={() => onDeleteChat(chat.id)}
                onRename={(newTitle) => onRenameChat(chat.id, newTitle)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

ChatHistorySidebar.displayName = 'ChatHistorySidebar';

const ChatComponent: React.FC<ChatComponentProps> = ({ initialChatId }) => {
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(initialChatId || null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMetadata[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Memoized API functions (keeping your existing API functions)
  const api = useMemo(() => ({
    async fetchChatHistory(): Promise<ChatMetadata[]> {
      const response = await fetch(`${API_BASE_URL}/api/chats`);
      if (!response.ok) throw new Error('Failed to fetch chat history');
      const data = await response.json();
      return data.chats || [];
    },

    async fetchChatSession(chatId: string): Promise<ChatSession> {
      const response = await fetch(`${API_BASE_URL}/api/chat/${chatId}/history`);
      if (!response.ok) throw new Error('Failed to fetch chat session');
      return response.json();
    },

    async sendMessage(message: string, chatId?: string): Promise<any> {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, chatId }),
      });
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },

    async uploadDocument(file: File, chatId?: string): Promise<any> {
      const formData = new FormData();
      formData.append('file', file);
      if (chatId) formData.append('chatId', chatId);
      
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Failed to upload document');
      return response.json();
    },

    async deleteChat(chatId: string): Promise<void> {
      const response = await fetch(`${API_BASE_URL}/api/chat/${chatId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete chat');
    },

    async fetchDocuments(chatId: string): Promise<Document[]> {
      const response = await fetch(`${API_BASE_URL}/api/chat/${chatId}/documents`);
      if (!response.ok) throw new Error('Failed to fetch documents');
      const data = await response.json();
      return data.documents || [];
    }
  }), []);

  // All your existing callback functions remain the same
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'end' 
      });
    }
  }, []);

  const loadChatHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const chats = await api.fetchChatHistory();
      setChatHistory(chats);
    } catch (error) {
      console.error('Failed to load chat history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [api]);

  const loadChatSession = useCallback(async (chatId: string) => {
    setIsLoading(true);
    try {
      const [session, docs] = await Promise.all([
        api.fetchChatSession(chatId),
        api.fetchDocuments(chatId)
      ]);
      
      setMessages(session.messages || []);
      setDocuments(docs);
      setCurrentChatId(chatId);
    } catch (error) {
      console.error('Failed to load chat session:', error);
      setMessages([]);
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await api.sendMessage(userMessage.content, currentChatId || undefined);
      
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.response,
        timestamp: response.timestamp,
      };

      setMessages(prev => [
        ...prev.slice(0, -1),
        { ...userMessage, id: `user-${Date.now()}` },
        assistantMessage
      ]);

      setCurrentChatId(response.chatId);
      loadChatHistory();
      
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => prev.slice(0, -1));
      setInput(userMessage.content);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, currentChatId, api, loadChatHistory]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await api.uploadDocument(file, currentChatId || undefined);
      
      if (result.analysis) {
        const analysisMessage: Message = {
          id: `analysis-${Date.now()}`,
          role: 'assistant',
          content: result.analysis,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, analysisMessage]);
      }

      setCurrentChatId(result.chatId);
      
      const docs = await api.fetchDocuments(result.chatId);
      setDocuments(docs);
      loadChatHistory();
      
    } catch (error) {
      console.error('Failed to upload file:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [currentChatId, api, loadChatHistory]);

  const handleChatSelect = useCallback((chatId: string) => {
    if (chatId !== currentChatId) {
      loadChatSession(chatId);
      setShowSidebar(false);
    }
  }, [currentChatId, loadChatSession]);

  const handleNewChat = useCallback(() => {
    setCurrentChatId(null);
    setMessages([]);
    setDocuments([]);
    setShowSidebar(false);
    inputRef.current?.focus();
  }, []);

  const handleDeleteChat = useCallback(async (chatId: string) => {
    try {
      await api.deleteChat(chatId);
      setChatHistory(prev => prev.filter(chat => chat.id !== chatId));
      
      if (chatId === currentChatId) {
        handleNewChat();
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  }, [currentChatId, api, handleNewChat]);

  const handleRenameChat = useCallback(async (chatId: string, newTitle: string) => {
    // Add your rename API call here
    setChatHistory(prev => prev.map(chat => 
      chat.id === chatId 
        ? { ...chat, last_message_preview: newTitle }
        : chat
    ));
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  // Effects (keeping your existing effects)
  useEffect(() => {
    loadChatHistory();
  }, [loadChatHistory]);

  useEffect(() => {
    if (initialChatId && initialChatId !== currentChatId) {
      loadChatSession(initialChatId);
    }
  }, [initialChatId, currentChatId, loadChatSession]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  return (
    <div className="flex h-screen bg-black text-white relative overflow-hidden">
      {/* Background gradient and grid pattern matching start page */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900"></div>
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      ></div>

      {/* Sidebar */}
      <ChatHistorySidebar
        chats={chatHistory}
        currentChatId={currentChatId}
        onChatSelect={handleChatSelect}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
        isLoading={isLoadingHistory}
        isVisible={showSidebar}
        onToggle={() => setShowSidebar(!showSidebar)}
      />

      {/* Overlay for mobile sidebar */}
      {showSidebar && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative z-10">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-3 bg-black/90 backdrop-blur-sm border-b border-gray-800">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
            >
              <Menu size={24} />
            </button>
            <div>
              <h1 className="text-lg font-semibold">Hey Sera</h1>
              {documents.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <FileText size={12} />
                  <span>{documents.length} document{documents.length > 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          </div>
          
          <button
            onClick={handleNewChat}
            className="p-2 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-2">How can I help you today?</h2>
                <p className="text-gray-400">Upload documents and start chatting with Sera</p>
              </div>
            </div>
          ) : (
            <div>
              {messages.map((message, index) => (
                <MessageComponent
                  key={message.id}
                  message={message}
                  isLatest={index === messages.length - 1}
                />
              ))}
              
              {isLoading && (
                <div className="w-full bg-gray-900/30">
                  <div className="flex p-4 gap-4 text-base md:gap-6 md:max-w-2xl lg:max-w-[38rem] xl:max-w-3xl md:py-6 lg:px-0 m-auto">
                    <div className="flex-shrink-0 flex flex-col relative items-end">
                      <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                        <Loader2 size={16} className="text-white animate-spin" />
                      </div>
                    </div>
                    <div className="relative flex w-full flex-col lg:w-[calc(100%-115px)]">
                      <div className="font-semibold select-none text-white">Sera</div>
                      <div className="text-gray-400">Thinking...</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-end bg-gray-900/70 backdrop-blur-sm rounded-2xl border border-gray-700">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute left-3 bottom-3 p-2 text-gray-400 hover:text-gray-200 disabled:opacity-50 transition-colors"
              >
                {isUploading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Upload size={20} />
                )}
              </button>
              
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message Sera..."
                className="flex-1 resize-none bg-transparent px-14 py-3 text-white placeholder-gray-400 border-none outline-none max-h-48"
                disabled={isLoading}
                rows={1}
              />
              
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="absolute right-3 bottom-3 p-2 bg-white text-black rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
            <div className="text-center text-xs text-gray-500 mt-2">
              Sera can make mistakes. Check important info.
            </div>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
};

export default ChatComponent;
