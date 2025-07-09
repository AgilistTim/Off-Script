"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useChatContext } from '../context/ChatContext';
import { MessageList } from '../components/ui/message-list';
import { 
  ArrowUp, 
  MessageCircle, 
  Plus, 
  Loader2, 
  Sparkles,
  Trash2,
  X,
  RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';

const AIChat: React.FC = () => {
  const { currentUser } = useAuth();
  const { 
    currentThread, 
    messages, 
    threads, 
    isLoading, 
    isTyping, 
    sendMessage, 
    createNewThread, 
    selectThread, 
    deleteThread,
    currentSummary,
    regenerateSummary,
    newRecommendations,
    clearNewRecommendationsFlag
  } = useChatContext();
  
  const [newMessage, setNewMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showThreads, setShowThreads] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{threadId: string, title: string} | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Create a new thread if none exists
  useEffect(() => {
    const initializeChat = async () => {
      if (currentUser && threads.length === 0 && !isLoading) {
        await createNewThread();
      }
    };
    
    initializeChat();
  }, [currentUser, threads.length, isLoading, createNewThread]);
  
  // Handle sending a new message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    if (!newMessage.trim()) return;
    
    try {
      // Clear the input field immediately for better UX
      const messageToSend = newMessage;
      setNewMessage('');
      await sendMessage(messageToSend);
    } catch (error) {
      console.error('Error sending message:', error);
      // Show error toast or message to user
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to send message'}`);
    }
  };
  
  // Toggle voice recording (placeholder functionality)
  const toggleRecording = () => {
    setIsRecording(!isRecording);
    
    // If turning off recording, simulate sending a voice message
    if (isRecording) {
      setNewMessage('This is a simulated voice message');
      setTimeout(() => {
        handleSendMessage();
      }, 500);
    }
  };
  
  // Handle thread selection
  const handleThreadSelect = async (threadId: string) => {
    await selectThread(threadId);
    setShowThreads(false);
  };
  
  // Create a new thread
  const handleNewThread = async () => {
    await createNewThread();
    setShowThreads(false);
  };

  const handleDeleteThread = async (threadId: string, title: string) => {
    setDeleteConfirmation({ threadId, title });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation) return;
    
    try {
      await deleteThread(deleteConfirmation.threadId);
      setDeleteConfirmation(null);
      setShowThreads(false); // Close the dropdown after deletion
    } catch (error) {
      console.error('Error deleting thread:', error);
      // Could add error toast here
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmation(null);
  };

  // Convert our message format to the format expected by MessageList
  const formattedMessages = messages.map(msg => ({
    id: msg.id,
    role: msg.role as "user" | "assistant",
    content: msg.content,
    createdAt: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp)
  }));
  
  // Recommendation notification component
  const RecommendationNotification = () => {
    if (!newRecommendations) return null;
    
    return (
      <div className="fixed bottom-6 right-6 max-w-sm z-[100]">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-5 border border-gray-200 dark:border-gray-600 animate-slide-in-bottom">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              <div className="w-8 h-8 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="ml-3 w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                🎯 New recommendations available!
              </p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Check your dashboard for personalized video suggestions based on your conversation.
              </p>
              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <Link
                  to="/dashboard"
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                  onClick={clearNewRecommendationsFlag}
                >
                  View Recommendations
                </Link>
                <button
                  type="button"
                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                  onClick={clearNewRecommendationsFlag}
                >
                  Dismiss
                </button>
              </div>
            </div>
            <div className="ml-2">
              <button
                type="button"
                className="inline-flex rounded-md text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={clearNewRecommendationsFlag}
              >
                <span className="sr-only">Close</span>
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden h-[70vh] flex flex-col relative"
      >
        {/* Chat header */}
        <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
              AI Career Assistant
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {currentThread ? currentThread.title : 'Ask questions, reflect on videos, or get help with career planning'}
            </p>
            {currentSummary && (
              <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                Summary: {currentSummary.interests.length} interests, {currentSummary.skills.length} skills, {currentSummary.careerGoals.length} goals
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Regenerate summary button */}
            {currentThread && messages.length > 0 && (
              <button
                onClick={regenerateSummary}
                disabled={isLoading}
                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50"
                title="Regenerate summary from conversation"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            
            {/* Thread selection button */}
            <button 
              onClick={() => setShowThreads(!showThreads)}
              className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <MessageCircle size={20} />
            </button>
          </div>
        </div>
        
        {/* Thread selection dropdown */}
        {showThreads && (
          <div className="absolute top-16 right-4 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 max-h-80 overflow-y-auto">
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={handleNewThread}
                className="w-full p-2 flex items-center text-left rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Plus size={18} className="mr-2 text-blue-500" />
                <span>New Conversation</span>
              </button>
            </div>
            
            <div className="p-2">
              {threads.length > 0 ? (
                threads.map(thread => (
                  <div key={thread.id} className="group relative">
                    <button
                      onClick={() => handleThreadSelect(thread.id)}
                      className={`w-full p-2 mb-1 flex flex-col text-left rounded-md pr-8 ${
                        currentThread?.id === thread.id 
                          ? 'bg-blue-50 dark:bg-blue-900/30' 
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className="font-medium truncate">{thread.title}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {thread.lastMessage || 'No messages'}
                      </span>
                    </button>
                    
                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteThread(thread.id, thread.title);
                      }}
                      className="absolute top-1/2 -translate-y-1/2 right-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                      title="Delete conversation"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 p-2">
                  No conversations yet
                </p>
              )}
            </div>
          </div>
        )}

        {/* Delete confirmation dialog */}
        {deleteConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Delete Conversation
                  </h3>
                </div>
              </div>
              
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Are you sure you want to delete "{deleteConfirmation.title}"? This will permanently remove the conversation, all messages, summary data, and any associated recommendations. This action cannot be undone.
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelDelete}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Loading state */}
        {isLoading && !messages.length && (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center">
              <Loader2 size={40} className="text-blue-500 animate-spin mb-2" />
              <p className="text-gray-600 dark:text-gray-300">Loading conversation...</p>
            </div>
          </div>
        )}
        
        {/* Chat container */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full mb-4">
                  <MessageCircle size={32} className="text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
                  Welcome to AI Career Assistant
                </h3>
                <p className="text-gray-600 dark:text-gray-300 max-w-md">
                  I'm here to help you explore career options and reflect on what you've learned from videos.
                  Ask me anything about different career paths, discuss your interests and skills, or get help
                  creating reports to share with parents or educators.
                </p>
              </div>
            ) : (
              <MessageList 
                messages={formattedMessages}
                isTyping={isTyping}
                showTimeStamps={true}
              />
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input area */}
          <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <form 
              className="flex items-center"
              onSubmit={handleSendMessage}
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={isLoading}
                  placeholder="Type your message..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="w-full px-4 py-3 pr-12 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
                
                <button
                  type="submit"
                  disabled={isLoading || !newMessage.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                >
                  <ArrowUp size={18} />
                </button>
              </div>
            </form>
          </div>
        </div>
      </motion.div>
      
      {/* Recommendation notification */}
      <RecommendationNotification />
    </div>
  );
};

export default AIChat;
