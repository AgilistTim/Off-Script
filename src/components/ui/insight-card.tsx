import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, TrendingUp, DollarSign, GraduationCap, MapPin, Clock } from 'lucide-react';
import { Card } from './card';
import { Button } from './button';
import { CareerCardData } from '../../services/conversationAnalyzer';

interface CareerCardProps {
  card: CareerCardData;
  onClick: () => void;
  className?: string;
}

export const CareerCard: React.FC<CareerCardProps> = ({ card, onClick, className = '' }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      className={`w-80 ${className}`}
    >
      <Card className="p-6 cursor-pointer border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-blue-50">
        <div onClick={onClick}>
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                {card.title}
              </h3>
              <div className="flex items-center text-sm text-gray-600 mb-2">
                <MapPin className="w-4 h-4 mr-1" />
                <span>{card.industry} • {card.location}</span>
              </div>
            </div>
            <div className="flex items-center text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
              <TrendingUp className="w-3 h-3 mr-1" />
              {card.growthOutlook.split(' - ')[0]}
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-700 mb-4 line-clamp-2">
            {card.description}
          </p>

          {/* Salary Range */}
          <div className="mb-4">
            <div className="flex items-center mb-2">
              <DollarSign className="w-4 h-4 text-green-600 mr-1" />
              <span className="text-sm font-medium text-gray-900">Salary Range</span>
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>Entry: <strong>{card.averageSalary.entry}</strong></span>
              <span>Exp: <strong>{card.averageSalary.experienced}</strong></span>
              <span>Senior: <strong>{card.averageSalary.senior}</strong></span>
            </div>
          </div>

          {/* Key Skills */}
          <div className="mb-4">
            <div className="flex items-center mb-2">
              <GraduationCap className="w-4 h-4 text-blue-600 mr-1" />
              <span className="text-sm font-medium text-gray-900">Key Skills</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {card.keySkills.slice(0, 3).map((skill, index) => (
                <span
                  key={index}
                  className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full"
                >
                  {skill}
                </span>
              ))}
              {card.keySkills.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{card.keySkills.length - 3} more
                </span>
              )}
            </div>
          </div>

          {/* Next Steps Preview */}
          <div className="mb-4">
            <div className="flex items-center mb-2">
              <Clock className="w-4 h-4 text-purple-600 mr-1" />
              <span className="text-sm font-medium text-gray-900">Next Steps</span>
            </div>
            <ul className="text-xs text-gray-600 space-y-1">
              {card.nextSteps.slice(0, 2).map((step, index) => (
                <li key={index} className="flex items-center">
                  <div className="w-1 h-1 bg-purple-400 rounded-full mr-2" />
                  {step}
                </li>
              ))}
              {card.nextSteps.length > 2 && (
                <li className="text-gray-500 italic">
                  +{card.nextSteps.length - 2} more steps...
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Action Button */}
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white"
          size="sm"
        >
          Explore This Path
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </Card>
    </motion.div>
  );
};

// Legacy insight card for backward compatibility
export interface InsightCardProps {
  title: string;
  description: string;
  confidence: number;
  onClick: () => void;
  className?: string;
  type?: string;
  onAction?: () => void;
  isInteractive?: boolean;
}

export const InsightCard: React.FC<InsightCardProps> = ({
  title,
  description,
  confidence,
  onClick,
  className = '',
  onAction,
  isInteractive = false
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={className}
    >
      <Card
        className="p-4 cursor-pointer border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200"
        onClick={onAction || onClick}
      >
        <div className="flex items-start justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
          <span className="text-xs text-gray-500">{Math.round(confidence * 100)}%</span>
        </div>
        <p className="text-xs text-gray-600 line-clamp-2">{description}</p>
      </Card>
    </motion.div>
  );
}; 