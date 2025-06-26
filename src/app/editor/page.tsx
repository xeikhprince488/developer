'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Editor } from '@monaco-editor/react';
import { cn } from '@/lib/utils';
import { Send, ArrowLeft, Play, Save } from 'lucide-react';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  files?: File[];
  githubRepo?: string;
}

function EditorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Get initial data from URL params
  useEffect(() => {
    const initialCode = searchParams.get('code') || '';
    const initialLang = searchParams.get('language') || 'javascript';
    const userInput = searchParams.get('input') || '';
    
    setCode(initialCode);
    setLanguage(initialLang);
    
    if (userInput) {
      setChatMessages([{
        id: Date.now().toString(),
        type: 'user',
        content: userInput,
        timestamp: new Date()
      }]);
    }
  }, [searchParams]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: newMessage,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsLoading(true);
    
    // Simulate AI response
    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `I'll help you with that code. Here's what I suggest...`,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleRunCode = () => {
    console.log('Running code:', code);
    // Add code execution logic here
  };

  const handleSaveCode = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code.${language === 'javascript' ? 'js' : language}`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
              <p className="text-sm text-gray-400">Code collaboration</p>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                <p className="text-white text-sm">{message.content}</p>
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

export default function EditorPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <div className="text-white">Loading editor...</div>
      </div>
    }>
      <EditorContent />
    </Suspense>
  );
}