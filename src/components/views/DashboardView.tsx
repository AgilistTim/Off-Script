import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useChatContext } from '../../context/ChatContext';
import { 
  Search, 
  Filter, 
  Calendar, 
  TrendingUp, 
  MessageSquare, 
  Clock,
  Star,
  BarChart3,
  Target
} from 'lucide-react';
import { cn } from '../../lib/utils';

// Import UI components
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface DashboardViewProps {
  className?: string;
}

interface ConversationSummary {
  id: string;
  title: string;
  date: Date;
  messageCount: number;
  duration: number;
  keyTopics: string[];
  careerInsights: string[];
  personaType: string;
  lastMessage: string;
}

interface CareerMetrics {
  totalConversations: number;
  averageSessionTime: number;
  topInterests: string[];
  skillsDiscovered: string[];
  careerPathsExplored: string[];
  progressScore: number;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ className }) => {
  const { currentUser } = useAuth();
  const { messages } = useChatContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'recent' | 'favorites'>('all');
  const [conversationHistory, setConversationHistory] = useState<ConversationSummary[]>([]);
  const [careerMetrics, setCareerMetrics] = useState<CareerMetrics | null>(null);

  // Mock data for demonstration - replace with real data
  useEffect(() => {
    // This would fetch real conversation history from Firebase
    const mockConversations: ConversationSummary[] = [
      {
        id: '1',
        title: 'Career Exploration Session',
        date: new Date(2025, 0, 15),
        messageCount: 24,
        duration: 12,
        keyTopics: ['UX Design', 'Tech Industry', 'Portfolio Building'],
        careerInsights: ['Strong analytical skills', 'Interest in user psychology'],
        personaType: 'curious_achiever',
        lastMessage: 'Thanks for helping me understand the UX design field better!'
      },
      {
        id: '2', 
        title: 'Skill Gap Analysis',
        date: new Date(2025, 0, 14),
        messageCount: 18,
        duration: 8,
        keyTopics: ['JavaScript', 'React', 'Frontend Development'],
        careerInsights: ['Technical aptitude', 'Self-directed learning'],
        personaType: 'skeptical_pragmatist',
        lastMessage: 'What specific projects should I build to showcase these skills?'
      },
      {
        id: '3',
        title: 'Networking Strategy',
        date: new Date(2025, 0, 12),
        messageCount: 15,
        duration: 6,
        keyTopics: ['LinkedIn', 'Professional Connections', 'Industry Events'],
        careerInsights: ['Introvert networking approach', 'Value authenticity'],
        personaType: 'overwhelmed_explorer',
        lastMessage: 'These networking tips feel much more manageable now.'
      }
    ];

    const mockMetrics: CareerMetrics = {
      totalConversations: 3,
      averageSessionTime: 8.7,
      topInterests: ['UX Design', 'Frontend Development', 'Tech Industry'],
      skillsDiscovered: ['JavaScript', 'User Research', 'Portfolio Development'],
      careerPathsExplored: ['UX Designer', 'Frontend Developer', 'Product Manager'],
      progressScore: 78
    };

    setConversationHistory(mockConversations);
    setCareerMetrics(mockMetrics);
  }, []);

  const filteredConversations = conversationHistory.filter(conv => {
    const matchesSearch = conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         conv.keyTopics.some(topic => topic.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (selectedFilter === 'recent') {
      const isRecent = (Date.now() - conv.date.getTime()) < (7 * 24 * 60 * 60 * 1000); // 7 days
      return matchesSearch && isRecent;
    }
    
    return matchesSearch;
  });

  const getPersonaColor = (personaType: string) => {
    switch (personaType) {
      case 'curious_achiever': return 'from-green-500 to-emerald-500';
      case 'skeptical_pragmatist': return 'from-blue-500 to-cyan-500';
      case 'overwhelmed_explorer': return 'from-purple-500 to-pink-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getPersonaLabel = (personaType: string) => {
    switch (personaType) {
      case 'curious_achiever': return 'Goal-Oriented';
      case 'skeptical_pragmatist': return 'Detail-Focused'; 
      case 'overwhelmed_explorer': return 'Exploring Options';
      default: return 'Getting Started';
    }
  };

  return (
    <div className={cn("h-full bg-gray-50 overflow-auto", className)}>
      <div className="p-4 max-w-4xl mx-auto space-y-6">
        
        {/* Career Progress Overview */}
        {careerMetrics && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-6 bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Your Career Journey</h2>
                <div className="flex items-center">
                  <Target className="w-5 h-5 mr-2" />
                  <span className="text-sm font-medium">{careerMetrics.progressScore}% Complete</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{careerMetrics.totalConversations}</div>
                  <div className="text-white/80 text-sm">Sessions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{careerMetrics.averageSessionTime}m</div>
                  <div className="text-white/80 text-sm">Avg Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{careerMetrics.skillsDiscovered.length}</div>
                  <div className="text-white/80 text-sm">Skills Found</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{careerMetrics.careerPathsExplored.length}</div>
                  <div className="text-white/80 text-sm">Paths Explored</div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Quick Insights */}
        {careerMetrics && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <Card className="p-4">
              <div className="flex items-center mb-3">
                <TrendingUp className="w-5 h-5 text-blue-500 mr-2" />
                <h3 className="font-semibold text-gray-900">Top Interests</h3>
              </div>
              <div className="space-y-2">
                {careerMetrics.topInterests.slice(0, 3).map((interest, index) => (
                  <div key={interest} className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-700">{interest}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center mb-3">
                <Star className="w-5 h-5 text-yellow-500 mr-2" />
                <h3 className="font-semibold text-gray-900">Skills Discovered</h3>
              </div>
              <div className="space-y-2">
                {careerMetrics.skillsDiscovered.slice(0, 3).map((skill, index) => (
                  <div key={skill} className="flex items-center">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-700">{skill}</span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Search and Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search conversations, topics, or insights..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={selectedFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedFilter('all')}
            >
              All
            </Button>
            <Button
              variant={selectedFilter === 'recent' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedFilter('recent')}
            >
              Recent
            </Button>
            <Button
              variant={selectedFilter === 'favorites' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedFilter('favorites')}
            >
              <Star className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>

        {/* Conversation History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="space-y-4"
        >
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <MessageSquare className="w-5 h-5 mr-2" />
            Conversation History
          </h3>

          {filteredConversations.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="text-gray-500">
                {searchQuery ? 'No conversations found matching your search.' : 'No conversations yet. Start chatting to see your history here!'}
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredConversations.map((conversation, index) => (
                <motion.div
                  key={conversation.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                >
                  <Card className="p-4 hover:shadow-lg transition-all duration-200 cursor-pointer">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">{conversation.title}</h4>
                        <div className="flex items-center text-sm text-gray-500 space-x-4">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {conversation.date.toLocaleDateString()}
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {conversation.duration}m
                          </div>
                          <div className="flex items-center">
                            <MessageSquare className="w-4 h-4 mr-1" />
                            {conversation.messageCount}
                          </div>
                        </div>
                      </div>
                      
                      <div className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium text-white",
                        "bg-gradient-to-r", getPersonaColor(conversation.personaType)
                      )}>
                        {getPersonaLabel(conversation.personaType)}
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="text-sm text-gray-600 overflow-hidden text-ellipsis" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        "{conversation.lastMessage}"
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {conversation.keyTopics.slice(0, 3).map((topic) => (
                        <span
                          key={topic}
                          className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>

                    {conversation.careerInsights.length > 0 && (
                      <div className="border-t pt-3">
                        <div className="text-xs font-medium text-gray-500 mb-1">Key Insights:</div>
                        <div className="flex flex-wrap gap-1">
                          {conversation.careerInsights.slice(0, 2).map((insight) => (
                            <span
                              key={insight}
                              className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-md"
                            >
                              {insight}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}; 