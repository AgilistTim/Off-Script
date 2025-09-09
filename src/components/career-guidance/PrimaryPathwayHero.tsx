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
      <Card className="border-blue-500/30 bg-gradient-to-br from-black/90 to-blue-500/10">
        <CardContent className="p-8 text-center">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-pink-500 rounded-full flex items-center justify-center mx-auto shadow-glow-blue">
              <MessageSquare className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-2xl font-street font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-pink-500">
              Start Your Career Exploration
            </h3>
            <p className="text-white/70 max-w-md mx-auto">
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
    if (confidence >= 90) return 'from-green-400 to-yellow-400';
    if (confidence >= 80) return 'from-blue-500 to-pink-500';
    return 'from-purple-500 to-blue-500';
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 90) return 'Excellent Match';
    if (confidence >= 80) return 'Great Match';
    return 'Good Match';
  };

  // 🎯 ENHANCED DATA PRIORITY: Use Perplexity data when available, fallback to legacy fields
  const getEnhancedSalaryDisplay = (): string => {
    // 1. Try enhanced Perplexity salary data (most accurate)
    if (pathway.perplexityData?.verifiedSalaryRanges) {
      const salary = pathway.perplexityData.verifiedSalaryRanges;
      return `£${salary.entry.min.toLocaleString()} - £${salary.senior.max.toLocaleString()}`;
    }
    
    // 2. Try compensation rewards (comprehensive schema)
    if (pathway.compensationRewards?.salaryRange) {
      const salary = pathway.compensationRewards.salaryRange;
      return `£${salary.entry.toLocaleString()} - £${salary.senior.toLocaleString()}`;
    }
    
    // 3. Fallback to legacy averageSalary
    return formatSalaryDisplay(pathway.averageSalary);
  };

  const getEnhancedGrowthOutlook = (): string => {
    // 1. Try enhanced Perplexity market data
    if (pathway.perplexityData?.realTimeMarketDemand) {
      const growth = pathway.perplexityData.realTimeMarketDemand.growthRate;
      const competition = pathway.perplexityData.realTimeMarketDemand.competitionLevel;
      return `${(growth * 100).toFixed(1)}% growth • ${competition} competition`;
    }
    
    // 2. Try Perplexity industry projection
    if (pathway.perplexityData?.industryGrowthProjection) {
      const outlook = pathway.perplexityData.industryGrowthProjection.outlook;
      const nextYear = pathway.perplexityData.industryGrowthProjection.nextYear;
      return `${outlook} • ${nextYear}% next year`;
    }
    
    // 3. Try labour market dynamics
    if (pathway.labourMarketDynamics?.demandOutlook?.growthForecast) {
      return pathway.labourMarketDynamics.demandOutlook.growthForecast;
    }
    
    // 4. Fallback to legacy growthOutlook
    return pathway.growthOutlook || 'Growing demand';
  };

  const getEnhancedIndustry = (): string => {
    // 1. Try work environment culture data
    if (pathway.workEnvironmentCulture?.typicalEmployers?.length > 0) {
      return pathway.workEnvironmentCulture.typicalEmployers[0];
    }
    
    // 2. Fallback to legacy industry
    return pathway.industry || 'Technology';
  };

  const salaryDisplay = getEnhancedSalaryDisplay();
  const growthDisplay = getEnhancedGrowthOutlook();
  const industryDisplay = getEnhancedIndustry();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Card className="border-blue-500/30 bg-gradient-to-br from-black/90 to-blue-500/10 shadow-glow-blue">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start justify-between mb-6 gap-4 sm:gap-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <Crown className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                  <Badge className="bg-gradient-to-r from-green-400 to-yellow-400 text-black font-bold px-2 py-1 sm:px-3 text-xs sm:text-sm">
                    <Star className="w-3 h-3 mr-1" />
                    YOUR BEST MATCH
                  </Badge>
                  {pathway.isEnhanced && (
                    <Badge className="bg-gradient-to-r from-pink-500 to-blue-500 text-white font-bold px-2 py-1 sm:px-3 text-xs sm:text-sm">
                      <Sparkles className="w-3 h-3 mr-1" />
                      ENHANCED DATA
                    </Badge>
                  )}
                  {pathway.perplexityData && (
                    <Badge className="bg-gradient-to-r from-yellow-400 to-green-400 text-black font-bold px-2 py-1 sm:px-3 text-xs sm:text-sm">
                      <Star className="w-3 h-3 mr-1" />
                      REAL-TIME UK DATA
                    </Badge>
                  )}
                  <Badge 
                    className={`bg-gradient-to-r ${getConfidenceColor(pathway.confidence || 95)} text-black font-bold px-2 py-1 sm:px-3 text-xs sm:text-sm`}
                  >
                    {pathway.confidence || 95}% {getConfidenceText(pathway.confidence || 95)}
                  </Badge>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-street font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-pink-500 to-yellow-400 mb-2">
                  {pathway.title}
                </h1>
                <p className="text-base sm:text-lg text-white/80 max-w-2xl">
                  Based on our analysis of your interests and career discussion
                </p>
              </div>
            </div>
          </div>

          {/* Key Information Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {salaryDisplay && (
              <div className="bg-gradient-to-r from-green-400/20 to-yellow-400/20 border border-green-400/30 rounded-xl p-3 sm:p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-yellow-400 rounded-lg flex items-center justify-center">
                    <PoundSterling className="w-5 h-5 text-black" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-green-400">
                    {pathway.perplexityData?.verifiedSalaryRanges ? 'Verified Salary Range' : 'Salary Range'}
                  </h3>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-white">{salaryDisplay}</p>
              </div>
            )}

            {growthDisplay && (
              <div className="bg-gradient-to-r from-blue-500/20 to-pink-500/20 border border-blue-500/30 rounded-xl p-3 sm:p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-blue-500">
                    {pathway.perplexityData?.realTimeMarketDemand ? 'Market Demand' : 'Growth Outlook'}
                  </h3>
                </div>
                <p className="text-lg sm:text-xl font-bold text-white">{growthDisplay}</p>
              </div>
            )}

            {industryDisplay && (
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-3 sm:p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-purple-500">
                    {pathway.workEnvironmentCulture?.typicalEmployers ? 'Top Employer' : 'Industry'}
                  </h3>
                </div>
                <p className="text-lg sm:text-xl font-bold text-white">{industryDisplay}</p>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="mb-8">
            <p className="text-xl text-white/90 leading-relaxed">
              {pathway.description}
            </p>
          </div>

          {/* Key Skills Preview */}
          {pathway.keySkills && pathway.keySkills.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-bold text-pink-500 mb-4 flex items-center">
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
                    className="px-4 py-2 bg-gradient-to-r from-blue-500/20 to-pink-500/20 border border-blue-500/30 rounded-full text-white font-medium hover:scale-105 transition-transform duration-200"
                  >
                    {skill}
                  </motion.span>
                ))}
                {pathway.keySkills.length > 6 && (
                  <span className="px-4 py-2 bg-gradient-to-r from-yellow-400/20 to-green-400/20 border border-yellow-400/30 rounded-full text-white font-medium">
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
                <div className="bg-gradient-to-r from-yellow-400/20 to-green-400/20 border border-yellow-400/30 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-yellow-400 mb-3 flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    A Day in the Life
                  </h3>
                  <p className="text-white/90 leading-relaxed">
                    {pathway.dayInTheLife}
                  </p>
                </div>
              )}

              {/* Career Progression Preview */}
              {pathway.careerProgression && pathway.careerProgression.length > 0 && (
                <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-blue-500 mb-3 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Career Progression Path
                  </h3>
                  <div className="space-y-2">
                    {pathway.careerProgression.slice(0, 2).map((step: string, index: number) => (
                      <div key={index} className="flex items-start">
                        <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mr-3 mt-1 text-black font-bold text-xs">
                          {index + 1}
                        </div>
                        <span className="text-white/90 text-sm">{step}</span>
                      </div>
                    ))}
                    {pathway.careerProgression.length > 2 && (
                      <p className="text-white/60 text-sm ml-9">
                        +{pathway.careerProgression.length - 2} more progression steps
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Industry Trends Preview */}
              {pathway.industryTrends && pathway.industryTrends.length > 0 && (
                <div className="bg-gradient-to-r from-pink-500/20 to-orange-500/20 border border-pink-500/30 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-pink-500 mb-3 flex items-center">
                    <Star className="w-5 h-5 mr-2" />
                    Industry Outlook
                  </h3>
                  <div className="space-y-2">
                    {pathway.industryTrends.slice(0, 2).map((trend: string, index: number) => (
                      <div key={index} className="flex items-start">
                        <ChevronRight className="w-4 h-4 text-pink-500 mr-2 mt-1 flex-shrink-0" />
                        <span className="text-white/90 text-sm">{trend}</span>
                      </div>
                    ))}
                    {pathway.industryTrends.length > 2 && (
                      <p className="text-white/60 text-sm ml-6">
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
                className="flex-1 bg-gradient-to-r from-blue-500 via-pink-500 to-yellow-400 text-black font-bold text-base sm:text-lg py-3 sm:py-4 px-6 sm:px-8 rounded-xl hover:scale-105 transition-transform duration-200 shadow-glow-blue"
              >
                <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
                Ask AI About This Career
              </Button>
            )}
            
            {onExplorePath && (
              <Button 
                onClick={onExplorePath}
                variant="outline"
                className="flex-1 border-blue-500/50 text-blue-500 hover:bg-blue-500/10 font-bold text-base sm:text-lg py-3 sm:py-4 px-6 sm:px-8 rounded-xl transition-all duration-200"
              >
                <span>View Full Details</span>
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            )}
          </div>

          {/* Location Badge */}
          <div className="flex items-center justify-center mt-6 pt-6 border-t border-blue-500/20">
            <div className="flex items-center space-x-2 text-white/60">
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