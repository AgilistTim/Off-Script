"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useChatContext } from '../context/ChatContext';
import { MessageList } from '../components/ui/message-list';
import ChatCareerGuidance from '../components/career-guidance/ChatCareerGuidance';
import { 
  ArrowUp, 
  MessageCircle, 
  Plus, 
  Loader2, 
  Sparkles,
  Trash2,
  X,
  RefreshCw,
  Search,
  Target,
  PlayCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getVideoById, Video } from '../services/videoService';
import VideoCard from '../components/video/VideoCard';

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
    clearNewRecommendationsFlag,
    getRecommendedVideos,
    careerGuidance,
    careerGuidanceLoading,
    careerGuidanceError,
    generateCareerGuidance,
    refreshCareerGuidance
  } = useChatContext();
  
  const [newMessage, setNewMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showThreads, setShowThreads] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{threadId: string, title: string} | null>(null);
  const [recommendedVideos, setRecommendedVideos] = useState<Video[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'videos' | 'guidance'>('videos');
  const [showSidebar, setShowSidebar] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom of messages (only when not searching)
  useEffect(() => {
    if (!searchQuery) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, searchQuery]);
  
  // Create a new thread if none exists
  useEffect(() => {
    const initializeChat = async () => {
      if (currentUser && threads.length === 0 && !isLoading) {
        await createNewThread();
      }
    };
    
    initializeChat();
  }, [currentUser, threads.length, isLoading, createNewThread]);

  // Fetch recommended videos when new recommendations are available
  useEffect(() => {
    const fetchRecommendations = async () => {
      if (newRecommendations && currentUser) {
        setLoadingRecommendations(true);
        try {
          const videoIds = await getRecommendedVideos(4);
          const videos = await Promise.all(
            videoIds.map(async (id) => {
              const video = await getVideoById(id);
              return video;
            })
          );
          setRecommendedVideos(videos.filter(video => video !== null) as Video[]);
          setShowRecommendations(true);
        } catch (error) {
          console.error('Error fetching recommendations:', error);
        } finally {
          setLoadingRecommendations(false);
        }
      }
    };

    fetchRecommendations();
  }, [newRecommendations, currentUser, getRecommendedVideos]);

  // Auto-show career guidance when it becomes available
  useEffect(() => {
    if (careerGuidance && !showRecommendations) {
      setShowRecommendations(true);
      setSidebarTab('guidance');
    }
  }, [careerGuidance, showRecommendations]);
  
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

  const handleDismissRecommendations = () => {
    setShowRecommendations(false);
    clearNewRecommendationsFlag();
  };

  const handleRefreshRecommendations = async () => {
    if (!currentUser) return;
    
    setLoadingRecommendations(true);
    try {
      const videoIds = await getRecommendedVideos(4);
      const videos = await Promise.all(
        videoIds.map(async (id) => {
          const video = await getVideoById(id);
          return video;
        })
      );
      setRecommendedVideos(videos.filter(video => video !== null) as Video[]);
    } catch (error) {
      console.error('Error refreshing recommendations:', error);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const handleSearchToggle = () => {
    setShowSearch(!showSearch);
    if (showSearch) {
      setSearchQuery('');
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  // Filter messages based on search query
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) {
      return messages;
    }
    
    const query = searchQuery.toLowerCase();
    return messages.filter(message => 
      message.content.toLowerCase().includes(query)
    );
  }, [messages, searchQuery]);

  // Convert our message format to the format expected by MessageList
  const formattedMessages = (searchQuery ? filteredMessages : messages).map(msg => ({
    id: msg.id,
    role: msg.role as "user" | "assistant",
    content: msg.content,
    createdAt: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp)
  }));
  
  // Recommendation sidebar component
  const RecommendationSidebar = () => {
    if (!showRecommendations) return null;
    
    return (
      <>
        {/* Mobile overlay */}
        {showSidebar && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setShowSidebar(false)}
          />
        )}
        
        {/* Sidebar */}
        <div className={`
          ${showSidebar ? 'translate-x-0' : 'translate-x-full'} 
          md:translate-x-0 
          fixed md:relative 
          right-0 md:right-auto 
          top-0 md:top-auto 
          h-full md:h-auto 
          w-80 md:w-96 
          bg-white dark:bg-gray-800 
          border-l border-gray-200 dark:border-gray-700 
          flex flex-col 
          transition-transform duration-300 ease-in-out 
          z-50 md:z-auto
        `}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center mr-3">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Personalized Guidance
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Based on your conversation
                </p>
              </div>
            </div>
            <button
              onClick={handleDismissRecommendations}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Tab buttons */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setSidebarTab('videos')}
              className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                sidebarTab === 'videos'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              Videos
            </button>
            <button
              onClick={() => setSidebarTab('guidance')}
              className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                sidebarTab === 'guidance'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <Target className="h-4 w-4 mr-2" />
              Career Guide
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {sidebarTab === 'videos' ? (
            <div className="p-4">
              {loadingRecommendations ? (
                <div className="flex flex-col items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Loading recommendations...
                  </p>
                </div>
              ) : recommendedVideos.length > 0 ? (
                <div className="space-y-4">
                  {recommendedVideos.map((video) => (
                    <div key={video.id} className="transform hover:scale-105 transition-transform">
                      <VideoCard video={video} className="shadow-sm" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    No recommendations available yet. Continue chatting to get personalized suggestions!
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-2">
              {careerGuidance ? (
                <ChatCareerGuidance 
                  guidance={careerGuidance}
                  onRefresh={refreshCareerGuidance}
                  isLoading={careerGuidanceLoading}
                />
              ) : careerGuidanceLoading ? (
                <div className="flex flex-col items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Generating career guidance...
                  </p>
                </div>
              ) : careerGuidanceError ? (
                <div className="text-center py-8">
                  <p className="text-red-500 dark:text-red-400 mb-4">
                    {careerGuidanceError}
                  </p>
                  <button
                    onClick={generateCareerGuidance}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Continue chatting to generate personalized career guidance!
                  </p>
                  {currentSummary && (
                    <button
                      onClick={generateCareerGuidance}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Generate Career Guidance
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            {sidebarTab === 'videos' ? (
              <>
                <button
                  onClick={handleRefreshRecommendations}
                  disabled={loadingRecommendations}
                  className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </button>
                <Link
                  to="/dashboard"
                  className="flex-1 flex items-center justify-center px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
                  onClick={clearNewRecommendationsFlag}
                >
                  View All
                </Link>
              </>
            ) : (
              <>
                <button
                  onClick={refreshCareerGuidance}
                  disabled={careerGuidanceLoading}
                  className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Guide
                </button>
                <Link
                  to="/dashboard"
                  className="flex-1 flex items-center justify-center px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
                >
                  Dashboard
                </Link>
              </>
            )}
          </div>
        </div>
        </div>
      </>
    );
  };
  
  return (
    <div className="max-w-6xl mx-auto px-2 md:px-4 lg:px-0">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden min-h-[calc(100vh-120px)] md:min-h-[500px] h-[calc(100vh-120px)] md:h-[75vh] lg:h-[80vh] flex flex-col md:flex-row relative"
        style={{ 
          maxHeight: 'calc(100vh - 120px)',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        <div className="flex-1 flex flex-col min-h-0">
          {/* Chat header */}
          <div className="p-3 md:p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-between items-center flex-shrink-0">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg md:text-xl font-semibold text-gray-800 dark:text-white">
                AI Career Assistant
              </h1>
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 truncate">
                {currentThread ? currentThread.title : 'Ask questions, reflect on videos, or get help with career planning'}
              </p>
              {currentSummary && (
                <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Summary: {currentSummary.interests.length} interests, {currentSummary.skills.length} skills, {currentSummary.careerGoals.length} goals
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Search button */}
              <button
                onClick={handleSearchToggle}
                className={`p-2 rounded-lg transition-colors ${
                  showSearch 
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300'
                }`}
                title="Search messages"
              >
                <Search className="w-4 h-4" />
              </button>
              
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
              
              {/* Mobile sidebar toggle (only shown when recommendations are available) */}
              {showRecommendations && (
                <button
                  onClick={() => setShowSidebar(!showSidebar)}
                  className="md:hidden p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
                  title="Toggle guidance panel"
                >
                  <Sparkles className="w-4 h-4" />
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

          {/* Search bar */}
          {showSearch && (
            <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search messages..."
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {searchQuery && (
                <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {filteredMessages.length > 0 
                    ? `Found ${filteredMessages.length} message${filteredMessages.length !== 1 ? 's' : ''} matching "${searchQuery}"`
                    : `No messages found matching "${searchQuery}"`
                  }
                </div>
              )}
            </div>
          )}
          
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
          <div className="flex flex-col flex-1 min-h-0">
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-3 md:p-4 touch-pan-y overscroll-contain">
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
                <div>
                  <MessageList 
                    messages={formattedMessages}
                    isTyping={isTyping}
                    showTimeStamps={true}
                  />
                  {searchQuery && filteredMessages.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-500 dark:text-gray-400">
                        No messages found matching "{searchQuery}"
                      </p>
                    </div>
                  )}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Input area */}
            <div className="p-3 md:p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
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
                    className="w-full px-3 md:px-4 py-2 md:py-3 pr-10 md:pr-12 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-sm md:text-base"
                    style={{ fontSize: '16px' }}
                  />
                  
                  <button
                    type="submit"
                    disabled={isLoading || !newMessage.trim()}
                    className="absolute right-1 md:right-2 top-1/2 -translate-y-1/2 p-1.5 md:p-2 bg-blue-600 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                  >
                    <ArrowUp size={16} className="md:w-[18px] md:h-[18px]" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        
        {/* Recommendation sidebar */}
        <RecommendationSidebar />
      </motion.div>
    </div>
  );
};

export default AIChat;
