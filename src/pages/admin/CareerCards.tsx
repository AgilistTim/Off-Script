import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Eye, 
  Download, 
  Calendar, 
  User, 
  Briefcase,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  RefreshCw,
  Star,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Users,
  Target,
  Zap,
  Globe,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MapPin,
  DollarSign,
  Clock,
  Award
} from 'lucide-react';
import { collection, query, getDocs, orderBy, limit, where, collectionGroup } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { CareerCard } from '../../types/careerCard';
import { toast, Toaster } from 'react-hot-toast';

interface CareerCardWithMetadata extends CareerCard {
  userId?: string;
  userName?: string;
  userEmail?: string;
  collection: 'threadCareerGuidance' | 'careerExplorations';
  pathwayType: 'primary' | 'alternative';
  pathwayIndex?: number;
  threadId?: string;
  createdAt: Date;
  updatedAt: Date;
  // Enhanced data fields that may be merged from enhancedCareerCards
  enhancedSalary?: any;
  careerProgression?: any[];
  dayInTheLife?: any;
  industryTrends?: any[];
  topUKEmployers?: any[];
  professionalTestimonials?: any[];
  additionalQualifications?: any[];
  workLifeBalance?: any;
  inDemandSkills?: any[];
  professionalAssociations?: any[];
  enhancedSources?: string[];
  isEnhanced?: boolean;
  enhancedAt?: Date | string;
  enhancementSource?: string;
  enhancementStatus?: string;
}

interface CareerFilters {
  userId?: string;
  industry?: string;
  confidenceMin?: number;
  confidenceMax?: number;
  enhancementStatus?: 'enhanced' | 'not_enhanced' | 'all';
  hasPerplexityData?: boolean;
  salaryMin?: number;
  salaryMax?: number;
  dateFrom?: string;
  dateTo?: string;
  collection?: 'all' | 'threadCareerGuidance' | 'careerExplorations';
}

interface CareerAnalytics {
  totalCards: number;
  enhancedCards: number;
  topIndustries: Array<{ industry: string; count: number; percentage: number }>;
  averageConfidence: number;
  salaryDistribution: Array<{ range: string; count: number }>;
  creationTrends: Array<{ date: string; count: number }>;
  enhancementRate: number;
  userEngagement: Array<{ userId: string; userName: string; cardsCount: number }>;
}

