import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown,
  ChevronUp,
  Star,
  PoundSterling,
  TrendingUp,
  Briefcase,
  MessageSquare,
  BarChart3,
  Eye,
  EyeOff,
  Sparkles
} from 'lucide-react';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface AlternativePathwaysAccordionProps {
  alternatives: any[];
  showAll?: boolean;
  onToggleShowAll?: () => void;
  onAskAI?: (pathway: any) => void;
  onCompareToPrimary?: (pathway: any) => void;
}

const AlternativePathwaysAccordion: React.FC<AlternativePathwaysAccordionProps> = ({
  alternatives,
  showAll = false,
  onToggleShowAll,
  onAskAI,
  onCompareToPrimary
}) => {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  if (!alternatives || alternatives.length === 0) {
    return null;
  }

  const displayedAlternatives = showAll ? alternatives : alternatives.slice(0, 5);
  const hasMoreThanFive = alternatives.length > 5;

  const formatSalaryDisplay = (salary: any): string => {
    if (!salary) return '';
    if (typeof salary === 'string') return salary;
    
    if (salary.entry && salary.experienced) {
      const entryMatch = salary.entry.match?.(/[\d,]+/) || [salary.entry];
      const expMatch = salary.experienced.match?.(/[\d,]+/) || [salary.experienced];
      return `£${entryMatch[0]} - £${expMatch[0]}`;
    }
    
    return '';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'from-electric-blue to-neon-pink';
    if (confidence >= 70) return 'from-cyber-purple to-electric-blue';
    return 'from-sunset-orange to-neon-pink';
  };

  const getRankIcon = (rank: number) => {
    const iconClass = "w-6 h-6 text-primary-white";
    switch (rank) {
      case 2: return <Star className={iconClass} />;
      case 3: return <BarChart3 className={iconClass} />;
      default: return <Briefcase className={iconClass} />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="space-y-6"
    >
      {/* Section Header */}
      <div className="text-center">
        <h2 className="text-3xl font-street font-black text-transparent bg-clip-text bg-gradient-to-r from-electric-blue to-neon-pink mb-4">
          Alternative Paths Worth Exploring
        </h2>
        <p className="text-lg text-primary-white/80 max-w-2xl mx-auto">
          Related careers that also match your profile, ranked by relevance
        </p>
      </div>

      {/* Alternatives List */}
      <Card className="border-electric-blue/30 bg-gradient-to-br from-primary-black/90 to-electric-blue/10">
        <CardContent className="p-6">
          <Accordion 
            type="multiple" 
            value={expandedItems}
            onValueChange={setExpandedItems}
            className="space-y-4"
          >
            {displayedAlternatives.map((pathway, index) => {
              const salaryDisplay = formatSalaryDisplay(pathway.averageSalary);
              
              return (
                <AccordionItem 
                  key={pathway.id} 
                  value={pathway.id}
                  className="border border-electric-blue/20 rounded-xl overflow-hidden bg-gradient-to-r from-primary-black/50 to-electric-blue/5 hover:from-primary-black/70 hover:to-electric-blue/10 transition-all duration-200"
                >
                  <AccordionTrigger className="px-6 py-4 hover:no-underline">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center space-x-4">
                        {/* Rank Icon */}
                        <div className="w-10 h-10 bg-gradient-to-br from-electric-blue to-neon-pink rounded-xl flex items-center justify-center flex-shrink-0">
                          {getRankIcon(pathway.rank)}
                        </div>
                        
                        {/* Career Info */}
                        <div className="flex-1 text-left min-w-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-xl font-bold text-primary-white truncate">
                              {pathway.title}
                            </h3>
                            <Badge 
                              className={`bg-gradient-to-r ${getConfidenceColor(pathway.confidence)} text-primary-white font-bold text-xs px-2 py-1 flex-shrink-0`}
                            >
                              #{pathway.rank} • {pathway.confidence}% match
                            </Badge>
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-primary-white/60">
                            {pathway.industry && (
                              <span className="flex items-center">
                                <Briefcase className="w-4 h-4 mr-1" />
                                {pathway.industry}
                              </span>
                            )}
                            {salaryDisplay && (
                              <span className="flex items-center">
                                <PoundSterling className="w-4 h-4 mr-1" />
                                {salaryDisplay}
                              </span>
                            )}
                            {pathway.growthOutlook && (
                              <span className="flex items-center">
                                <TrendingUp className="w-4 h-4 mr-1" />
                                {pathway.growthOutlook}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  
                  <AccordionContent className="px-6 pb-4">
                    <div className="space-y-4 pt-4 border-t border-electric-blue/20">
                      {/* Description */}
                      <p className="text-primary-white/80 leading-relaxed">
                        {pathway.description}
                      </p>
                      
                      {/* Enhanced Career Information Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {/* Salary Details */}
                        {pathway.enhancedSalary && (
                          <div className="bg-gradient-to-r from-acid-green/20 to-cyber-yellow/20 border border-acid-green/30 rounded-lg p-4">
                            <h4 className="text-sm font-bold text-acid-green mb-2 flex items-center">
                              <PoundSterling className="w-4 h-4 mr-1" />
                              Enhanced Salary Data
                            </h4>
                            <div className="space-y-1 text-xs text-primary-white/80">
                              {pathway.enhancedSalary.entry && (
                                <div><span className="font-medium">Entry:</span> {pathway.enhancedSalary.entry}</div>
                              )}
                              {pathway.enhancedSalary.experienced && (
                                <div><span className="font-medium">Experienced:</span> {pathway.enhancedSalary.experienced}</div>
                              )}
                              {pathway.enhancedSalary.senior && (
                                <div><span className="font-medium">Senior:</span> {pathway.enhancedSalary.senior}</div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Work-Life Balance */}
                        {pathway.workLifeBalance && (
                          <div className="bg-gradient-to-r from-electric-blue/20 to-cyber-blue/20 border border-electric-blue/30 rounded-lg p-4">
                            <h4 className="text-sm font-bold text-electric-blue mb-2 flex items-center">
                              <Star className="w-4 h-4 mr-1" />
                              Work-Life Balance
                            </h4>
                            <div className="space-y-1 text-xs text-primary-white/80">
                              {pathway.workLifeBalance.typical_hours && (
                                <div><span className="font-medium">Hours:</span> {pathway.workLifeBalance.typical_hours}</div>
                              )}
                              {pathway.workLifeBalance.flexibility && (
                                <div><span className="font-medium">Flexibility:</span> {pathway.workLifeBalance.flexibility}</div>
                              )}
                              {pathway.workLifeBalance.stress_level && (
                                <div><span className="font-medium">Stress:</span> {pathway.workLifeBalance.stress_level}</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Key Skills */}
                      {pathway.keySkills && pathway.keySkills.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-bold text-neon-pink mb-2 flex items-center">
                            <Sparkles className="w-4 h-4 mr-1" />
                            Key Skills
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {pathway.keySkills.slice(0, 6).map((skill: string, skillIndex: number) => (
                              <span
                                key={skillIndex}
                                className="px-3 py-1 bg-gradient-to-r from-electric-blue/20 to-neon-pink/20 border border-electric-blue/30 rounded-full text-xs text-primary-white font-medium"
                              >
                                {skill}
                              </span>
                            ))}
                            {pathway.keySkills.length > 6 && (
                              <span className="px-3 py-1 bg-gradient-to-r from-cyber-yellow/20 to-acid-green/20 border border-cyber-yellow/30 rounded-full text-xs text-primary-white font-medium">
                                +{pathway.keySkills.length - 6} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Day in the Life Preview */}
                      {pathway.dayInTheLife && (
                        <div className="mb-4">
                          <h4 className="text-sm font-bold text-cyber-yellow mb-2 flex items-center">
                            <MessageSquare className="w-4 h-4 mr-1" />
                            Day in the Life
                          </h4>
                          <p className="text-xs text-primary-white/80 leading-relaxed">
                            {pathway.dayInTheLife.length > 200 
                              ? `${pathway.dayInTheLife.substring(0, 200)}...` 
                              : pathway.dayInTheLife
                            }
                          </p>
                        </div>
                      )}

                      {/* Top UK Employers Preview */}
                      {pathway.topUKEmployers && pathway.topUKEmployers.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-bold text-neon-pink mb-2 flex items-center">
                            <Briefcase className="w-4 h-4 mr-1" />
                            Top UK Employers
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {pathway.topUKEmployers.slice(0, 3).map((employer: any, empIndex: number) => (
                              <span
                                key={empIndex}
                                className="px-2 py-1 bg-gradient-to-r from-cyber-purple/20 to-neon-pink/20 border border-cyber-purple/30 rounded text-xs text-primary-white font-medium"
                              >
                                {employer.name || employer}
                              </span>
                            ))}
                            {pathway.topUKEmployers.length > 3 && (
                              <span className="text-xs text-primary-white/60">
                                +{pathway.topUKEmployers.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        {onAskAI && (
                          <Button 
                            onClick={() => onAskAI(pathway)}
                            className="flex-1 bg-gradient-to-r from-electric-blue/20 to-neon-pink/20 border border-electric-blue/30 text-primary-white font-medium hover:from-electric-blue/30 hover:to-neon-pink/30 transition-all duration-200"
                          >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Ask AI Questions
                          </Button>
                        )}
                        
                        {onCompareToPrimary && (
                          <Button 
                            onClick={() => onCompareToPrimary(pathway)}
                            variant="outline"
                            className="flex-1 border-cyber-yellow/50 text-cyber-yellow hover:bg-cyber-yellow/10 font-medium transition-all duration-200"
                          >
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Compare with Primary
                          </Button>
                        )}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>

          {/* Show More/Less Button */}
          {hasMoreThanFive && onToggleShowAll && (
            <div className="flex justify-center mt-6 pt-6 border-t border-electric-blue/20">
              <Button
                onClick={onToggleShowAll}
                variant="outline"
                className="border-cyber-yellow/50 text-cyber-yellow hover:bg-cyber-yellow/10 font-medium transition-all duration-200"
              >
                {showAll ? (
                  <>
                    <EyeOff className="w-4 h-4 mr-2" />
                    Show Top 5 Only
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    See All {alternatives.length} Options
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Summary Stats */}
          <div className="flex items-center justify-center mt-6 pt-6 border-t border-electric-blue/20">
            <div className="flex items-center space-x-6 text-sm text-primary-white/60">
              <span>
                <strong className="text-electric-blue">{alternatives.length}</strong> alternative pathways
              </span>
              <span>
                <strong className="text-neon-pink">{expandedItems.length}</strong> currently expanded
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AlternativePathwaysAccordion;