import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CareerDetailsModal } from '../ui/career-details-modal';
import { useAuth } from '../../context/AuthContext';
import careerPathwayService from '../../services/careerPathwayService';

// Use the same interface as CareerDetailsModal for consistency
interface CareerCard {
  id: string;
  title: string;
  description: string;
  industry?: string;
  averageSalary?: {
    entry: string;
    experienced: string;
    senior: string;
  };
  salaryRange?: string; // MCP server format
  growthOutlook?: string;
  marketOutlook?: string; // MCP server format  
  entryRequirements?: string[];
  trainingPathways?: string[];
  trainingPathway?: string; // MCP server format (singular)
  keySkills?: string[];
  skillsRequired?: string[]; // MCP server format
  workEnvironment?: string;
  nextSteps?: string[];
  location?: string;
  confidence?: number;
}

interface CareerCardsPanelProps {
  cards: CareerCard[];
  className?: string;
}

export const CareerCardsPanel: React.FC<CareerCardsPanelProps> = ({
  cards,
  className = ''
}) => {
  const { currentUser } = useAuth();
  const [selectedCard, setSelectedCard] = useState<CareerCard | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Handle refreshing career card details with OpenAI enhancement
  const handleRefreshDetails = async (cardId: string) => {
    if (!currentUser || !selectedCard) return;
    
    try {
      console.log('🔄 Refreshing career card details:', selectedCard.title);
      const success = await careerPathwayService.enhanceCareerCardDetails(
        currentUser.uid, 
        cardId, 
        selectedCard.title
      );
      
      if (success) {
        console.log('✅ Career card details enhanced successfully');
        // The modal will automatically refresh when the data updates
        // You could add a toast notification here if desired
      } else {
        console.warn('⚠️ Failed to enhance career card details');
      }
    } catch (error) {
      console.error('❌ Error refreshing career card details:', error);
    }
  };

  // Helper function to generate truly unique ID only when needed
  const generateUniqueId = (card: CareerCard, index: number): string => {
    // NEVER regenerate if card already has a valid ID
    if (card.id && card.id !== '' && card.id.length > 5) {
      return card.id;
    }
    
    // Create a stable, unique ID based on content hash
    const titleHash = card.title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 20);
    const descHash = card.description ? card.description.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10) : '';
    
    // Use a more stable approach - don't use timestamp which changes
    const stableHash = titleHash + '-' + descHash + '-' + index;
    return `career-generated-${stableHash}`;
  };

  // Memoize normalized cards to prevent regeneration on every render
  const normalizedCards: CareerCard[] = useMemo(() => {
    console.log('🔧 CareerCardsPanel: Processing cards for normalization:', {
      totalCards: cards.length,
      cardIds: cards.map(c => ({ title: c.title.substring(0, 20), id: c.id || 'NO_ID' }))
    });
    
    return cards.map((card, index) => {
      // Only generate ID if absolutely necessary
      const finalId = generateUniqueId(card, index);
      const wasGenerated = finalId !== card.id;
      
      if (wasGenerated) {
        console.log('🔧 Generated new ID for card:', {
          title: card.title.substring(0, 30),
          originalId: card.id || 'NO_ID',
          newId: finalId,
          index
        });
      }
      
      return {
        ...card,
        id: finalId,
        industry: card.industry || 'Technology',
        location: card.location || 'UK'
      };
    });
  }, [cards]); // Only recalculate when cards array actually changes

  // Debug: Check for duplicate IDs in final normalized cards
  React.useEffect(() => {
    const ids = normalizedCards.map(card => card.id);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    
    if (duplicateIds.length > 0) {
      console.error('🚨 DUPLICATE IDs DETECTED in CareerCardsPanel:', {
        duplicateIds,
        allIds: ids,
        totalCards: normalizedCards.length
      });
    } else {
      console.log('✅ All career card IDs are unique:', ids.length, 'cards');
    }
  }, [normalizedCards]);

  const handleCardClick = (card: CareerCard) => {
    setSelectedCard(card);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCard(null);
  };

  // Helper function to get salary display
  const getSalaryDisplay = (card: CareerCard): string => {
    if (card.salaryRange) return card.salaryRange;
    if (card.averageSalary?.entry) return card.averageSalary.entry;
    return 'Competitive salary';
  };

  // Helper function to get skills array
  const getSkills = (card: CareerCard): string[] => {
    return card.keySkills || card.skillsRequired || [];
  };

  // Helper function to get growth outlook  
  const getGrowthOutlook = (card: CareerCard): string => {
    return card.growthOutlook || card.marketOutlook || 'Good prospects';
  };

  if (cards.length === 0) {
    return (
      <div className={`career-cards-panel ${className}`}>
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0H8m8 0v2m-8-2v2m0 0v8a2 2 0 002 2h4a2 2 0 002-2V8m-8 0V6a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">
              Career Cards Will Appear Here
            </h3>
            <p className="text-gray-600 text-sm">
              Start talking about your interests in the voice chat, and I'll generate personalized career recommendations for you.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`career-cards-panel ${className}`}>
      <div className="bg-white rounded-lg border shadow-sm">
        {/* Header */}
        <div className="p-4 border-b bg-gray-50 rounded-t-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              🎯 Your Career Matches
            </h2>
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {normalizedCards.length} recommendation{normalizedCards.length !== 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-gray-600 text-sm mt-1">
            Based on our conversation analysis
          </p>
        </div>

        {/* Cards Grid */}
        <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {normalizedCards.map((card, index) => {
              const skills = getSkills(card);
              return (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 cursor-pointer group"
                  onClick={() => handleCardClick(card)}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                        {card.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {card.industry}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        {Math.round((card.confidence || 0.85) * 100)}% match
                      </div>
                    </div>
                  </div>

                  {/* Card Content */}
                  <p className="text-gray-700 text-sm mb-3 line-clamp-2">
                    {card.description}
                  </p>

                  {/* Salary Range */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      <span className="text-sm text-gray-600">
                        {getSalaryDisplay(card)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {card.location}
                    </div>
                  </div>

                  {/* Key Skills Preview */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {skills.slice(0, 3).map((skill, skillIndex) => (
                      <span 
                        key={skillIndex}
                        className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded"
                      >
                        {skill}
                      </span>
                    ))}
                    {skills.length > 3 && (
                      <span className="text-xs text-gray-500 px-2 py-1">
                        +{skills.length - 3} more
                      </span>
                    )}
                  </div>

                  {/* Growth Outlook */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      <span className="text-sm text-gray-600">
                        {getGrowthOutlook(card)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      Click for details →
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {normalizedCards.length > 0 && (
          <div className="p-4 border-t bg-gray-50 rounded-b-lg">
            <p className="text-xs text-gray-500 text-center">
              💡 Keep talking about your interests to discover more career paths!
            </p>
          </div>
        )}
      </div>

      {/* Career Details Modal */}
      <CareerDetailsModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        careerCard={selectedCard}
        onRefreshDetails={currentUser ? handleRefreshDetails : undefined}
      />
    </div>
  );
}; 