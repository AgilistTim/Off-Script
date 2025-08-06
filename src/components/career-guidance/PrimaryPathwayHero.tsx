import React from 'react';
import { motion } from 'framer-motion';
import { 
  Star, 
  PoundSterling, 
  TrendingUp, 
  MapPin, 
  Briefcase,
  MessageSquare,
  Sparkles,
  Crown,
  ChevronRight,
  Clock
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface PrimaryPathwayHeroProps {
  pathway: any;
  onAskAI?: () => void;
  onExplorePath?: () => void;
}

const PrimaryPathwayHero: React.FC<PrimaryPathwayHeroProps> = ({ 
  pathway, 
  onAskAI,
  onExplorePath 
}) => {
  if (!pathway) {
    return (
      <Card className="border-electric-blue/30 bg-gradient-to-br from-primary-black/90 to-electric-blue/10">
        <CardContent className="p-8 text-center">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-gradient-to-br from-electric-blue to-neon-pink rounded-full flex items-center justify-center mx-auto shadow-glow-blue">
              <MessageSquare className="h-8 w-8 text-primary-white" />
            </div>
            <h3 className="text-2xl font-street font-black text-transparent bg-clip-text bg-gradient-to-r from-electric-blue to-neon-pink">
              Start Your Career Exploration
            </h3>
            <p className="text-primary-white/70 max-w-md mx-auto">
              Have a conversation with our AI to discover personalized career paths tailored to your interests and goals.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatSalaryDisplay = (salary: any): string => {
    if (!salary) return '';
    if (typeof salary === 'string') return salary;
    
    if (salary.entry && salary.senior && typeof salary.entry === 'number') {
      return `£${salary.entry.toLocaleString()} - £${salary.senior.toLocaleString()}`;
    }
    if (salary.entry && salary.experienced) {
      const entryMatch = salary.entry.match?.(/[\d,]+/) || [salary.entry];
      const expMatch = salary.experienced.match?.(/[\d,]+/) || [salary.experienced];
      return `£${entryMatch[0]} - £${expMatch[0]}`;
    }
    
    return '';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'from-acid-green to-cyber-yellow';
    if (confidence >= 80) return 'from-electric-blue to-neon-pink';
    return 'from-cyber-purple to-electric-blue';
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 90) return 'Excellent Match';
    if (confidence >= 80) return 'Great Match';
    return 'Good Match';
  };

  const salaryDisplay = formatSalaryDisplay(pathway.averageSalary);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Card className="border-electric-blue/30 bg-gradient-to-br from-primary-black/90 to-electric-blue/10 shadow-glow-blue">
        <CardContent className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-electric-blue to-neon-pink rounded-xl flex items-center justify-center shadow-lg">
                <Crown className="h-8 w-8 text-primary-white" />
              </div>
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <Badge className="bg-gradient-to-r from-acid-green to-cyber-yellow text-primary-black font-bold px-3 py-1">
                    <Star className="w-3 h-3 mr-1" />
                    YOUR BEST MATCH
                  </Badge>
                  {pathway.isEnhanced && (
                    <Badge className="bg-gradient-to-r from-neon-pink to-electric-blue text-primary-white font-bold px-3 py-1">
                      <Sparkles className="w-3 h-3 mr-1" />
                      ENHANCED DATA
                    </Badge>
                  )}
                  <Badge 
                    className={`bg-gradient-to-r ${getConfidenceColor(pathway.confidence || 95)} text-primary-black font-bold px-3 py-1`}
                  >
                    {pathway.confidence || 95}% {getConfidenceText(pathway.confidence || 95)}
                  </Badge>
                </div>
                <h1 className="text-4xl font-street font-black text-transparent bg-clip-text bg-gradient-to-r from-electric-blue via-neon-pink to-cyber-yellow mb-2">
                  {pathway.title}
                </h1>
                <p className="text-lg text-primary-white/80 max-w-2xl">
                  Based on our analysis of your interests and career discussion
                </p>
              </div>
            </div>
          </div>

          {/* Key Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {salaryDisplay && (
              <div className="bg-gradient-to-r from-acid-green/20 to-cyber-yellow/20 border border-acid-green/30 rounded-xl p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-acid-green to-cyber-yellow rounded-lg flex items-center justify-center">
                    <PoundSterling className="w-5 h-5 text-primary-black" />
                  </div>
                  <h3 className="text-lg font-bold text-acid-green">Salary Range</h3>
                </div>
                <p className="text-2xl font-black text-primary-white">{salaryDisplay}</p>
              </div>
            )}

            {pathway.growthOutlook && (
              <div className="bg-gradient-to-r from-electric-blue/20 to-neon-pink/20 border border-electric-blue/30 rounded-xl p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-electric-blue to-neon-pink rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-primary-white" />
                  </div>
                  <h3 className="text-lg font-bold text-electric-blue">Growth Outlook</h3>
                </div>
                <p className="text-xl font-bold text-primary-white">{pathway.growthOutlook}</p>
              </div>
            )}

            {pathway.industry && (
              <div className="bg-gradient-to-r from-cyber-purple/20 to-neon-pink/20 border border-cyber-purple/30 rounded-xl p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-cyber-purple to-neon-pink rounded-lg flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-primary-white" />
                  </div>
                  <h3 className="text-lg font-bold text-cyber-purple">Industry</h3>
                </div>
                <p className="text-xl font-bold text-primary-white">{pathway.industry}</p>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="mb-8">
            <p className="text-xl text-primary-white/90 leading-relaxed">
              {pathway.description}
            </p>
          </div>

          {/* Key Skills Preview */}
          {pathway.keySkills && pathway.keySkills.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-bold text-neon-pink mb-4 flex items-center">
                <Sparkles className="w-6 h-6 mr-2" />
                Key Skills Required
              </h3>
              <div className="flex flex-wrap gap-3">
                {pathway.keySkills.slice(0, 6).map((skill: string, index: number) => (
                  <motion.span
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="px-4 py-2 bg-gradient-to-r from-electric-blue/20 to-neon-pink/20 border border-electric-blue/30 rounded-full text-primary-white font-medium hover:scale-105 transition-transform duration-200"
                  >
                    {skill}
                  </motion.span>
                ))}
                {pathway.keySkills.length > 6 && (
                  <span className="px-4 py-2 bg-gradient-to-r from-cyber-yellow/20 to-acid-green/20 border border-cyber-yellow/30 rounded-full text-primary-white font-medium">
                    +{pathway.keySkills.length - 6} more skills
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Additional Career Intelligence Preview */}
          {(pathway.dayInTheLife || pathway.careerProgression || pathway.industryTrends) && (
            <div className="mb-8 space-y-6">
              {/* Day in the Life */}
              {pathway.dayInTheLife && (
                <div className="bg-gradient-to-r from-cyber-yellow/20 to-acid-green/20 border border-cyber-yellow/30 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-cyber-yellow mb-3 flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    A Day in the Life
                  </h3>
                  <p className="text-primary-white/90 leading-relaxed">
                    {pathway.dayInTheLife}
                  </p>
                </div>
              )}

              {/* Career Progression Preview */}
              {pathway.careerProgression && pathway.careerProgression.length > 0 && (
                <div className="bg-gradient-to-r from-electric-blue/20 to-cyber-blue/20 border border-electric-blue/30 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-electric-blue mb-3 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Career Progression Path
                  </h3>
                  <div className="space-y-2">
                    {pathway.careerProgression.slice(0, 2).map((step: string, index: number) => (
                      <div key={index} className="flex items-start">
                        <div className="w-6 h-6 bg-gradient-to-br from-electric-blue to-cyber-blue rounded-full flex items-center justify-center mr-3 mt-1 text-primary-black font-bold text-xs">
                          {index + 1}
                        </div>
                        <span className="text-primary-white/90 text-sm">{step}</span>
                      </div>
                    ))}
                    {pathway.careerProgression.length > 2 && (
                      <p className="text-primary-white/60 text-sm ml-9">
                        +{pathway.careerProgression.length - 2} more progression steps
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Industry Trends Preview */}
              {pathway.industryTrends && pathway.industryTrends.length > 0 && (
                <div className="bg-gradient-to-r from-neon-pink/20 to-sunset-orange/20 border border-neon-pink/30 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-neon-pink mb-3 flex items-center">
                    <Star className="w-5 h-5 mr-2" />
                    Industry Outlook
                  </h3>
                  <div className="space-y-2">
                    {pathway.industryTrends.slice(0, 2).map((trend: string, index: number) => (
                      <div key={index} className="flex items-start">
                        <ChevronRight className="w-4 h-4 text-neon-pink mr-2 mt-1 flex-shrink-0" />
                        <span className="text-primary-white/90 text-sm">{trend}</span>
                      </div>
                    ))}
                    {pathway.industryTrends.length > 2 && (
                      <p className="text-primary-white/60 text-sm ml-6">
                        +{pathway.industryTrends.length - 2} more trends
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            {onAskAI && (
              <Button 
                onClick={onAskAI}
                className="flex-1 bg-gradient-to-r from-electric-blue via-neon-pink to-cyber-yellow text-primary-black font-black text-lg py-4 px-8 rounded-xl hover:scale-105 transition-transform duration-200 shadow-glow-blue"
              >
                <MessageSquare className="w-6 h-6 mr-3" />
                Ask AI About This Career
              </Button>
            )}
            
            {onExplorePath && (
              <Button 
                onClick={onExplorePath}
                variant="outline"
                className="flex-1 border-electric-blue/50 text-electric-blue hover:bg-electric-blue/10 font-bold text-lg py-4 px-8 rounded-xl transition-all duration-200"
              >
                <span>View Full Details</span>
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            )}
          </div>

          {/* Location Badge */}
          <div className="flex items-center justify-center mt-6 pt-6 border-t border-electric-blue/20">
            <div className="flex items-center space-x-2 text-primary-white/60">
              <MapPin className="w-4 h-4" />
              <span className="text-sm font-medium">UK Career Path</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PrimaryPathwayHero;