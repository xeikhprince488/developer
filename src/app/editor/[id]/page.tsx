'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Editor } from '@monaco-editor/react';
import { cn } from '@/lib/utils';
import { Send, ArrowLeft, Play, Save, File, Github, Paperclip } from 'lucide-react';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  files?: File[];
  githubRepo?: string;
}

interface Session {
  id: string;
  code: string;
  language: string;
  title: string;
  githubRepo?: {
    name: string;
    fullName: string;
    files: Array<{
      name: string;
      path: string;
      content: string;
      size: number;
      type: 'file' | 'dir';
      language?: string;
    }>;
  };
  messages: {
    id: string;
    content: string;
    type: string;
    timestamp: string;
  }[];
}

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  
  // Add refs for scroll management
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end'
        });
      }
    };
    
    scrollToBottom();
  }, [chatMessages]);

  // Fetch session data when component mounts
  useEffect(() => {
    const fetchSession = async () => {
      if (!params.id) return;
      
      try {
        setIsLoadingSession(true);
        const response = await fetch(`/api/sessions/${params.id}`);
        
        if (response.ok) {
          const { session } = await response.json();
          setSession(session);
          setCode(session.code || '');
          setLanguage(session.language || 'javascript');
          
          // Convert database messages to chat messages format
          const formattedMessages = session.messages.map((msg: {
            id: string;
            type: string;
            content: string;
            timestamp: string;
          }) => ({
            id: msg.id,
            type: msg.type.toLowerCase() as 'user' | 'assistant',
            content: msg.content,
            timestamp: new Date(msg.timestamp)
          }));
          setChatMessages(formattedMessages);
        } else {
          console.error('Failed to fetch session');
          router.push('/'); // Redirect to home if session not found
        }
      } catch (error) {
        console.error('Error fetching session:', error);
        router.push('/'); // Redirect to home on error
      } finally {
        setIsLoadingSession(false);
      }
    };

    fetchSession();
  }, [params.id, router]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !session) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: newMessage,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsLoading(true);
    
    try {
      // Save message to database
      await fetch(`/api/sessions/${session.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newMessage,
          type: 'USER'
        }),
      });
      
      // Simulate AI response
      setTimeout(async () => {
        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: `I'll help you with that code. Here's what I suggest...`,
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, aiMessage]);
        
        // Save AI response to database
        await fetch(`/api/sessions/${session.id}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: aiMessage.content,
            type: 'ASSISTANT'
          }),
        });
        
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
    }
  };

  const handleRunCode = () => {
    console.log('Running code:', code);
    // Add code execution logic here
  };

  const handleSaveCode = async () => {
    if (!session) return;
    
    try {
      // Save code changes to database
      await fetch(`/api/sessions/${session.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          language
        }),
      });
      
      // Also download the file
      const blob = new Blob([code], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `code.${language === 'javascript' ? 'js' : language}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error saving code:', error);
    }
  };

  // Show loading state while fetching session
  if (isLoadingSession) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Left Sidebar - Chat */}
      <div className="w-1/3 border-r border-white/10 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/10 bg-gradient-to-r from-black/40 to-gray-900/40 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <motion.button
              onClick={() => router.push('/')}
              className="p-2 rounded-lg bg-gradient-to-r from-gray-500/20 to-slate-500/20 border border-white/20 text-white hover:from-gray-500/30 hover:to-slate-500/30 transition-all duration-200"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft size={16} />
            </motion.button>
            <div>
              <h2 className="text-lg font-semibold text-white">AI Assistant</h2>
              <p className="text-sm text-gray-400">{session?.title || 'Code collaboration'}</p>
            </div>
          </div>
        </div>

        {/* Chat Messages - Fixed scrollbar implementation */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
          style={{
            scrollBehavior: 'smooth',
            overflowAnchor: 'auto',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(59, 130, 246, 0.7) rgba(255, 255, 255, 0.05)'
          }}
        >
          <style dangerouslySetInnerHTML={{
            __html: `
              .custom-scrollbar::-webkit-scrollbar {
                width: 12px;
              }
              .custom-scrollbar::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 6px;
                margin: 4px;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb {
                background: linear-gradient(180deg, rgba(59, 130, 246, 0.7), rgba(147, 51, 234, 0.7));
                border-radius: 6px;
                border: 2px solid rgba(255, 255, 255, 0.1);
                min-height: 20px;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: linear-gradient(180deg, rgba(59, 130, 246, 0.9), rgba(147, 51, 234, 0.9));
                border: 2px solid rgba(255, 255, 255, 0.2);
              }
              .custom-scrollbar::-webkit-scrollbar-thumb:active {
                background: linear-gradient(180deg, rgba(59, 130, 246, 1), rgba(147, 51, 234, 1));
              }
              .custom-scrollbar::-webkit-scrollbar-corner {
                background: rgba(255, 255, 255, 0.05);
              }
            `
          }} />
          
          <AnimatePresence>
            {chatMessages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={cn(
                  "p-3 rounded-lg max-w-[85%]",
                  message.type === 'user'
                    ? "ml-auto bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30"
                    : "mr-auto bg-gradient-to-r from-gray-800/40 to-slate-800/40 border border-white/10"
                )}
              >
                {/* Message Content - Truncated for code */}
                <div className="text-white text-sm whitespace-pre-wrap break-words">
                  {message.content.length > 300 && message.content.includes('```') ? (
                    <div>
                      <p>{message.content.substring(0, 150)}...</p>
                      <div className="mt-2 p-2 bg-black/30 rounded border border-white/10 flex items-center gap-2">
                        <File size={14} className="text-blue-400" />
                        <span className="text-xs text-gray-300">Code snippet (view in editor)</span>
                      </div>
                    </div>
                  ) : (
                    <p>{message.content}</p>
                  )}
                </div>
                
                {/* File Attachments Display */}
                {message.files && message.files.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {message.files.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-black/30 rounded border border-white/10">
                        <Paperclip size={12} className="text-green-400" />
                        <span className="text-xs text-gray-300 truncate">{file.name}</span>
                        <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)}KB)</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* GitHub Repository Display */}
                {message.githubRepo && (
                  <div className="mt-2 p-2 bg-black/30 rounded border border-white/10 flex items-center gap-2">
                    <Github size={14} className="text-purple-400" />
                    <span className="text-xs text-gray-300 truncate">{message.githubRepo}</span>
                  </div>
                )}
                
                <p className="text-xs text-gray-400 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mr-auto bg-gradient-to-r from-gray-800/40 to-slate-800/40 border border-white/10 p-3 rounded-lg max-w-[85%]"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                <span className="text-gray-400 text-sm ml-2">AI is thinking...</span>
              </div>
            </motion.div>
          )}
          
          {/* Invisible scroll target */}
          <div ref={messagesEndRef} className="h-1" />
        </div>

        {/* Chat Input */}
        <div className="p-4 border-t border-white/10 bg-gradient-to-r from-black/40 to-gray-900/40 backdrop-blur-sm">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask about the code..."
              className={cn(
                "flex-1 p-3 rounded-lg transition-all duration-300",
                "bg-gradient-to-r from-black/40 to-gray-900/40 backdrop-blur-sm",
                "border border-white/20 text-white placeholder:text-gray-400",
                "focus:outline-none focus:border-white/40 focus:from-black/60 focus:to-gray-900/60"
              )}
            />
            <motion.button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className={cn(
                "p-3 rounded-lg transition-all duration-300",
                "bg-gradient-to-r from-blue-600/20 to-purple-600/20",
                "border border-blue-500/30 text-white",
                "hover:from-blue-600/30 hover:to-purple-600/30",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              whileHover={{ scale: newMessage.trim() ? 1.05 : 1 }}
              whileTap={{ scale: newMessage.trim() ? 0.95 : 1 }}
            >
              <Send size={16} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Right Side - Code Editor */}
      <div className="flex-1 flex flex-col">
        {/* Editor Header */}
        <div className="p-4 border-b border-white/10 bg-gradient-to-r from-black/40 to-gray-900/40 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-white">Code Editor</h2>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-all duration-300",
                  "bg-gradient-to-r from-black/40 to-gray-900/40 backdrop-blur-sm",
                  "border border-white/20 text-white",
                  "focus:outline-none focus:border-white/40"
                )}
              >
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
                <option value="html">HTML</option>
                <option value="css">CSS</option>
                <option value="json">JSON</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <motion.button
                onClick={handleRunCode}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300",
                  "bg-gradient-to-r from-green-600/20 to-emerald-600/20",
                  "border border-green-500/30 text-white",
                  "hover:from-green-600/30 hover:to-emerald-600/30"
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Play size={16} />
                Run
              </motion.button>
              
              <motion.button
                onClick={handleSaveCode}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300",
                  "bg-gradient-to-r from-blue-600/20 to-cyan-600/20",
                  "border border-blue-500/30 text-white",
                  "hover:from-blue-600/30 hover:to-cyan-600/30"
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Save size={16} />
                Save
              </motion.button>
            </div>
          </div>
        </div>

        {/* Monaco Editor */}
        <div className="flex-1 relative">
          <Editor
            height="100%"
            language={language}
            value={code}
            onChange={(value) => setCode(value || '')}
            theme="vs-dark"
            options={{
              fontSize: 14,
              fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
              lineNumbers: 'on',
              roundedSelection: false,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              minimap: { enabled: true },
              wordWrap: 'on',
              tabSize: 2,
              insertSpaces: true,
              renderWhitespace: 'selection',
              bracketPairColorization: { enabled: true },
              guides: {
                bracketPairs: true,
                indentation: true
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}