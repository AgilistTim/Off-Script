import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Eye, 
  Download, 
  Calendar, 
  MessageCircle, 
  User, 
  Play, 
  Pause, 
  X,
  FileText,
  Volume2,
  RefreshCw,
  Clock,
  Activity
} from 'lucide-react';
import { elevenLabsAdminService, ConversationSummary, ConversationMessage } from '../../services/elevenLabsAdminService';
import { toast, Toaster } from 'react-hot-toast';

interface ConversationFilters {
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  messageRole?: 'user' | 'assistant' | '';
  hasCareerCards?: boolean | '';
  status?: 'active' | 'completed' | 'archived' | '';
}

const AdminConversations: React.FC = () => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filters, setFilters] = useState<ConversationFilters>({});
  const [selectedConversation, setSelectedConversation] = useState<ConversationSummary | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<ConversationMessage[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [loadingAudio, setLoadingAudio] = useState<boolean>(false);
  const [loadingTranscript, setLoadingTranscript] = useState<boolean>(false);
  const [exportingConversation, setExportingConversation] = useState<string | null>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const data = await elevenLabsAdminService.getAllConversations(100);
      setConversations(data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim() && Object.keys(filters).length === 0) {
      fetchConversations();
      return;
    }

    try {
      setLoading(true);
      const searchFilters = {
        ...filters,
        dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
        dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
        messageRole: filters.messageRole || undefined,
        hasCareerCards: filters.hasCareerCards === '' ? undefined : filters.hasCareerCards,
        status: filters.status || undefined
      };

      const data = await elevenLabsAdminService.searchConversations(searchTerm, searchFilters, 100);
      setConversations(data);
    } catch (error) {
      console.error('Error searching conversations:', error);
      toast.error('Failed to search conversations');
    } finally {
      setLoading(false);
    }
  };

  const handleViewConversation = async (conversation: ConversationSummary) => {
    setSelectedConversation(conversation);
    setShowDetailModal(true);
    setLoadingTranscript(true);
    setLoadingAudio(true);

    try {
      // Load transcript
      const transcriptData = await elevenLabsAdminService.getConversationTranscript(conversation.id);
      setTranscript(transcriptData);
    } catch (error) {
      console.error('Error loading transcript:', error);
      toast.error('Failed to load conversation transcript');
    } finally {
      setLoadingTranscript(false);
    }

    try {
      // Load audio if available
      if (conversation.hasAudio) {
        const audioResult = await elevenLabsAdminService.getConversationAudio(conversation.id);
        if (audioResult.success && audioResult.audioUrl) {
          setAudioUrl(audioResult.audioUrl);
        } else {
          console.warn('Audio not available:', audioResult.error);
        }
      }
    } catch (error) {
      console.error('Error loading audio:', error);
    } finally {
      setLoadingAudio(false);
    }
  };

  const handlePlayPauseAudio = () => {
    if (!audioUrl) return;

    if (!audioElement) {
      const audio = new Audio(audioUrl);
      audio.addEventListener('ended', () => setIsPlayingAudio(false));
      audio.addEventListener('error', () => {
        toast.error('Failed to play audio');
        setIsPlayingAudio(false);
      });
      setAudioElement(audio);
      audio.play();
      setIsPlayingAudio(true);
    } else {
      if (isPlayingAudio) {
        audioElement.pause();
        setIsPlayingAudio(false);
      } else {
        audioElement.play();
        setIsPlayingAudio(true);
      }
    }
  };

  const handleExportConversation = async (conversationId: string, userName: string) => {
    try {
      setExportingConversation(conversationId);
      const exportData = await elevenLabsAdminService.exportUserConversationData(
        selectedConversation?.userId || ''
      );
      
      // Filter to specific conversation
      const conversationData = {
        conversation: exportData.conversations.find(c => c.id === conversationId),
        messages: exportData.messages.filter(m => m.conversationId === conversationId),
        exportedAt: new Date().toISOString()
      };

      const dataStr = JSON.stringify(conversationData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `conversation-${userName}-${conversationId}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Conversation exported successfully');
    } catch (error) {
      console.error('Error exporting conversation:', error);
      toast.error('Failed to export conversation');
    } finally {
      setExportingConversation(null);
    }
  };

  const closeModal = () => {
    setShowDetailModal(false);
    setSelectedConversation(null);
    setTranscript([]);
    setAudioUrl(null);
    setIsPlayingAudio(false);
    if (audioElement) {
      audioElement.pause();
      setAudioElement(null);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (messageCount: number) => {
    // Rough estimate: 1 message = ~30 seconds
    const minutes = Math.round(messageCount * 0.5);
    return `~${minutes}min`;
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Conversation Management</h1>
        <button
          onClick={fetchConversations}
          className="flex items-center px-4 py-2 bg-primary-blue text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          <RefreshCw size={18} className="mr-2" />
          Refresh
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          
          <select
            value={filters.status || ''}
            onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>

          <select
            value={filters.messageRole || ''}
            onChange={(e) => setFilters({ ...filters, messageRole: e.target.value as any })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Messages</option>
            <option value="user">User Messages</option>
            <option value="assistant">Assistant Messages</option>
          </select>

          <div className="flex space-x-2">
            <input
              type="date"
              value={filters.dateFrom || ''}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="From"
            />
            <input
              type="date"
              value={filters.dateTo || ''}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="To"
            />
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.hasCareerCards === true}
                onChange={(e) => setFilters({ 
                  ...filters, 
                  hasCareerCards: e.target.checked ? true : '' 
                })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Has Career Cards</span>
            </label>
          </div>
          
          <button
            onClick={handleSearch}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Filter size={18} className="mr-2" />
            Search
          </button>
        </div>
      </div>

      {/* Conversations List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        {loading ? (
          <div className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-center space-x-4 p-4">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                    <div className="w-20 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : conversations.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {conversations.map((conversation) => (
              <div key={conversation.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <User size={20} className="text-white" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-medium text-gray-800 dark:text-white">
                          {conversation.userName || 'Unknown User'}
                        </h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          conversation.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          conversation.status === 'completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                        }`}>
                          {conversation.status}
                        </span>
                        {conversation.hasAudio && (
                          <Volume2 size={16} className="text-blue-500" />
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {conversation.userEmail}
                      </p>
                      
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center">
                          <MessageCircle size={14} className="mr-1" />
                          {conversation.messageCount} messages
                        </span>
                        <span className="flex items-center">
                          <FileText size={14} className="mr-1" />
                          {conversation.careerCardsGenerated || 0} cards
                        </span>
                        <span className="flex items-center">
                          <Clock size={14} className="mr-1" />
                          {formatDuration(conversation.messageCount)}
                        </span>
                        <span className="flex items-center">
                          <Calendar size={14} className="mr-1" />
                          {formatDate(conversation.updatedAt)}
                        </span>
                      </div>
                      
                      {conversation.lastMessage && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 truncate">
                          <span className="font-medium">
                            {conversation.lastMessageRole === 'user' ? 'User: ' : 'Assistant: '}
                          </span>
                          {conversation.lastMessage}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleViewConversation(conversation)}
                      className="flex items-center px-3 py-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      title="View Details"
                    >
                      <Eye size={16} className="mr-1" />
                      View
                    </button>
                    
                    <button
                      onClick={() => handleExportConversation(conversation.id, conversation.userName || 'user')}
                      className="flex items-center px-3 py-2 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                      title="Export"
                      disabled={exportingConversation === conversation.id}
                    >
                      {exportingConversation === conversation.id ? (
                        <RefreshCw size={16} className="mr-1 animate-spin" />
                      ) : (
                        <Download size={16} className="mr-1" />
                      )}
                      Export
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <MessageCircle size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No conversations found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Conversation Detail Modal */}
      {showDetailModal && selectedConversation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                  Conversation Details
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedConversation.userName} • {formatDate(selectedConversation.createdAt)}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {audioUrl && (
                  <button
                    onClick={handlePlayPauseAudio}
                    className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    disabled={loadingAudio}
                  >
                    {loadingAudio ? (
                      <RefreshCw size={16} className="mr-2 animate-spin" />
                    ) : isPlayingAudio ? (
                      <Pause size={16} className="mr-2" />
                    ) : (
                      <Play size={16} className="mr-2" />
                    )}
                    {loadingAudio ? 'Loading...' : isPlayingAudio ? 'Pause' : 'Play'}
                  </button>
                )}
                <button
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {loadingTranscript ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw size={32} className="animate-spin text-gray-400" />
                  <span className="ml-3 text-gray-500">Loading transcript...</span>
                </div>
              ) : transcript.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-white">Conversation Transcript</h3>
                    <span className="text-sm text-gray-500">{transcript.length} messages</span>
                  </div>
                  
                  <div className="space-y-3">
                    {transcript.map((message, index) => (
                      <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.role === 'user' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white'
                        }`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs opacity-75">
                              {message.role === 'user' ? 'User' : 'Assistant'}
                            </span>
                            <span className="text-xs opacity-75">
                              {formatDate(message.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm">{message.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No transcript available for this conversation.</p>
                </div>
              )}
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => handleExportConversation(selectedConversation.id, selectedConversation.userName || 'user')}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  disabled={exportingConversation === selectedConversation.id}
                >
                  {exportingConversation === selectedConversation.id ? (
                    <RefreshCw size={16} className="mr-2 animate-spin" />
                  ) : (
                    <Download size={16} className="mr-2" />
                  )}
                  Export
                </button>
                <button
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminConversations;
