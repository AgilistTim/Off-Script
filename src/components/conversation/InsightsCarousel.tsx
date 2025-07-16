import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Lightbulb, ArrowRight, Clock, Target } from 'lucide-react';
import { CareerInsight } from '../../services/quickValueService';

export interface InsightsCarouselProps {
  insights: CareerInsight[];
  onInsightClick?: (insight: CareerInsight) => void;
  onActionClick?: (insight: CareerInsight) => void;
  className?: string;
  showPagination?: boolean;
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

export const InsightsCarousel: React.FC<InsightsCarouselProps> = ({
  insights,
  onInsightClick,
  onActionClick,
  className = '',
  showPagination = true,
  autoPlay = false,
  autoPlayInterval = 10000
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  // Ensure we have insights to display
  if (!insights || insights.length === 0) {
    return null;
  }

  // Auto-play functionality
  React.useEffect(() => {
    if (autoPlay && insights.length > 1) {
      autoPlayRef.current = setInterval(() => {
        handleNext();
      }, autoPlayInterval);
      
      return () => {
        if (autoPlayRef.current) {
          clearInterval(autoPlayRef.current);
        }
      };
    }
  }, [autoPlay, autoPlayInterval, insights.length]);

  // Stop auto-play on user interaction
  const stopAutoPlay = useCallback(() => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
      autoPlayRef.current = null;
    }
  }, []);

  // Navigation handlers
  const handleNext = useCallback(() => {
    stopAutoPlay();
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % insights.length);
  }, [insights.length, stopAutoPlay]);

  const handlePrevious = useCallback(() => {
    stopAutoPlay();
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + insights.length) % insights.length);
  }, [insights.length, stopAutoPlay]);

  const handleDotClick = useCallback((index: number) => {
    stopAutoPlay();
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  }, [currentIndex, stopAutoPlay]);

  // Get category icon
  const getCategoryIcon = (category: CareerInsight['category']) => {
    switch (category) {
      case 'pathway':
        return <Target className="w-4 h-4" />;
      case 'skill':
        return <Lightbulb className="w-4 h-4" />;
      case 'opportunity':
        return <ArrowRight className="w-4 h-4" />;
      case 'next_step':
        return <Clock className="w-4 h-4" />;
      case 'industry_trend':
        return <Target className="w-4 h-4" />;
      default:
        return <Lightbulb className="w-4 h-4" />;
    }
  };

  // Get category color
  const getCategoryColor = (category: CareerInsight['category']) => {
    switch (category) {
      case 'pathway':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'skill':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'opportunity':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'next_step':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'industry_trend':
        return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Animation variants for the slideshow
  const slideVariants = {
    hidden: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0
    }),
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        x: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 }
      }
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      transition: {
        x: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 }
      }
    })
  };

  // Card animation variants
  const cardVariants = {
    idle: { scale: 1, y: 0 },
    hover: { 
      scale: 1.02, 
      y: -2,
      transition: { duration: 0.2 }
    },
    tap: { 
      scale: 0.98,
      transition: { duration: 0.1 }
    }
  };

  const currentInsight = insights[currentIndex];

  return (
    <div className={`insights-carousel ${className} bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Lightbulb className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">Career Insights</h3>
          <span className="text-sm text-gray-500">
            ({currentIndex + 1} of {insights.length})
          </span>
        </div>
        
        {/* Navigation buttons */}
        {insights.length > 1 && (
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrevious}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-white rounded-lg transition-colors"
              aria-label="Previous insight"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-white rounded-lg transition-colors"
              aria-label="Next insight"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Main carousel area */}
      <div className="relative overflow-hidden rounded-lg">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full"
          >
            <motion.div
              variants={cardVariants}
              initial="idle"
              whileHover="hover"
              whileTap="tap"
              className="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer shadow-sm"
              onClick={() => onInsightClick?.(currentInsight)}
            >
              {/* Category badge */}
              <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full border text-xs font-medium mb-3 ${getCategoryColor(currentInsight.category)}`}>
                {getCategoryIcon(currentInsight.category)}
                <span className="capitalize">{currentInsight.category.replace('_', ' ')}</span>
              </div>

              {/* Title */}
              <h4 className="text-xl font-semibold text-gray-800 mb-2 leading-tight">
                {currentInsight.title}
              </h4>

              {/* Description */}
              <p className="text-gray-600 mb-4 leading-relaxed">
                {currentInsight.description}
              </p>

              {/* Actionable step */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
                <div className="flex items-start space-x-2">
                  <ArrowRight className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
                  <p className="text-blue-700 text-sm font-medium">
                    {currentInsight.actionableStep}
                  </p>
                </div>
              </div>

              {/* Footer with metadata */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center space-x-4">
                  <span>Time to value: {currentInsight.timeToValue}</span>
                  <span>•</span>
                  <span>Confidence: {Math.round(currentInsight.confidence * 100)}%</span>
                </div>
                
                {onActionClick && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onActionClick(currentInsight);
                    }}
                    className="bg-blue-500 text-white px-3 py-1 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                  >
                    Learn More
                  </motion.button>
                )}
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Pagination dots */}
      {showPagination && insights.length > 1 && (
        <div className="flex items-center justify-center space-x-2 mt-4">
          {insights.map((_, index) => (
            <motion.button
              key={index}
              onClick={() => handleDotClick(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex 
                  ? 'bg-blue-500' 
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              aria-label={`Go to insight ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Mobile swipe hint */}
      <div className="md:hidden text-center mt-2">
        <p className="text-xs text-gray-500">
          ← Swipe to see more insights →
        </p>
      </div>
    </div>
  );
}; 