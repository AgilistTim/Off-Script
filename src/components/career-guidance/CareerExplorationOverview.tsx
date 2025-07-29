/**
 * CAREER CARD CACHING SYSTEM WITH THREAD ID CORRUPTION FIXES
 * 
 * ISSUES ADDRESSED:
 * 1. 🔁 Thread ID Corruption: IDs were getting nested prefixes like:
 *    - Original: K9B8qyaP6DURJOEhOzzJ_guidance-primary
 *    - 1st corruption: guidance-K9B8qyaP6DURJOEhOzzJ_guidance-primary
 *    - 2nd corruption: guidance-guidance-K9B8qyaP6DURJOEhOzzJ_guidance-primary_guidance-primary
 *    - 3rd corruption: guidance-guidance-K9B8qyaP6DURJOEhOzzJ_guidance-primary_guidance-primary_guidance-primary
 * 
 * 2. 🔄 Cache Not Working: System was regenerating guidance every time instead of using cached data
 * 
 * 3. ⚠️ React Key Conflicts: Duplicate thread IDs causing rendering warnings
 * 
 * 4. 🔥 API Failures: 500 errors with no graceful fallbacks
 * 
 * SOLUTIONS IMPLEMENTED:
 * 1. ✅ Robust Thread ID Cleaning: cleanThreadId() function handles all corruption patterns
 * 2. ✅ Multi-Variation Cache Lookup: Checks multiple ID variations to find existing data
 * 3. ✅ Proper Deduplication: Uses cleaned IDs for React keys to prevent conflicts
 * 4. ✅ Comprehensive Cleanup: Delete function removes all corrupted variations
 * 5. ✅ Fallback Guidance: Provides useful guidance when APIs fail
 * 6. ✅ Enhanced Logging: Clear debugging information for troubleshooting
 * 
 * EXPECTED BEHAVIOR:
 * - First expansion: Check cache variations → Generate if needed → Store with clean ID
 * - Subsequent expansions: Use cached data (no API calls)
 * - API failures: Show fallback guidance with clear indicators
 * - Deletion: Remove all corrupted variations from database and state
 * - React rendering: No key conflicts or duplicate warnings
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useChatContext } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import careerPathwayService, { CareerExplorationSummary, ComprehensiveCareerGuidance } from '../../services/careerPathwayService';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Loader2, 
  MessageSquare, 
  ArrowRight, 
  Clock, 
  Star, 
  RefreshCw,
  DollarSign,
  TrendingUp,
  Briefcase,
  GraduationCap,
  MapPin,
  Users,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Target,
  CheckCircle,
  ExternalLink,
  Play,
  Heart,
  Lightbulb,
  PoundSterling,
  ChevronRight,
  Download,
  Calendar,
  Building,
  ArrowRight as ArrowRightIcon,
  Brain
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CareerExplorationOverviewProps {
  onSelectExploration?: (threadId: string) => void;
  currentCareerCards?: any[]; // Add prop for current career cards
}

const CareerExplorationOverview: React.FC<CareerExplorationOverviewProps> = ({ 
  onSelectExploration, 
  currentCareerCards = [] 
}) => {
  const { careerExplorations } = useChatContext();
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [directExplorations, setDirectExplorations] = useState<CareerExplorationSummary[]>([]);
  const [refreshCount, setRefreshCount] = useState(0);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [careerGuidanceData, setCareerGuidanceData] = useState<Map<string, ComprehensiveCareerGuidance>>(new Map());
  const [loadingGuidance, setLoadingGuidance] = useState<Set<string>>(new Set());

  // Helper function to extract rich career data from different sources
  const extractCareerData = (exploration: any) => {
    // For current career cards (from conversation)
    if (exploration.isCurrent && exploration.source) {
      return {
        averageSalary: exploration.source.averageSalary || exploration.source.salaryRange,
        keySkills: exploration.source.keySkills || exploration.source.skillsRequired || [],
        trainingPathways: exploration.source.trainingPathways || [exploration.source.trainingPathway].filter(Boolean) || [],
        entryRequirements: exploration.source.entryRequirements || [],
        workEnvironment: exploration.source.workEnvironment,
        nextSteps: exploration.source.nextSteps || [],
        growthOutlook: exploration.source.growthOutlook || exploration.source.marketOutlook,
        industry: exploration.source.industry,
        confidence: exploration.source.confidence
      };
    }
    
    // For migrated career cards (try to extract from description/stored data)
    return {
      averageSalary: null,
      keySkills: [],
      trainingPathways: [],
      entryRequirements: [],
      workEnvironment: null,
      nextSteps: [],
      growthOutlook: null,
      industry: null,
      confidence: exploration.match
    };
  };

  // Helper function to format salary display
  const formatSalaryDisplay = (salary: any): string => {
    if (!salary) return '';
    if (typeof salary === 'string') return salary;
    if (salary.entry) return `${salary.entry} - ${salary.senior || salary.experienced}`;
    return '';
  };

  // Helper function to get growth outlook display
  const getGrowthColor = (outlook: string): string => {
    if (!outlook) return 'text-primary-white/60';
    const lower = outlook.toLowerCase();
    if (lower.includes('high') || lower.includes('strong') || lower.includes('excellent')) return 'text-acid-green';
    if (lower.includes('good') || lower.includes('moderate')) return 'text-electric-blue';
    if (lower.includes('limited') || lower.includes('declining')) return 'text-sunset-orange';
    return 'text-primary-white/60';
  };

  // Robust thread ID cleaning to handle nested corruption
  const cleanThreadId = (threadId: string): string => {
    if (!threadId) return `fallback-${Math.random()}`;
    
    let cleaned = threadId.trim();
    
    // Step 1: Remove all "guidance-" prefixes (can be multiple)
    cleaned = cleaned.replace(/^(guidance-)+/g, '');
    
    // Step 2: Remove all "_guidance" suffixes and variations
    cleaned = cleaned.replace(/(_guidance)+(-primary)*(_guidance)*(-primary)*(_guidance)*$/g, '');
    
    // Step 3: Handle remaining "_guidance-primary" patterns anywhere in the string
    cleaned = cleaned.replace(/(_guidance-primary)+/g, '');
    
    // Step 4: Clean up any remaining "guidance-" in the middle
    cleaned = cleaned.replace(/guidance-/g, '');
    
    // Step 5: Handle "-primary" suffixes that might be left
    cleaned = cleaned.replace(/(-primary)+$/g, '');
    
    // Step 6: Handle "_primary" suffixes that might be left
    cleaned = cleaned.replace(/(_primary)+$/g, '');
    
    // Step 7: Remove any remaining "_guidance" fragments
    cleaned = cleaned.replace(/_guidance/g, '');
    
    // Step 8: Clean up double underscores or dashes
    cleaned = cleaned.replace(/_{2,}/g, '_');
    cleaned = cleaned.replace(/-{2,}/g, '-');
    
    // Step 9: Remove trailing underscores or dashes
    cleaned = cleaned.replace(/[_-]+$/g, '');
    
    // Step 10: Remove leading underscores or dashes
    cleaned = cleaned.replace(/^[_-]+/g, '');
    
    // Step 11: If we ended up with something too short or empty, create a fallback
    if (!cleaned || cleaned.length < 5) {
      // Try to extract the core ID from the original
      const coreMatch = threadId.match(/([A-Za-z0-9]{15,})/);
      if (coreMatch) {
        cleaned = coreMatch[1];
      } else {
        cleaned = `fallback-${threadId.substring(0, 10).replace(/[^A-Za-z0-9]/g, '')}-${Date.now()}`;
      }
    }
    
    console.log('🧹 Cleaned thread ID:', { 
      original: threadId, 
      cleaned, 
      steps: {
        'original': threadId,
        'after_guidance_prefix_removal': threadId.replace(/^(guidance-)+/g, ''),
        'after_suffix_removal': threadId.replace(/^(guidance-)+/g, '').replace(/(_guidance)+(-primary)*(_guidance)*(-primary)*(_guidance)*$/g, ''),
        'final': cleaned
      }
    });
    
    return cleaned;
  };

  // Fetch comprehensive career guidance when a card is expanded
  const fetchCareerGuidance = async (threadId: string, exploration: any) => {
    const cleanedId = cleanThreadId(threadId);
    
    if (careerGuidanceData.has(threadId) || careerGuidanceData.has(cleanedId) || loadingGuidance.has(threadId)) {
      console.log('🔄 Skipping fetch - already have data or loading for:', threadId);
      return; // Already have data or currently loading
    }

    console.log('🎯 Fetching career guidance for threadId:', threadId, 'cleaned:', cleanedId);

    setLoadingGuidance(prev => new Set([...prev, threadId]));

    try {
      // Check multiple possible ID variations due to historical corruption
      const idVariations = [
        cleanedId,
        threadId,
        `guidance-${cleanedId}`,
        threadId.replace(/^guidance-/, ''),
      ].filter((id, index, arr) => arr.indexOf(id) === index); // Remove duplicates

      console.log('🔍 Checking database cache for ID variations:', idVariations);
      
      let existingGuidance = null;
      for (const idVariation of idVariations) {
        try {
          existingGuidance = await careerPathwayService.getThreadCareerGuidance(idVariation, currentUser?.uid || 'guest');
          if (existingGuidance) {
            console.log('✅ Found cached guidance in database with ID variation:', idVariation);
            break;
          }
        } catch (error) {
          console.log('🔍 No cache found for ID variation:', idVariation);
        }
      }
      
      if (existingGuidance) {
        setCareerGuidanceData(prev => new Map(prev.set(threadId, existingGuidance)));
        return;
      }

      console.log('📝 No cached guidance found in any variation, generating new guidance for:', cleanedId);

      // Create a proper ChatSummary object from the exploration data
      const chatSummary = {
        id: `temp-${cleanedId}`,
        threadId: cleanedId,
        userId: currentUser?.uid || 'guest',
        summary: exploration.description || 'Career exploration conversation',
        interests: exploration.interests || [exploration.primaryCareerPath],
        careerGoals: exploration.goals || ['Explore career options'],
        skills: exploration.skills || [],
        createdAt: new Date()
      };

      console.log('📋 Creating new guidance with cleaned ID:', cleanedId);

      // Generate new guidance using the public method (it will handle storage)
      const guidance = await careerPathwayService.generateThreadCareerGuidance(
        cleanedId,
        currentUser?.uid || 'guest',
        chatSummary
      );
      
      if (guidance) {
        setCareerGuidanceData(prev => new Map(prev.set(threadId, guidance)));
        console.log('✅ Generated and stored new guidance with cleaned ID:', cleanedId);
      }
    } catch (error) {
      console.error('❌ Failed to fetch career guidance for:', threadId, error);
      
      // Provide basic fallback guidance if API fails
      const fallbackGuidance = {
        userProfile: {
          goals: ['Explore career options'],
          interests: [exploration.primaryCareerPath || 'Career Development'],
          skills: [],
          careerStage: 'exploring' as const
        },
        primaryPathway: {
          id: 'fallback',
          title: exploration.primaryCareerPath || 'Career Path',
          description: exploration.description || 'Career guidance temporarily unavailable. Please try again later.',
          match: 75,
          trainingOptions: [],
          volunteeringOpportunities: [],
          fundingOptions: [],
          nextSteps: {
            immediate: ['Research career options', 'Identify your skills and interests'],
            shortTerm: ['Explore training opportunities', 'Network with professionals'],
            longTerm: ['Develop career plan', 'Gain relevant experience']
          },
          reflectiveQuestions: [
            'What aspects of this career interest you most?',
            'What skills do you already have that apply?',
            'What would you like to learn more about?'
          ],
          keyResources: [],
          progressionPath: [
            {
              stage: 'Exploration',
              description: 'Research and understand the career path',
              timeframe: '1-3 months',
              requirements: ['Research career requirements', 'Assess current skills']
            },
            {
              stage: 'Preparation',
              description: 'Develop necessary skills and qualifications',
              timeframe: '6-12 months',
              requirements: ['Complete relevant training', 'Build experience through projects or volunteering']
            },
            {
              stage: 'Entry',
              description: 'Begin career in entry-level position',
              timeframe: '12+ months',
              requirements: ['Apply for positions', 'Network with professionals', 'Continue learning']
            }
          ]
        },
        alternativePathways: [],
        crossCuttingResources: {
          generalFunding: [],
          careerSupport: []
        },
        generatedAt: new Date(),
        actionPlan: {
          thisWeek: ['Research this career path online'],
          thisMonth: ['Connect with professionals in this field'],
          next3Months: ['Consider relevant training or education options']
        }
      };
      
      setCareerGuidanceData(prev => new Map(prev.set(threadId, fallbackGuidance)));
      console.log('🔄 Using fallback guidance for:', threadId);
    } finally {
      setLoadingGuidance(prev => {
        const newSet = new Set(prev);
        newSet.delete(threadId);
        return newSet;
      });
    }
  };

  // Delete career card and its cached guidance data
  const deleteCareerCard = async (threadId: string) => {
    if (!currentUser) return;

    // Confirm deletion with user
    const confirmed = window.confirm(
      'Are you sure you want to delete this career card? This will permanently remove the card and all its detailed guidance data.'
    );
    
    if (!confirmed) return;

    try {
      // Clean the thread ID to match what's stored in the database
      const cleanedId = cleanThreadId(threadId);
      console.log('🗑️ Deleting career card with cleaned ID:', cleanedId, 'from original:', threadId);

      // Remove from local state (check both original and cleaned IDs)
      setCareerGuidanceData(prev => {
        const newMap = new Map(prev);
        newMap.delete(threadId);
        newMap.delete(cleanedId);
        return newMap;
      });

      // Remove from expanded cards
      setExpandedCards(prev => {
        const newSet = new Set(prev);
        newSet.delete(threadId);
        newSet.delete(cleanedId);
        return newSet;
      });

      // Delete all possible corrupted variations from database
      const idVariations = [
        cleanedId,
        threadId,
        `guidance-${cleanedId}`,
        threadId.replace(/^guidance-/, ''),
      ].filter((id, index, arr) => arr.indexOf(id) === index);

      console.log('🗑️ Attempting to delete all ID variations:', idVariations);
      
      for (const idVariation of idVariations) {
        try {
          await careerPathwayService.deleteThreadCareerGuidance(idVariation, currentUser.uid);
          console.log('✅ Deleted guidance for ID variation:', idVariation);
        } catch (error) {
          console.log('🔍 No guidance found to delete for:', idVariation);
        }
      }

      // Remove from direct explorations if it exists there
      setDirectExplorations(prev => 
        prev.filter(exploration => {
          const explorationCleanedId = cleanThreadId(exploration.threadId);
          return exploration.threadId !== threadId && 
                 exploration.threadId !== cleanedId &&
                 explorationCleanedId !== cleanedId;
        })
      );

      // Force a refresh to update the parent component
      setRefreshCount(prev => prev + 1);
      
    } catch (error) {
      console.error('❌ Error deleting career card:', error);
      alert('Failed to delete career card. Please try again.');
    }
  };

  const toggleCardExpansion = async (threadId: string, exploration: any) => {
    const isCurrentlyExpanded = expandedCards.has(threadId);
    
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (isCurrentlyExpanded) {
        newSet.delete(threadId);
      } else {
        newSet.add(threadId);
        // Fetch guidance data when expanding
        fetchCareerGuidance(threadId, exploration);
      }
      return newSet;
    });
  };

  const loadExplorations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!currentUser) {
        setIsLoading(false);
        return;
      }

      const explorations = await careerPathwayService.getUserCareerExplorations(currentUser.uid);
      setDirectExplorations(explorations);
      
      // If no migrated career cards found but we expected them, show retry option
      const hasMigratedCards = explorations.some(exp => exp.threadId.includes('_card_'));
      if (!hasMigratedCards && refreshCount === 0) {
        console.log('🔄 No migrated career cards found on first load - they may still be processing');
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load career explorations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExplorations();
  }, [currentUser, refreshCount]);

  const handleRefresh = () => {
    setRefreshCount(prev => prev + 1);
    loadExplorations();
  };

  // Combine direct explorations with current career cards
  const allExplorations = useMemo(() => {
    const explorations = directExplorations.length > 0 ? directExplorations : careerExplorations;
    
    // Add current career cards as exploration items
    const currentCardExplorations = currentCareerCards.map(card => ({
      threadId: card.id,
      threadTitle: card.title,
      primaryCareerPath: card.title,
      lastUpdated: new Date(),
      match: card.confidence || 80,
      description: card.description,
      isCurrent: true,
      source: card // Pass the full card data as source
    }));
    
    // Combine and sort by last updated
    const combined = [...explorations, ...currentCardExplorations];
    
    // More aggressive deduplication by cleaned thread ID
    const cleanedIdMap = new Map<string, any>(); // cleaned ID -> best exploration
    
    combined.forEach(exploration => {
      const cleanedId = cleanThreadId(exploration.threadId || `fallback-${Math.random()}`);
      
      // If we already have an exploration for this cleaned ID, choose the best one
      if (cleanedIdMap.has(cleanedId)) {
        const existing = cleanedIdMap.get(cleanedId);
        
        // Prioritize by:
        // 1. Shorter original thread ID (less corrupted)
        // 2. More recent lastUpdated
        // 3. Higher match score
        const existingCorruption = (existing.threadId.match(/guidance/g) || []).length;
        const newCorruption = (exploration.threadId.match(/guidance/g) || []).length;
        
        let shouldReplace = false;
        
        if (newCorruption < existingCorruption) {
          shouldReplace = true; // Less corrupted
        } else if (newCorruption === existingCorruption) {
          if (exploration.lastUpdated > existing.lastUpdated) {
            shouldReplace = true; // More recent
          } else if (exploration.lastUpdated.getTime() === existing.lastUpdated.getTime()) {
            if ((exploration.match || 0) > (existing.match || 0)) {
              shouldReplace = true; // Higher match
            }
          }
        }
        
        if (shouldReplace) {
          console.log(`🔄 Replacing duplicate:`, {
            cleanedId,
            oldThreadId: existing.threadId,
            newThreadId: exploration.threadId,
            reason: newCorruption < existingCorruption ? 'less corrupted' : 
                   exploration.lastUpdated > existing.lastUpdated ? 'more recent' : 'higher match'
          });
          cleanedIdMap.set(cleanedId, { ...exploration, threadId: cleanedId });
        } else {
          console.log(`🔍 Skipping duplicate (keeping existing):`, {
            cleanedId,
            existingThreadId: existing.threadId,
            skippedThreadId: exploration.threadId
          });
        }
      } else {
        // First exploration for this cleaned ID
        cleanedIdMap.set(cleanedId, { ...exploration, threadId: cleanedId });
      }
    });
    
    const deduplicated = Array.from(cleanedIdMap.values());
    
    console.log('🔍 Advanced deduplication results:', {
      originalCount: combined.length,
      duplicateGroups: combined.length - cleanedIdMap.size,
      finalCount: deduplicated.length,
      cleanedThreadIds: deduplicated.map(e => e.threadId)
    });
    
    return deduplicated.sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());
  }, [directExplorations, careerExplorations, currentCareerCards]);

  const formatDate = (date: Date | any) => {
    const now = new Date();
    // Handle both Date objects and Firestore Timestamps
    const dateObj = date?.toDate ? date.toDate() : new Date(date);
    const diffTime = Math.abs(now.getTime() - dateObj.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    
    return dateObj.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getMatchVariant = (match: number): "default" | "secondary" | "destructive" | "outline" => {
    if (match >= 90) return 'default';
    if (match >= 70) return 'secondary';
    return 'outline';
  };

  const getMatchColor = (match: number) => {
    if (match >= 90) return 'text-acid-green';
    if (match >= 70) return 'text-cyber-yellow';
    return 'text-neon-pink';
  };

  // Comprehensive database cleanup function
  const cleanupCorruptedEntries = useCallback(async () => {
    if (!currentUser) return;
    
    console.log('🧹 Starting comprehensive database cleanup...');
    
    try {
      // Get all current explorations to identify duplicates
      const explorations = await careerPathwayService.getUserCareerExplorations(currentUser.uid);
      const cleanedIdMap = new Map<string, string[]>(); // cleaned ID -> original IDs
      
      // Group explorations by their cleaned IDs
      explorations.forEach(exploration => {
        const cleanedId = cleanThreadId(exploration.threadId);
        if (!cleanedIdMap.has(cleanedId)) {
          cleanedIdMap.set(cleanedId, []);
        }
        cleanedIdMap.get(cleanedId)!.push(exploration.threadId);
      });
      
      // Find groups with multiple variations (duplicates)
      const duplicateGroups = Array.from(cleanedIdMap.entries()).filter(([_, originals]) => originals.length > 1);
      
      console.log('🔍 Found duplicate groups:', duplicateGroups.length);
      duplicateGroups.forEach(([cleanedId, originals]) => {
        console.log(`  - ${cleanedId}: ${originals.join(', ')}`);
      });
      
      // For each duplicate group, keep the shortest/cleanest ID and remove others
      for (const [cleanedId, originals] of duplicateGroups) {
        // Sort by length and corruption level (prefer shorter, less corrupted IDs)
        const sortedOriginals = originals.sort((a, b) => {
          const aCorruption = (a.match(/guidance/g) || []).length + (a.match(/_guidance/g) || []).length;
          const bCorruption = (b.match(/guidance/g) || []).length + (b.match(/_guidance/g) || []).length;
          
          if (aCorruption !== bCorruption) return aCorruption - bCorruption;
          return a.length - b.length;
        });
        
        const keepId = sortedOriginals[0];
        const removeIds = sortedOriginals.slice(1);
        
        console.log(`🧹 For group ${cleanedId}: keeping "${keepId}", removing:`, removeIds);
        
        // Remove the corrupted variations from database
        for (const removeId of removeIds) {
          try {
            await careerPathwayService.deleteThreadCareerGuidance(removeId, currentUser.uid);
            console.log(`✅ Deleted corrupted guidance: ${removeId}`);
          } catch (error) {
            console.log(`🔍 No guidance found to delete: ${removeId}`);
          }
        }
      }
      
      console.log('✅ Database cleanup completed');
      
    } catch (error) {
      console.error('❌ Error during database cleanup:', error);
    }
  }, [currentUser]);

  // Add cleanup trigger on component mount
  useEffect(() => {
    if (currentUser && refreshCount === 0) {
      // Run cleanup once on initial load
      cleanupCorruptedEntries();
    }
  }, [currentUser, cleanupCorruptedEntries, refreshCount]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span className="text-gray-600">Loading your career explorations...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-6 text-center">
          <div className="text-red-600 mb-2">⚠️ Something went wrong</div>
          <p className="text-gray-600">{error}</p>
          <p className="text-sm text-gray-500 mt-2">Please try refreshing the page</p>
        </CardContent>
      </Card>
    );
  }

  if (allExplorations.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg mb-2">Start Your Career Journey</CardTitle>
              <CardDescription className="mb-4">
                Discover personalized career paths by chatting with our AI assistant about your interests, goals, and aspirations.
              </CardDescription>
              <div className="flex gap-3 justify-center">
                <Button asChild>
                  <a href="/chat" className="inline-flex items-center">
                    Start Exploring <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Action Bar */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-electric-blue to-neon-pink rounded-lg flex items-center justify-center">
              <Star className="w-4 h-4 text-primary-white" />
            </div>
            <p className="text-primary-white/80 font-medium">
              Your Career Discoveries
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-primary-white/60">
              {allExplorations.length} career paths discovered
            </span>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-electric-blue to-neon-pink rounded-lg text-primary-white font-bold text-sm hover:scale-105 transition-transform duration-200 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Loading...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {allExplorations.map((exploration) => {
          const careerData = extractCareerData(exploration);
          const isExpanded = expandedCards.has(exploration.threadId);
          const salaryDisplay = formatSalaryDisplay(careerData.averageSalary);

          return (
            <motion.div
              key={exploration.threadId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-primary-black/90 to-electric-blue/10 border border-electric-blue/30 rounded-xl shadow-lg hover:shadow-glow-blue transition-all duration-200 backdrop-blur-sm"
            >
              {/* Card Header - Always Visible */}
              <div className="p-6 pb-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-street font-black text-primary-white mb-2">
                      {exploration.primaryCareerPath}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-primary-white/60 mb-3">
                      {careerData.industry && (
                        <div className="flex items-center">
                          <Briefcase className="w-4 h-4 mr-1" />
                          <span>{careerData.industry}</span>
                        </div>
                      )}
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        <span>UK</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        <span>{formatDate(exploration.lastUpdated)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Match confidence badge */}
                  <div className="flex flex-col items-end">
                    <Badge 
                      variant={getMatchVariant(exploration.match)}
                      className="mb-2 bg-gradient-to-r from-electric-blue to-neon-pink text-primary-white border-0"
                    >
                      {exploration.match}% match
                    </Badge>
                  </div>
                </div>

                {/* Basic Career Info */}
                <div className="space-y-3">
                  <p className="text-primary-white/80 text-sm line-clamp-2">
                    {exploration.description}
                  </p>

                  {/* Salary and Key Skills Preview */}
                  <div className="flex flex-wrap gap-4 text-sm">
                    {salaryDisplay && (
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-acid-green to-cyber-yellow rounded-lg flex items-center justify-center">
                          <PoundSterling className="w-4 h-4 text-primary-black" />
                        </div>
                        <span className="text-primary-white font-medium">{salaryDisplay}</span>
                      </div>
                    )}
                  </div>
                  
                  {careerData.keySkills && careerData.keySkills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {careerData.keySkills.slice(0, 5).map((skill, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-gradient-to-r from-neon-pink/20 to-electric-blue/20 border border-electric-blue/30 rounded-full text-xs text-primary-white font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                      {careerData.keySkills.length > 5 && (
                        <span className="px-3 py-1 bg-gradient-to-r from-cyber-yellow/20 to-acid-green/20 border border-cyber-yellow/30 rounded-full text-xs text-primary-white font-medium">
                          +{careerData.keySkills.length - 5} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between mt-6">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleCardExpansion(exploration.threadId, exploration)}
                      className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-electric-blue/20 to-neon-pink/20 border border-electric-blue/30 rounded-lg text-primary-white font-medium hover:bg-gradient-to-r hover:from-electric-blue/30 hover:to-neon-pink/30 transition-all duration-200"
                    >
                      <span>{isExpanded ? 'Show Less' : 'Show Details'}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    
                    {currentUser && (
                      <button
                        onClick={() => deleteCareerCard(exploration.threadId)}
                        className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-neon-pink/20 to-sunset-orange/20 border border-neon-pink/30 rounded-lg text-neon-pink hover:bg-gradient-to-r hover:from-neon-pink/30 hover:to-sunset-orange/30 transition-all duration-200"
                        title="Delete Career Card"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <button
                    onClick={() => onSelectExploration?.(exploration.threadId)}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-electric-blue to-neon-pink rounded-lg text-primary-white font-bold hover:scale-105 transition-transform duration-200"
                  >
                    <span>Explore Path</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Expandable Details */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="border-t border-gray-100 bg-gray-50"
                  >
                    <div className="p-6">
                      {loadingGuidance.has(exploration.threadId) ? (
                        <div className="text-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 text-blue-600" />
                          <p className="text-sm text-gray-600">Loading detailed career guidance...</p>
                        </div>
                      ) : (
                        <Tabs defaultValue="learning" className="w-full">
                          {/* Show fallback indicator if this is fallback guidance */}
                          {(() => {
                            const guidance = careerGuidanceData.get(exploration.threadId);
                            return guidance?.primaryPathway?.id === 'fallback';
                          })() && (
                            <div className="bg-gradient-to-r from-sunset-orange/20 to-cyber-yellow/20 border border-sunset-orange/30 rounded-lg p-4 mb-6">
                              <div className="flex items-center space-x-2 text-sunset-orange">
                                <Lightbulb className="w-5 h-5" />
                                <span className="font-medium">Basic Guidance Mode</span>
                              </div>
                              <p className="text-primary-white/70 text-sm mt-2">
                                Our detailed AI analysis is temporarily unavailable. Here's some basic guidance to get you started.
                              </p>
                            </div>
                          )}

                          <TabsList className="grid w-full grid-cols-2 mb-6">
                            <TabsTrigger value="learning" className="flex items-center space-x-2">
                              <BookOpen className="w-4 h-4" />
                              <span>Learning</span>
                            </TabsTrigger>
                            <TabsTrigger value="action" className="flex items-center space-x-2">
                              <Play className="w-4 h-4" />
                              <span>Take Action</span>
                            </TabsTrigger>
                          </TabsList>

                          <TabsContent value="learning" className="space-y-6">
                            {careerGuidanceData.has(exploration.threadId) ? (
                              (() => {
                                const guidance = careerGuidanceData.get(exploration.threadId)!;
                                const primaryPathway = guidance.primaryPathway;
                                
                                return (
                                  <>
                                    {/* Training & Education Options */}
                                    <div>
                                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                        <GraduationCap className="w-5 h-5 mr-2 text-blue-600" />
                                        Training & Education Options
                                      </h4>
                                      <p className="text-sm text-gray-600 mb-4">
                                        Courses and qualifications to build your skills
                                      </p>
                                      
                                      {primaryPathway.trainingOptions && primaryPathway.trainingOptions.length > 0 ? (
                                        <div className="grid gap-4">
                                          {primaryPathway.trainingOptions.map((training, index) => (
                                            <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white">
                                              <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                  <h5 className="font-semibold text-gray-900">{training.title}</h5>
                                                  <p className="text-sm text-gray-600 mt-1">{training.description}</p>
                                                  <div className="flex items-center mt-3 space-x-4 text-sm text-gray-500">
                                                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">{training.level}</span>
                                                    <span className="flex items-center">
                                                      <Clock className="w-3 h-3 mr-1" />
                                                      {training.duration}
                                                    </span>
                                                    <span className="font-medium text-green-600">{training.cost}</span>
                                                  </div>
                                                  <div className="text-sm text-gray-600 mt-2">
                                                    <strong>Provider:</strong> {training.provider}
                                                  </div>
                                                  {training.fundingAvailable && (
                                                    <div className="text-sm text-green-600 font-medium mt-1">
                                                      💰 {training.fundingAvailable}
                                                    </div>
                                                  )}
                                                </div>
                                                {training.link && (
                                                  <Button size="sm" variant="outline" asChild>
                                                    <a href={training.link} target="_blank" rel="noopener noreferrer">
                                                      <ExternalLink className="w-3 h-3 mr-1" />
                                                      Learn More
                                                    </a>
                                                  </Button>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="text-center py-6 text-gray-500">
                                          <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                          <p>Training options are being researched for this career path.</p>
                                        </div>
                                      )}
                                    </div>

                                    {/* Gain Experience Section */}
                                    {primaryPathway.volunteeringOpportunities && primaryPathway.volunteeringOpportunities.length > 0 && (
                                      <div>
                                        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                          <Heart className="w-5 h-5 mr-2 text-red-600" />
                                          Gain Experience
                                        </h4>
                                        <p className="text-sm text-gray-600 mb-4">
                                          Volunteering and work experience opportunities
                                        </p>
                                        
                                        <div className="grid gap-4">
                                          {primaryPathway.volunteeringOpportunities.map((opportunity, index) => (
                                            <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white">
                                              <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                  <h5 className="font-semibold text-gray-900">{opportunity.role}</h5>
                                                  <p className="text-sm text-gray-600 mt-1">{opportunity.description}</p>
                                                  <div className="flex items-center mt-3 space-x-4 text-sm text-gray-500">
                                                    <span className="flex items-center">
                                                      <MapPin className="w-3 h-3 mr-1" />
                                                      {opportunity.location}
                                                    </span>
                                                    <span className="flex items-center">
                                                      <Clock className="w-3 h-3 mr-1" />
                                                      {opportunity.timeCommitment}
                                                    </span>
                                                  </div>
                                                  <div className="text-sm text-gray-600 mt-2">
                                                    <strong>Organization:</strong> {opportunity.organization}
                                                  </div>
                                                  {opportunity.skillsGained && opportunity.skillsGained.length > 0 && (
                                                    <div className="mt-2">
                                                      <span className="text-xs font-medium text-gray-700">Skills gained:</span>
                                                      <div className="flex flex-wrap gap-1 mt-1">
                                                        {opportunity.skillsGained.map((skill, skillIndex) => (
                                                          <Badge key={skillIndex} variant="outline" className="text-xs">
                                                            {skill}
                                                          </Badge>
                                                        ))}
                                                      </div>
                                                    </div>
                                                  )}
                                                </div>
                                                {opportunity.link && (
                                                  <Button size="sm" asChild>
                                                    <a href={opportunity.link} target="_blank" rel="noopener noreferrer">
                                                      <ExternalLink className="w-3 h-3 mr-1" />
                                                      Apply
                                                    </a>
                                                  </Button>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Funding & Financial Support */}
                                    {((primaryPathway.fundingOptions && primaryPathway.fundingOptions.length > 0) || 
                                      (guidance.crossCuttingResources?.generalFunding && guidance.crossCuttingResources.generalFunding.length > 0)) && (
                                      <div>
                                        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                          <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                                          Funding & Financial Support
                                        </h4>
                                        <p className="text-sm text-gray-600 mb-4">
                                          Available funding schemes and financial assistance
                                        </p>
                                        
                                        <div className="grid gap-4">
                                          {/* Primary pathway funding */}
                                          {primaryPathway.fundingOptions?.map((funding, index) => (
                                            <div key={`primary-${index}`} className="border border-gray-200 rounded-lg p-4 bg-white">
                                              <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                  <h5 className="font-semibold text-gray-900">{funding.name}</h5>
                                                  <p className="text-sm text-gray-600 mt-1">{funding.description}</p>
                                                  <div className="flex items-center mt-3 space-x-4 text-sm">
                                                    <span className="font-medium text-green-600 flex items-center">
                                                      <DollarSign className="w-3 h-3 mr-1" />
                                                      {funding.amount}
                                                    </span>
                                                  </div>
                                                  <div className="text-sm text-gray-600 mt-2">
                                                    <strong>Eligibility:</strong> {Array.isArray(funding.eligibility) ? funding.eligibility.join(', ') : funding.eligibility}
                                                  </div>
                                                </div>
                                                {funding.link && (
                                                  <Button size="sm" variant="outline" asChild>
                                                    <a href={funding.link} target="_blank" rel="noopener noreferrer">
                                                      <ExternalLink className="w-3 h-3 mr-1" />
                                                      Apply
                                                    </a>
                                                  </Button>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                          
                                          {/* General funding */}
                                          {guidance.crossCuttingResources?.generalFunding?.slice(0, 2).map((funding, index) => (
                                            <div key={`general-${index}`} className="border border-gray-200 rounded-lg p-4 bg-white">
                                              <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                  <h5 className="font-semibold text-gray-900">{funding.name}</h5>
                                                  <p className="text-sm text-gray-600 mt-1">{funding.description}</p>
                                                  <div className="flex items-center mt-3 space-x-4 text-sm">
                                                    <span className="font-medium text-green-600 flex items-center">
                                                      <DollarSign className="w-3 h-3 mr-1" />
                                                      {funding.amount}
                                                    </span>
                                                  </div>
                                                  <div className="text-sm text-gray-600 mt-2">
                                                    <strong>Eligibility:</strong> {Array.isArray(funding.eligibility) ? funding.eligibility.join(', ') : funding.eligibility}
                                                  </div>
                                                </div>
                                                {funding.link && (
                                                  <Button size="sm" variant="outline" asChild>
                                                    <a href={funding.link} target="_blank" rel="noopener noreferrer">
                                                      <ExternalLink className="w-3 h-3 mr-1" />
                                                      Apply
                                                    </a>
                                                  </Button>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </>
                                );
                              })()
                            ) : (
                              <div className="text-center py-8 text-gray-500">
                                <Lightbulb className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                <p>Loading learning resources...</p>
                              </div>
                            )}
                          </TabsContent>

                          <TabsContent value="action" className="space-y-6">
                            {careerGuidanceData.has(exploration.threadId) ? (
                              (() => {
                                const guidance = careerGuidanceData.get(exploration.threadId)!;
                                const actionPlan = guidance.actionPlan;
                                
                                return (
                                  <>
                                    {/* This Week - Quick Wins */}
                                    <div>
                                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                        <Clock className="w-5 h-5 mr-2 text-green-600" />
                                        This Week - Quick Wins
                                      </h4>
                                      <p className="text-sm text-gray-600 mb-4">
                                        Immediate actions you can take right now
                                      </p>
                                      
                                      <div className="space-y-3">
                                        {actionPlan?.thisWeek?.map((action, index) => (
                                          <div key={index} className="border border-green-200 rounded-lg p-4 bg-green-50">
                                            <div className="flex items-start">
                                              <CheckCircle className="w-5 h-5 mr-3 mt-0.5 text-green-600 flex-shrink-0" />
                                              <span className="text-sm font-medium text-gray-900">{action}</span>
                                            </div>
                                          </div>
                                        )) || (
                                          <p className="text-gray-500 text-sm">Action plan is being generated...</p>
                                        )}
                                      </div>
                                    </div>

                                    {/* This Month & Next 3 Months */}
                                    <div className="grid md:grid-cols-2 gap-6">
                                      <div>
                                        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                          <Clock className="w-5 h-5 mr-2 text-blue-600" />
                                          This Month
                                        </h4>
                                        <div className="space-y-3">
                                          {actionPlan?.thisMonth?.map((action, index) => (
                                            <div key={index} className="flex items-start">
                                              <CheckCircle className="w-4 h-4 mr-3 mt-0.5 text-blue-600 flex-shrink-0" />
                                              <span className="text-sm text-gray-700">{action}</span>
                                            </div>
                                          )) || <div className="text-gray-500 text-sm">Monthly actions being planned...</div>}
                                        </div>
                                      </div>

                                      <div>
                                        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                          <Clock className="w-5 h-5 mr-2 text-purple-600" />
                                          Next 3 Months
                                        </h4>
                                        <div className="space-y-3">
                                          {actionPlan?.next3Months?.map((action, index) => (
                                            <div key={index} className="flex items-start">
                                              <CheckCircle className="w-4 h-4 mr-3 mt-0.5 text-purple-600 flex-shrink-0" />
                                              <span className="text-sm text-gray-700">{action}</span>
                                            </div>
                                          )) || <div className="text-gray-500 text-sm">Long-term actions being planned...</div>}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Quick Access Resources */}
                                    <div>
                                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                        <Target className="w-5 h-5 mr-2 text-indigo-600" />
                                        Quick Access Resources
                                      </h4>
                                      <p className="text-sm text-gray-600 mb-4">
                                        Essential links to get started immediately
                                      </p>
                                      
                                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                        <Button variant="outline" size="sm" asChild>
                                          <a href="https://www.gov.uk/volunteering" target="_blank" rel="noopener noreferrer">
                                            <Users className="w-4 h-4 mr-2" />
                                            Find Volunteer Roles
                                          </a>
                                        </Button>
                                        <Button variant="outline" size="sm" asChild>
                                          <a href="https://find-postgraduate-study.ac.uk" target="_blank" rel="noopener noreferrer">
                                            <BookOpen className="w-4 h-4 mr-2" />
                                            University Courses
                                          </a>
                                        </Button>
                                        <Button variant="outline" size="sm" asChild>
                                          <a href="https://www.gov.uk/apprenticeships-guide" target="_blank" rel="noopener noreferrer">
                                            <GraduationCap className="w-4 h-4 mr-2" />
                                            Apprenticeships
                                          </a>
                                        </Button>
                                        <Button variant="outline" size="sm" asChild>
                                          <a href="https://nationalcareers.service.gov.uk" target="_blank" rel="noopener noreferrer">
                                            <Target className="w-4 h-4 mr-2" />
                                            Career Guidance
                                          </a>
                                        </Button>
                                        <Button variant="outline" size="sm" asChild>
                                          <a href="https://nationalcareers.service.gov.uk/explore-careers/job-sector" target="_blank" rel="noopener noreferrer">
                                            <Lightbulb className="w-4 h-4 mr-2" />
                                            Job Market Info
                                          </a>
                                        </Button>
                                        <Button variant="outline" size="sm" asChild>
                                          <a href="https://www.gov.uk/browse/working" target="_blank" rel="noopener noreferrer">
                                            <Briefcase className="w-4 h-4 mr-2" />
                                            Working in UK
                                          </a>
                                        </Button>
                                      </div>
                                    </div>
                                  </>
                                );
                              })()
                            ) : (
                              <div className="text-center py-8 text-gray-500">
                                <Play className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                <p>Loading action plan...</p>
                              </div>
                            )}
                          </TabsContent>
                        </Tabs>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </>
  );
};

export default CareerExplorationOverview; 