const AdminCareerCards: React.FC = () => {
  const [careerCards, setCareerCards] = useState<CareerCardWithMetadata[]>([]);
  const [filteredCards, setFilteredCards] = useState<CareerCardWithMetadata[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filters, setFilters] = useState<CareerFilters>({});
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [showAnalytics, setShowAnalytics] = useState<boolean>(false);
  const [analytics, setAnalytics] = useState<CareerAnalytics | null>(null);
  const [selectedCard, setSelectedCard] = useState<CareerCardWithMetadata | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [bulkOperationLoading, setBulkOperationLoading] = useState<boolean>(false);
  const [sortField, setSortField] = useState<'createdAt' | 'confidence' | 'title'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchCareerCards();
  }, []);

  useEffect(() => {
    filterAndSortCards();
  }, [careerCards, searchTerm, filters, sortField, sortDirection]);

  const mergeEnhancedData = async (cards: CareerCardWithMetadata[]) => {
    try {
      // Get all enhanced career cards
      const enhancedCareerCardsRef = collection(db, 'enhancedCareerCards');
      const enhancedSnapshot = await getDocs(enhancedCareerCardsRef);
      
      // Create a map of enhanced data keyed by career title (normalized)
      const enhancedDataMap = new Map<string, any>();
      
      enhancedSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.careerTitle && data.enhancedData) {
          const normalizedTitle = data.careerTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
          enhancedDataMap.set(normalizedTitle, {
            id: doc.id,
            ...data,
            enhancedData: data.enhancedData
          });
        }
      });
      
      // Merge enhanced data with cards
      cards.forEach(card => {
        if (card.title) {
          const normalizedCardTitle = card.title.toLowerCase().replace(/[^a-z0-9]/g, '');
          const enhancedData = enhancedDataMap.get(normalizedCardTitle);
          
          if (enhancedData && enhancedData.enhancedData) {
            // Extract enhanced fields from the enhancedData object
            const enhanced = enhancedData.enhancedData;
            
            // Merge enhanced fields into the card
            Object.assign(card, {
              isEnhanced: true,
              enhancedAt: enhancedData.createdAt,
              enhancementSource: enhancedData.source || 'perplexity',
              enhancementStatus: 'enhanced',
              
              // Add enhanced fields if they exist
              ...(enhanced.enhancedSalary && { enhancedSalary: enhanced.enhancedSalary }),
              ...(enhanced.careerProgression && { careerProgression: enhanced.careerProgression }),
              ...(enhanced.dayInTheLife && { dayInTheLife: enhanced.dayInTheLife }),
              ...(enhanced.industryTrends && { industryTrends: enhanced.industryTrends }),
              ...(enhanced.topUKEmployers && { topUKEmployers: enhanced.topUKEmployers }),
              ...(enhanced.professionalTestimonials && { professionalTestimonials: enhanced.professionalTestimonials }),
              ...(enhanced.additionalQualifications && { additionalQualifications: enhanced.additionalQualifications }),
              ...(enhanced.workLifeBalance && { workLifeBalance: enhanced.workLifeBalance }),
              ...(enhanced.inDemandSkills && { inDemandSkills: enhanced.inDemandSkills }),
              ...(enhanced.professionalAssociations && { professionalAssociations: enhanced.professionalAssociations }),
              ...(enhanced.enhancedSources && { enhancedSources: enhanced.enhancedSources }),
              
              // Also try direct fields in case they're stored at the top level
              ...(enhanced.salaryData && { enhancedSalary: enhanced.salaryData }),
              ...(enhanced.skills && { inDemandSkills: enhanced.skills }),
              ...(enhanced.employers && { topUKEmployers: enhanced.employers }),
              ...(enhanced.qualifications && { additionalQualifications: enhanced.qualifications }),
              ...(enhanced.associations && { professionalAssociations: enhanced.associations }),
              ...(enhanced.testimonials && { professionalTestimonials: enhanced.testimonials }),
              ...(enhanced.trends && { industryTrends: enhanced.trends }),
              ...(enhanced.progression && { careerProgression: enhanced.progression }),
              ...(enhanced.workLife && { workLifeBalance: enhanced.workLife }),
              ...(enhanced.sources && { enhancedSources: enhanced.sources })
            });
            
            console.log(`✅ Merged enhanced data for: ${card.title}`, {
              hasEnhancedSalary: !!card.enhancedSalary,
              hasCareerProgression: !!card.careerProgression,
              hasDayInTheLife: !!card.dayInTheLife,
              hasInDemandSkills: !!card.inDemandSkills,
              hasEnhancedSources: !!card.enhancedSources
            });
          }
        }
      });
      
    } catch (error) {
      console.error('Error merging enhanced data:', error);
    }
  };

  const fetchCareerCards = async () => {
    try {
      setLoading(true);
      const allCards: CareerCardWithMetadata[] = [];
      
      // Fetch from threadCareerGuidance collection
      const threadGuidanceRef = collection(db, 'threadCareerGuidance');
      const threadGuidanceSnapshot = await getDocs(query(threadGuidanceRef, orderBy('createdAt', 'desc'), limit(500)));
      
      for (const doc of threadGuidanceSnapshot.docs) {
        const data = doc.data();
        if (data.guidance?.primaryPathway) {
          const card: CareerCardWithMetadata = {
            ...data.guidance.primaryPathway,
            id: `thread_${doc.id}_primary`,
            userId: data.userId,
            userName: data.userName || 'Unknown User',
            userEmail: data.userEmail,
            collection: 'threadCareerGuidance',
            pathwayType: 'primary',
            threadId: data.threadId,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          };
          allCards.push(card);
        }
        
        if (data.guidance?.alternativePathways) {
          data.guidance.alternativePathways.forEach((pathway: any, index: number) => {
            const card: CareerCardWithMetadata = {
              ...pathway,
              id: `thread_${doc.id}_alt_${index}`,
              userId: data.userId,
              userName: data.userName || 'Unknown User',
              userEmail: data.userEmail,
              collection: 'threadCareerGuidance',
              pathwayType: 'alternative',
              pathwayIndex: index,
              threadId: data.threadId,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date()
            };
            allCards.push(card);
          });
        }
      }
      
      // Fetch from careerExplorations collection (migrated guest data)
      const careerExplorationsRef = collection(db, 'careerExplorations');
      const careerExplorationsSnapshot = await getDocs(query(careerExplorationsRef, orderBy('createdAt', 'desc'), limit(500)));
      
      for (const doc of careerExplorationsSnapshot.docs) {
        const data = doc.data();
        if (data.careerCards) {
          data.careerCards.forEach((pathway: any, index: number) => {
            const card: CareerCardWithMetadata = {
              ...pathway,
              id: `exploration_${doc.id}_career_${index}`,
              userId: data.userId,
              userName: data.guestName || data.userName || 'Guest User',
              userEmail: data.userEmail || 'guest@example.com',
              collection: 'careerExplorations',
              pathwayType: index === 0 ? 'primary' : 'alternative',
              pathwayIndex: index,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date()
            };
            allCards.push(card);
          });
        }
      }
      
      // Merge enhanced data from enhancedCareerCards collection
      await mergeEnhancedData(allCards);
      
      setCareerCards(allCards);
      generateAnalytics(allCards);
    } catch (error) {
      console.error('Error fetching career cards:', error);
      toast.error('Failed to load career cards');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortCards = () => {
    let filtered = [...careerCards];
    
    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(card =>
        card.title?.toLowerCase().includes(term) ||
        card.description?.toLowerCase().includes(term) ||
        card.industry?.toLowerCase().includes(term) ||
        card.userName?.toLowerCase().includes(term) ||
        card.userEmail?.toLowerCase().includes(term)
      );
    }
    
    // Apply filters
    if (filters.userId) {
      filtered = filtered.filter(card => card.userId === filters.userId);
    }
    
    if (filters.industry) {
      filtered = filtered.filter(card => card.industry === filters.industry);
    }
    
    if (filters.confidenceMin !== undefined) {
      filtered = filtered.filter(card => (card.confidence || 0) >= filters.confidenceMin!);
    }
    
    if (filters.confidenceMax !== undefined) {
      filtered = filtered.filter(card => (card.confidence || 0) <= filters.confidenceMax!);
    }
    
    if (filters.enhancementStatus && filters.enhancementStatus !== 'all') {
      if (filters.enhancementStatus === 'enhanced') {
        filtered = filtered.filter(card => card.enhancement?.status === 'completed');
      } else {
        filtered = filtered.filter(card => !card.enhancement || card.enhancement.status !== 'completed');
      }
    }
    
    if (filters.hasPerplexityData) {
      filtered = filtered.filter(card => !!card.perplexityData);
    }
    
    if (filters.collection && filters.collection !== 'all') {
      filtered = filtered.filter(card => card.collection === filters.collection);
    }
    
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(card => card.createdAt >= fromDate);
    }
    
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(card => card.createdAt <= toDate);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let valueA: any, valueB: any;
      
      switch (sortField) {
        case 'confidence':
          valueA = a.confidence || 0;
          valueB = b.confidence || 0;
          break;
        case 'title':
          valueA = a.title || '';
          valueB = b.title || '';
          break;
        case 'createdAt':
        default:
          valueA = a.createdAt;
          valueB = b.createdAt;
      }
      
      if (sortDirection === 'desc') {
        return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
      } else {
        return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      }
    });
    
    setFilteredCards(filtered);
  };

  const generateAnalytics = (cards: CareerCardWithMetadata[]) => {
    const totalCards = cards.length;
    const enhancedCards = cards.filter(card => card.enhancement?.status === 'completed').length;
    
    // Industry distribution
    const industryCount = new Map<string, number>();
    cards.forEach(card => {
      if (card.industry) {
        industryCount.set(card.industry, (industryCount.get(card.industry) || 0) + 1);
      }
    });
    
    const topIndustries = Array.from(industryCount.entries())
      .map(([industry, count]) => ({
        industry,
        count,
        percentage: (count / totalCards) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Average confidence
    const totalConfidence = cards.reduce((sum, card) => sum + (card.confidence || 0), 0);
    const averageConfidence = totalCards > 0 ? totalConfidence / totalCards : 0;
    
    // User engagement
    const userCardCount = new Map<string, { name: string; email: string; count: number }>();
    cards.forEach(card => {
      if (card.userId) {
        const existing = userCardCount.get(card.userId) || { name: card.userName || '', email: card.userEmail || '', count: 0 };
        userCardCount.set(card.userId, { ...existing, count: existing.count + 1 });
      }
    });
    
    const userEngagement = Array.from(userCardCount.entries())
      .map(([userId, data]) => ({
        userId,
        userName: data.name,
        cardsCount: data.count
      }))
      .sort((a, b) => b.cardsCount - a.cardsCount)
      .slice(0, 10);
    
    // Creation trends (last 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const creationTrends: Array<{ date: string; count: number }> = [];
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const dateStr = date.toISOString().split('T')[0];
      const count = cards.filter(card => 
        card.createdAt.toISOString().split('T')[0] === dateStr
      ).length;
      creationTrends.unshift({ date: dateStr, count });
    }
    
    setAnalytics({
      totalCards,
      enhancedCards,
      topIndustries,
      averageConfidence,
      salaryDistribution: [], // Would need more complex calculation
      creationTrends,
      enhancementRate: totalCards > 0 ? (enhancedCards / totalCards) * 100 : 0,
      userEngagement
    });
  };

  const handleCardSelection = (cardId: string) => {
    const newSelection = new Set(selectedCards);
    if (newSelection.has(cardId)) {
      newSelection.delete(cardId);
    } else {
      newSelection.add(cardId);
    }
    setSelectedCards(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedCards.size === filteredCards.length) {
      setSelectedCards(new Set());
    } else {
      setSelectedCards(new Set(filteredCards.map(card => card.id)));
    }
  };

  const handleBulkExport = async () => {
    if (selectedCards.size === 0) {
      toast.error('Please select cards to export');
      return;
    }
    
    try {
      setBulkOperationLoading(true);
      const selectedCardsData = filteredCards.filter(card => selectedCards.has(card.id));
      
      const exportData = {
        exportedAt: new Date().toISOString(),
        totalCards: selectedCardsData.length,
        cards: selectedCardsData.map(card => ({
          ...card,
          createdAt: card.createdAt.toISOString(),
          updatedAt: card.updatedAt.toISOString()
        }))
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `career-cards-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Exported ${selectedCards.size} career cards`);
      setSelectedCards(new Set());
    } catch (error) {
      console.error('Error exporting career cards:', error);
      toast.error('Failed to export career cards');
    } finally {
      setBulkOperationLoading(false);
    }
  };

  const handleViewCard = (card: CareerCardWithMetadata) => {
    setSelectedCard(card);
    setShowDetailModal(true);
  };

  const closeModal = () => {
    setShowDetailModal(false);
    setSelectedCard(null);
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

  const formatSalary = (card: CareerCardWithMetadata) => {
    if (card.compensationRewards?.salaryRange) {
      const { entry, senior, currency } = card.compensationRewards.salaryRange;
      return `${currency} ${entry?.toLocaleString()}-${senior?.toLocaleString()}`;
    }
    if (card.averageSalary) {
      return `${card.averageSalary.entry} - ${card.averageSalary.senior}`;
    }
    if (card.salaryRange) {
      return card.salaryRange;
    }
    return 'Not specified';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-100';
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getEnhancementIcon = (card: CareerCardWithMetadata) => {
    if (card.enhancement?.status === 'completed') {
      return <CheckCircle size={16} className="text-green-500" />;
    }
    if (card.enhancement?.status === 'failed') {
      return <XCircle size={16} className="text-red-500" />;
    }
    if (card.enhancement?.status === 'pending') {
      return <AlertCircle size={16} className="text-yellow-500" />;
    }
    return <FileText size={16} className="text-gray-400" />;
  };

  const uniqueIndustries = Array.from(new Set(careerCards.map(card => card.industry).filter(Boolean)));
  const uniqueUsers = Array.from(new Set(careerCards.map(card => card.userId).filter(Boolean)));

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Career Cards Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {filteredCards.length} of {careerCards.length} career cards
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            <BarChart3 size={18} className="mr-2" />
            {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
          </button>
          <button
            onClick={fetchCareerCards}
            className="flex items-center px-4 py-2 bg-primary-blue text-white rounded-md hover:bg-blue-600 transition-colors"
            disabled={loading}
          >
            <RefreshCw size={18} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Analytics Panel */}
      {showAnalytics && analytics && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Career Cards Analytics</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="flex items-center">
                <FileText className="text-blue-600" size={24} />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Cards</p>
                  <p className="text-2xl font-bold text-blue-600">{analytics.totalCards}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="text-green-600" size={24} />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Enhanced</p>
                  <p className="text-2xl font-bold text-green-600">{analytics.enhancedCards}</p>
                  <p className="text-xs text-gray-500">{analytics.enhancementRate.toFixed(1)}%</p>
                </div>
              </div>
            </div>
            
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
              <div className="flex items-center">
                <Star className="text-purple-600" size={24} />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg. Confidence</p>
                  <p className="text-2xl font-bold text-purple-600">{analytics.averageConfidence.toFixed(0)}%</p>
                </div>
              </div>
            </div>
            
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
              <div className="flex items-center">
                <Users className="text-orange-600" size={24} />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Users</p>
                  <p className="text-2xl font-bold text-orange-600">{analytics.userEngagement.length}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Industries */}
            <div>
              <h3 className="text-md font-medium text-gray-800 dark:text-white mb-3">Top Industries</h3>
              <div className="space-y-2">
                {analytics.topIndustries.slice(0, 5).map((item, index) => (
                  <div key={`industry-${item.industry}-${index}`} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{item.industry}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{item.count}</span>
                      <span className="text-xs text-gray-500">({item.percentage.toFixed(1)}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Top Users */}
            <div>
              <h3 className="text-md font-medium text-gray-800 dark:text-white mb-3">Most Active Users</h3>
              <div className="space-y-2">
                {analytics.userEngagement.slice(0, 5).map((user, index) => (
                  <div key={`user-${user.userId}-${index}`} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{user.userName}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{user.cardsCount} cards</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search career cards..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          <select
            value={filters.industry || ''}
            onChange={(e) => setFilters({ ...filters, industry: e.target.value || undefined })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Industries</option>
            {uniqueIndustries.map(industry => (
              <option key={industry} value={industry}>{industry}</option>
            ))}
          </select>

          <select
            value={filters.enhancementStatus || 'all'}
            onChange={(e) => setFilters({ ...filters, enhancementStatus: e.target.value as any })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Enhancement Status</option>
            <option value="enhanced">Enhanced</option>
            <option value="not_enhanced">Not Enhanced</option>
          </select>

          <select
            value={filters.collection || 'all'}
            onChange={(e) => setFilters({ ...filters, collection: e.target.value as any })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Sources</option>
            <option value="threadCareerGuidance">Live Conversations</option>
            <option value="careerExplorations">Guest Migrations</option>
          </select>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="0"
                max="100"
                value={filters.confidenceMin || 0}
                onChange={(e) => setFilters({ ...filters, confidenceMin: parseInt(e.target.value) })}
                className="w-20"
              />
              <span className="text-xs text-gray-500">Confidence: {filters.confidenceMin || 0}%+</span>
            </div>
            
            <input
              type="date"
              value={filters.dateFrom || ''}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="From"
            />
            
            <input
              type="date"
              value={filters.dateTo || ''}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="To"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as any)}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="createdAt">Created Date</option>
              <option value="confidence">Confidence</option>
              <option value="title">Title</option>
            </select>
            
            <button
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {sortDirection === 'desc' ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedCards.size > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-blue-800 dark:text-blue-200">
              {selectedCards.size} card{selectedCards.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleBulkExport}
                disabled={bulkOperationLoading}
                className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {bulkOperationLoading ? (
                  <RefreshCw size={16} className="mr-2 animate-spin" />
                ) : (
                  <Download size={16} className="mr-2" />
                )}
                Export Selected
              </button>
              <button
                onClick={() => setSelectedCards(new Set())}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Career Cards List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="p-4 border-b dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Career Cards</h2>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={selectedCards.size === filteredCards.length && filteredCards.length > 0}
                onChange={handleSelectAll}
                className="mr-2"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">Select All</span>
            </label>
          </div>
        </div>

        {loading ? (
          <div className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={`loading-skeleton-${i}`} className="animate-pulse">
                  <div className="flex items-center space-x-4 p-4">
                    <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : filteredCards.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredCards.map((card) => (
              <div key={card.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="flex items-start space-x-4">
                  <input
                    type="checkbox"
                    checked={selectedCards.has(card.id)}
                    onChange={() => handleCardSelection(card.id)}
                    className="mt-1"
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-800 dark:text-white">
                            {card.title}
                          </h3>
                          {getEnhancementIcon(card)}
                          <span className={`px-2 py-1 text-xs rounded-full ${getConfidenceColor(card.confidence || 0)}`}>
                            {card.confidence || 0}% confidence
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            card.pathwayType === 'primary' 
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                              : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                          }`}>
                            {card.pathwayType}
                          </span>
                          {card.isEnhanced && (
                            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              ✨ Enhanced
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                          {card.description || 'No description available'}
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <User size={14} className="mr-1" />
                            <span className="truncate">{card.userName}</span>
                          </div>
                          
                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <Briefcase size={14} className="mr-1" />
                            <span className="truncate">{card.industry || 'Not specified'}</span>
                          </div>
                          
                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <DollarSign size={14} className="mr-1" />
                            <span className="truncate">{formatSalary(card)}</span>
                          </div>
                          
                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <Calendar size={14} className="mr-1" />
                            <span>{formatDate(card.createdAt)}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center">
                            <FileText size={12} className="mr-1" />
                            {card.collection === 'threadCareerGuidance' ? 'Live Conversation' : 'Guest Migration'}
                          </span>
                          {card.threadId && (
                            <span className="flex items-center">
                              <Target size={12} className="mr-1" />
                              Thread: {card.threadId.slice(-8)}
                            </span>
                          )}
                          {card.enhancement?.lastUpdated && (
                            <span className="flex items-center">
                              <Clock size={12} className="mr-1" />
                              Enhanced: {formatDate(new Date(card.enhancement.lastUpdated))}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => handleViewCard(card)}
                          className="flex items-center px-3 py-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          title="View Details"
                        >
                          <Eye size={16} className="mr-1" />
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <Briefcase size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No career cards found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Career Card Detail Modal */}
      {showDetailModal && selectedCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                  {selectedCard.title}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedCard.userName} • {selectedCard.industry} • {formatDate(selectedCard.createdAt)}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-3">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Confidence:</span>
                      <p className="text-gray-800 dark:text-white">{selectedCard.confidence || 0}%</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Industry:</span>
                      <p className="text-gray-800 dark:text-white">{selectedCard.industry || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Salary Range:</span>
                      <p className="text-gray-800 dark:text-white">{formatSalary(selectedCard)}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Source:</span>
                      <p className="text-gray-800 dark:text-white">
                        {selectedCard.collection === 'threadCareerGuidance' ? 'Live Conversation' : 'Guest Migration'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {selectedCard.description && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-3">Description</h3>
                    <p className="text-gray-600 dark:text-gray-400">{selectedCard.description}</p>
                  </div>
                )}

                {/* Key Skills */}
                {selectedCard.keySkills && selectedCard.keySkills.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-3">Key Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedCard.keySkills.map((skill, index) => (
                        <span key={`skill-${skill}-${index}`} className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full text-sm">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Next Steps */}
                {selectedCard.nextSteps && selectedCard.nextSteps.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-3">Next Steps</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {selectedCard.nextSteps.map((step, index) => (
                        <li key={`step-${index}-${step.slice(0, 20)}`} className="text-gray-600 dark:text-gray-400">{step}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Enhanced Data */}
                {selectedCard.isEnhanced && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-3">Enhanced Career Data</h3>
                      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg mb-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-green-700 dark:text-green-300">
                            ✅ This career card has been enhanced with comprehensive market data
                          </p>
                          {selectedCard.enhancedAt && (
                            <span className="text-xs text-green-600 dark:text-green-400">
                              Enhanced: {new Date(selectedCard.enhancedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Salary Information */}
                    {selectedCard.enhancedSalary && (
                      <div>
                        <h4 className="text-md font-medium text-gray-800 dark:text-white mb-2">💰 Salary Information</h4>
                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                          <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {typeof selectedCard.enhancedSalary === 'string' 
                              ? selectedCard.enhancedSalary 
                              : JSON.stringify(selectedCard.enhancedSalary, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Day in the Life */}
                    {selectedCard.dayInTheLife && (
                      <div>
                        <h4 className="text-md font-medium text-gray-800 dark:text-white mb-2">🌅 Day in the Life</h4>
                        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                          {selectedCard.dayInTheLife}
                        </p>
                      </div>
                    )}

                    {/* Career Progression */}
                    {selectedCard.careerProgression && selectedCard.careerProgression.length > 0 && (
                      <div>
                        <h4 className="text-md font-medium text-gray-800 dark:text-white mb-2">📈 Career Progression</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {selectedCard.careerProgression.map((step, index) => (
                            <li key={`progression-${index}`} className="text-gray-600 dark:text-gray-400 text-sm">
                              {step}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* In-Demand Skills */}
                    {selectedCard.inDemandSkills && selectedCard.inDemandSkills.length > 0 && (
                      <div>
                        <h4 className="text-md font-medium text-gray-800 dark:text-white mb-2">🔥 In-Demand Skills</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedCard.inDemandSkills.map((skill, index) => (
                            <span key={`demand-skill-${index}`} className="px-2 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 rounded text-xs">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Industry Trends */}
                    {selectedCard.industryTrends && selectedCard.industryTrends.length > 0 && (
                      <div>
                        <h4 className="text-md font-medium text-gray-800 dark:text-white mb-2">📊 Industry Trends</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {selectedCard.industryTrends.map((trend, index) => (
                            <li key={`trend-${index}`} className="text-gray-600 dark:text-gray-400 text-sm">
                              {trend}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Top UK Employers */}
                    {selectedCard.topUKEmployers && selectedCard.topUKEmployers.length > 0 && (
                      <div>
                        <h4 className="text-md font-medium text-gray-800 dark:text-white mb-2">🏢 Top UK Employers</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {selectedCard.topUKEmployers.map((employer, index) => (
                            <div key={`employer-${index}`} className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded text-sm">
                              <div className="font-medium text-blue-800 dark:text-blue-200">
                                {typeof employer === 'string' ? employer : employer.name || employer.company}
                              </div>
                              {typeof employer === 'object' && employer.description && (
                                <div className="text-blue-600 dark:text-blue-300 text-xs mt-1">
                                  {employer.description}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Work-Life Balance */}
                    {selectedCard.workLifeBalance && (
                      <div>
                        <h4 className="text-md font-medium text-gray-800 dark:text-white mb-2">⚖️ Work-Life Balance</h4>
                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                          <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {typeof selectedCard.workLifeBalance === 'string' 
                              ? selectedCard.workLifeBalance 
                              : JSON.stringify(selectedCard.workLifeBalance, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Additional Qualifications */}
                    {selectedCard.additionalQualifications && selectedCard.additionalQualifications.length > 0 && (
                      <div>
                        <h4 className="text-md font-medium text-gray-800 dark:text-white mb-2">🎓 Additional Qualifications</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {selectedCard.additionalQualifications.map((qual, index) => (
                            <li key={`qualification-${index}`} className="text-gray-600 dark:text-gray-400 text-sm">
                              {typeof qual === 'string' ? qual : qual.name || qual.title}
                              {typeof qual === 'object' && qual.description && (
                                <span className="text-gray-500 dark:text-gray-500 ml-2">- {qual.description}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Professional Associations */}
                    {selectedCard.professionalAssociations && selectedCard.professionalAssociations.length > 0 && (
                      <div>
                        <h4 className="text-md font-medium text-gray-800 dark:text-white mb-2">🤝 Professional Associations</h4>
                        <div className="space-y-2">
                          {selectedCard.professionalAssociations.map((assoc, index) => (
                            <div key={`association-${index}`} className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded text-sm">
                              <div className="font-medium text-purple-800 dark:text-purple-200">
                                {typeof assoc === 'string' ? assoc : assoc.name}
                              </div>
                              {typeof assoc === 'object' && assoc.description && (
                                <div className="text-purple-600 dark:text-purple-300 text-xs mt-1">
                                  {assoc.description}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Professional Testimonials */}
                    {selectedCard.professionalTestimonials && selectedCard.professionalTestimonials.length > 0 && (
                      <div>
                        <h4 className="text-md font-medium text-gray-800 dark:text-white mb-2">💬 Professional Testimonials</h4>
                        <div className="space-y-3">
                          {selectedCard.professionalTestimonials.map((testimonial, index) => (
                            <div key={`testimonial-${index}`} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border-l-4 border-green-500">
                              <p className="text-gray-700 dark:text-gray-300 text-sm italic">
                                "{typeof testimonial === 'string' ? testimonial : testimonial.quote || testimonial.content}"
                              </p>
                              {typeof testimonial === 'object' && (testimonial.author || testimonial.name) && (
                                <p className="text-gray-500 dark:text-gray-400 text-xs mt-2">
                                  — {testimonial.author || testimonial.name}
                                  {testimonial.title && <span>, {testimonial.title}</span>}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Enhancement Sources */}
                    {selectedCard.enhancedSources && selectedCard.enhancedSources.length > 0 && (
                      <div>
                        <h4 className="text-md font-medium text-gray-800 dark:text-white mb-2">📚 Enhancement Sources</h4>
                        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                          {selectedCard.enhancedSources.map((source, index) => (
                            <div key={`source-${index}`}>
                              {typeof source === 'string' ? (
                                source.startsWith('http') ? (
                                  <a href={source} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                    {source}
                                  </a>
                                ) : source
                              ) : (
                                JSON.stringify(source)
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCareerCards;
