'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, MessageSquare, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface Session {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Fetch sessions when sidebar opens
  useEffect(() => {
    if (isOpen) {
      fetchSessions();
    }
  }, [isOpen]);

  const fetchSessions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      } else {
        console.error('Failed to fetch sessions');
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSessionClick = (sessionId: string) => {
    router.push(`/editor/${sessionId}`);
    onToggle(); // Close sidebar after navigation
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) {
        return `${diffInDays}d ago`;
      } else {
        return `${Math.floor(diffInDays / 7)}w ago`;
      }
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="fixed top-3 left-3 z-50 p-1.5 bg-black/30 backdrop-blur-sm hover:bg-black/50 text-white rounded-md transition-all duration-200 shadow-lg border border-white/10"
      >
        {isOpen ? <X size={16} /> : <Menu size={16} />}
      </button>

      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onToggle}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: -260 }}
            animate={{ x: 0 }}
            exit={{ x: -260 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 h-full w-64 bg-[radial-gradient(ellipse_at_bottom,_#262626_0%,_#000_100%)] text-white z-50 flex flex-col shadow-2xl border-r border-white/10 backdrop-blur-sm"
          >
            {/* Header - Developer Logo */}
            <div className="p-4 border-b border-white/10">
              <div className="text-center">
                <h1 className="text-lg font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Developer
                </h1>
                <div className="w-8 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent mx-auto mt-1.5 opacity-50"></div>
              </div>
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wide opacity-70">
                  History
                </h3>
                <button
                  onClick={fetchSessions}
                  className="text-xs text-gray-400 hover:text-white transition-colors"
                  disabled={isLoading}
                >
                  {isLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
              
              <div className="space-y-1.5">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  </div>
                ) : sessions.length > 0 ? (
                  sessions.map((session) => (
                    <motion.div
                      key={session.id}
                      whileHover={{ scale: 1.01, x: 2 }}
                      onClick={() => handleSessionClick(session.id)}
                      className="p-2 rounded-md bg-black/20 hover:bg-black/40 cursor-pointer transition-all duration-200 group border border-white/5 hover:border-white/10"
                    >
                      <div className="flex items-start gap-2">
                        <MessageSquare size={12} className="mt-0.5 text-gray-400 group-hover:text-white transition-colors flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white truncate group-hover:text-gray-100">
                            {session.title || 'Untitled Session'}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5 group-hover:text-gray-300">
                            {formatTimestamp(session.updatedAt)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare size={24} className="mx-auto text-gray-600 mb-2" />
                    <p className="text-xs text-gray-400">No sessions yet</p>
                    <p className="text-[10px] text-gray-500 mt-1">Start coding to create your first session</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer - Profile */}
            <div className="p-3 border-t border-white/10">
              <motion.button 
                whileHover={{ scale: 1.01 }}
                className="w-full flex items-center gap-2.5 p-2.5 text-gray-300 hover:text-white hover:bg-black/30 rounded-md transition-all duration-200 border border-white/5 hover:border-white/10"
              >
                <div className="w-6 h-6 bg-gradient-to-br from-gray-600 to-gray-800 rounded-full flex items-center justify-center flex-shrink-0">
                  <User size={12} />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-xs font-medium truncate">Profile</p>
                  <p className="text-[10px] text-gray-400 truncate">Manage account</p>
                </div>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}