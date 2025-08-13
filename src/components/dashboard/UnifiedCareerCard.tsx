import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  ChevronUp,
  PoundSterling, 
  TrendingUp, 
  Briefcase,
  GraduationCap,
  Target,
  Users,
  Building2,
  BarChart3,
  MapPin,
  Clock,
  Shield,
  DollarSign,
  Book,
  Award,
  AlertTriangle,
  Zap,
  Heart,
  Scale,
  Globe,
  Brain,
  ArrowUpRight,
  Calendar,
  Home,
  Star,
  Lightbulb,
  Trash2,
  Rocket
} from 'lucide-react';
import { ContextualCard, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { ContextualButton } from '../ui/button';
import { DesignProvider } from '../../context/DesignContext';

interface UnifiedCareerCardProps {
  career: any;
  onAskAI?: () => void;
  onDelete?: () => void;
}

const UnifiedCareerCard: React.FC<UnifiedCareerCardProps> = ({ career, onAskAI, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Debug logging to see what data we're receiving
  React.useEffect(() => {
    console.log('🔍 UNIFIED CAREER CARD DEBUG - Career data structure:', {
      title: career.title,
      hasPerplexityData: !!career.perplexityData,
      hasCompensationRewards: !!career.compensationRewards,
      isEnhanced: career.isEnhanced,
      enhancementStatus: career.enhancementStatus,
      perplexityDataKeys: career.perplexityData ? Object.keys(career.perplexityData) : [],
      compensationRewardsKeys: career.compensationRewards ? Object.keys(career.compensationRewards) : []
    });
  }, [career]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // 🎯 ENHANCED DATA EXTRACTION: Use best available data
  const getEnhancedSalaryDisplay = (): string => {
    // 1. Try Perplexity verified salary ranges (from enhanced data)
    if (career.perplexityData?.verifiedSalaryRanges) {
      const salary = career.perplexityData.verifiedSalaryRanges;
      return `£${salary.entry.min.toLocaleString()} - £${salary.senior.max.toLocaleString()}`;
    }
    
    // 2. Try compensation rewards schema (from enhanced data)
    if (career.compensationRewards?.salaryRange) {
      const salary = career.compensationRewards.salaryRange;
      return `£${salary.entry.toLocaleString()} - £${salary.senior.toLocaleString()}`;
    }
    
    // 3. Try enhanced salary (legacy format)
    if (career.enhancedSalary) {
      if (typeof career.enhancedSalary === 'string') return career.enhancedSalary;
      if (career.enhancedSalary.range) return career.enhancedSalary.range;
    }
    
    // 4. Fallback to average salary
    if (career.averageSalary) {
      if (typeof career.averageSalary === 'string') return career.averageSalary;
      if (career.averageSalary.entry && career.averageSalary.senior) {
        return `£${career.averageSalary.entry} - £${career.averageSalary.senior}`;
      }
    }
    
    return 'Salary data available';
  };

  const getEnhancedGrowthDisplay = (): string => {
    // 1. Try Perplexity real-time market data (from enhanced data)
    if (career.perplexityData?.realTimeMarketDemand) {
      const growth = career.perplexityData.realTimeMarketDemand.growthRate;
      const competition = career.perplexityData.realTimeMarketDemand.competitionLevel;
      const safeGrowth = Number.isFinite(growth) ? growth : parseFloat(String(growth).replace(/[^0-9.-]/g, '')) || 0;
      return `${safeGrowth}% growth • ${competition} competition`;
    }
    
    // 2. Try industry growth projection (from enhanced data)
    if (career.perplexityData?.industryGrowthProjection) {
      const outlook = career.perplexityData.industryGrowthProjection.outlook;
      return outlook;
    }
    
    // 3. Try labour market dynamics (from enhanced data)
    if (career.labourMarketDynamics?.demandOutlook?.growthForecast) {
      return career.labourMarketDynamics.demandOutlook.growthForecast;
    }
    
    // 4. Fallback to basic growth outlook
    return career.growthOutlook || 'Growing demand';
  };

  const hasEnhancedData = !!(
    career.perplexityData || 
    career.compensationRewards ||
    career.roleFundamentals ||
    career.competencyRequirements ||
    career.careerTrajectory ||
    career.labourMarketDynamics ||
    career.workEnvironmentCulture ||
    career.lifestyleFit ||
    career.costRiskEntry ||
    career.valuesImpact ||
    career.transferabilityFutureProofing ||
    career.isEnhanced ||
    career.enhancementStatus === 'enhanced'
  );

  const salaryDisplay = getEnhancedSalaryDisplay();
  const growthDisplay = getEnhancedGrowthDisplay();

  return (
    <DesignProvider mode={{ aesthetic: 'calm', energy: 'low', interaction: 'gentle' }}>
      <ContextualCard purpose="content" mood="neutral" className="shadow-glow-calm">
        <CardContent className="p-6">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <Badge className="bg-gradient-to-r from-primary-green to-primary-yellow text-primary-black font-bold px-3 py-1">
                {career.confidence || 95}% MATCH
              </Badge>
              {hasEnhancedData && (
                <Badge className="bg-gradient-to-r from-primary-yellow to-primary-green text-primary-black font-bold px-3 py-1">
                  ENHANCED DATA
                </Badge>
              )}
              {career.perplexityData && (
                <Badge className="bg-gradient-to-r from-primary-peach to-primary-lavender text-primary-black font-bold px-3 py-1">
                  REAL-TIME UK DATA
                </Badge>
              )}
            </div>
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary-green via-primary-yellow to-primary-peach mb-2">
              {career.title}
            </h2>
            <p className="text-primary-black/80 mb-4">
              {career.description || 'Comprehensive career analysis available'}
            </p>
          </div>
          
          {/* Delete Button (only show if onDelete is provided) */}
          {onDelete && (
            <div className="flex flex-col items-end space-y-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-2 text-primary-black/40 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors group"
                title="Remove this career option"
              >
                <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          )}
        </div>

        {/* Summary Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Salary Range */}
          <div className="bg-gradient-to-r from-primary-green/20 to-primary-yellow/20 border border-primary-green/30 rounded-xl p-4">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-green to-primary-yellow rounded-lg flex items-center justify-center">
                <PoundSterling className="w-5 h-5 text-primary-black" />
              </div>
              <h3 className="text-lg font-bold text-primary-green">
                {career.perplexityData?.verifiedSalaryRanges ? 'Verified Salary' : 'Salary Range'}
              </h3>
            </div>
            <p className="text-xl font-black text-primary-black">{salaryDisplay}</p>
          </div>

          {/* Growth Outlook */}
          <div className="bg-gradient-to-r from-primary-lavender/20 to-primary-peach/20 border border-primary-lavender/30 rounded-xl p-4">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-lavender to-primary-peach rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary-black" />
              </div>
              <h3 className="text-lg font-bold text-primary-black">
                {career.perplexityData?.realTimeMarketDemand ? 'Market Demand' : 'Growth Outlook'}
              </h3>
            </div>
            <p className="text-xl font-bold text-primary-black">{growthDisplay}</p>
            {career.perplexityData?.realTimeMarketDemand?.sources?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {career.perplexityData.realTimeMarketDemand.sources.slice(0, 3).map((url: string, i: number) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="underline text-primary-black hover:text-primary-black/80">
                    Source {i + 1}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Industry/Employers */}
          <div className="bg-gradient-to-r from-primary-mint/20 to-primary-peach/20 border border-primary-mint/30 rounded-xl p-4">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-mint to-primary-peach rounded-lg flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-primary-black" />
              </div>
              <h3 className="text-lg font-bold text-primary-black">
                {career.workEnvironmentCulture?.typicalEmployers ? 'Top Employer' : 'Industry'}
              </h3>
            </div>
            <p className="text-xl font-bold text-primary-black">
              {(() => {
                // Priority order: Comprehensive data -> Legacy (if not default) -> Intelligent inference
                const industry = 
                  career.workEnvironmentCulture?.typicalEmployers?.[0] || 
                  (career.industry && career.industry !== 'Technology' ? career.industry : null);
                
                if (industry) return industry;
                
                // Intelligent industry inference based on career title
                const title = career.title.toLowerCase();
                if (title.includes('coffee') || title.includes('barista') || title.includes('roaster')) {
                  return 'Hospitality & Food Service';
                } else if (title.includes('ai') || title.includes('software') || title.includes('developer') || title.includes('tech')) {
                  return 'Technology';
                } else if (title.includes('consultant') && !title.includes('ai')) {
                  return 'Business & Consulting';
                } else if (title.includes('manager') || title.includes('founder') || title.includes('startup')) {
                  return 'Business & Management';
                } else if (title.includes('freelance')) {
                  return 'Freelance & Contracting';
                } else {
                  return 'Technology'; // Final fallback
                }
              })()}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 items-stretch sm:items-center">
          {onAskAI && (
            <ContextualButton
              intent="cta"
              onClick={onAskAI}
              className="w-[92%] self-center sm:w-auto sm:flex-1 justify-center"
            >
              Ask AI About This Career
            </ContextualButton>
          )}
          <ContextualButton
            intent="secondary"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-[92%] self-center sm:w-auto sm:flex-1 justify-center"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-2" />
                Hide Details
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-2" />
                View Full Details
              </>
            )}
          </ContextualButton>
        </div>

        {/* Expandable Detailed Sections */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 border-t border-primary-green/30 pt-6"
            >
              {!hasEnhancedData ? (
                <div className="bg-gradient-to-r from-primary-yellow/20 to-primary-peach/20 border border-primary-yellow/30 rounded-xl p-6 text-center">
                  <div className="flex items-center justify-center space-x-3 mb-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-black"></div>
                    <span className="text-lg font-semibold text-primary-black">Enhancing Career Data...</span>
                  </div>
                  <p className="text-primary-black/70 mb-4">
                    We're gathering the latest UK market data, salary ranges, and training pathways for this career.
                  </p>
                  <div className="bg-primary-mint/30 rounded-lg p-3">
                    <p className="text-sm text-primary-black/80">
                      💡 <strong>Enhanced data includes:</strong> Real-time salary data, education pathways, market demand, top employers, and career progression details.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Role Overview Section */}
              {career.roleFundamentals && (
                <AccordionSection
                  id="overview"
                  title="Role Overview"
                  icon={Target}
                  isExpanded={expandedSections.has('overview')}
                  onToggle={() => toggleSection('overview')}
                >
                  <div className="space-y-3">
                    {career.roleFundamentals.corePurpose && (
                      <div>
                        <h4 className="font-semibold text-primary-black mb-2">Core Purpose</h4>
                        <p className="text-primary-black/70 text-sm">{career.roleFundamentals.corePurpose}</p>
                      </div>
                    )}
                    {career.roleFundamentals.problemsSolved?.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-primary-black mb-2">Key Problems You'll Solve</h4>
                        <ul className="text-sm text-primary-black/70 space-y-1">
                          {career.roleFundamentals.problemsSolved.map((problem: string, i: number) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-primary-black mt-1">•</span>
                              <span>{problem}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Optional: Perplexity Source Links */}
                    {career.perplexityData?.sources?.length > 0 && (
                      <div className="text-xs text-primary-black/60">
                        <div className="mt-3">Further reading:</div>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {career.perplexityData.sources.slice(0, 5).map((src: any, i: number) => (
                            <a key={i} href={src.url || src} target="_blank" rel="noopener noreferrer" className="underline text-primary-black hover:text-primary-black/80">
                              {src.title ? src.title : `Link ${i + 1}`}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionSection>
              )}

              {/* Compensation Details */}
              {(career.perplexityData?.verifiedSalaryRanges || career.compensationRewards) && (
                <AccordionSection
                  id="compensation"
                  title="Detailed Compensation"
                  icon={DollarSign}
                  isExpanded={expandedSections.has('compensation')}
                  onToggle={() => toggleSection('compensation')}
                >
                  <div className="space-y-4">
                    {career.perplexityData?.verifiedSalaryRanges && (
                      <div>
                        <h4 className="font-semibold text-primary-black mb-3">UK Salary Breakdown</h4>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="text-center p-3 bg-primary-green/20 rounded-lg border border-primary-green/30">
                            <div className="text-xs text-primary-black/60 mb-1">Entry Level</div>
                            <div className="font-bold text-primary-green">
                              £{career.perplexityData.verifiedSalaryRanges.entry.min.toLocaleString()} - £{career.perplexityData.verifiedSalaryRanges.entry.max.toLocaleString()}
                            </div>
                          </div>
                          <div className="text-center p-3 bg-primary-lavender/20 rounded-lg border border-primary-lavender/30">
                            <div className="text-xs text-primary-black/60 mb-1">Mid Level</div>
                            <div className="font-bold text-primary-black">
                              £{career.perplexityData.verifiedSalaryRanges.mid.min.toLocaleString()} - £{career.perplexityData.verifiedSalaryRanges.mid.max.toLocaleString()}
                            </div>
                          </div>
                          <div className="text-center p-3 bg-primary-peach/20 rounded-lg border border-primary-peach/30">
                            <div className="text-xs text-primary-black/60 mb-1">Senior Level</div>
                            <div className="font-bold text-primary-black">
                              £{career.perplexityData.verifiedSalaryRanges.senior.min.toLocaleString()} - £{career.perplexityData.verifiedSalaryRanges.senior.max.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionSection>
              )}

              {/* Required Skills & Qualifications */}
              {(career.competencyRequirements || career.perplexityData?.competencyRequirements) && (
                <AccordionSection
                  id="required"
                  title="Required Skills & Qualifications"
                  icon={Book}
                  isExpanded={expandedSections.has('required')}
                  onToggle={() => toggleSection('required')}
                >
                  <div className="space-y-4">
                    {/* Technical Skills */}
                    {(career.competencyRequirements?.technicalSkills?.length > 0 || career.perplexityData?.competencyRequirements?.technicalSkills?.length > 0) && (
                      <div>
                        <h4 className="font-semibold text-primary-black mb-2">Technical Skills</h4>
                        <div className="flex flex-wrap gap-2">
                          {(career.perplexityData?.competencyRequirements?.technicalSkills || career.competencyRequirements?.technicalSkills || []).map((skill: string, i: number) => (
                            <span key={i} className="px-3 py-1 bg-primary-mint/20 text-primary-black border border-primary-mint/30 rounded-full text-sm">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Soft Skills */}
                    {(career.competencyRequirements?.softSkills?.length > 0 || career.perplexityData?.competencyRequirements?.softSkills?.length > 0) && (
                      <div>
                        <h4 className="font-semibold text-primary-black mb-2">Soft Skills</h4>
                        <div className="flex flex-wrap gap-2">
                          {(career.perplexityData?.competencyRequirements?.softSkills || career.competencyRequirements?.softSkills || []).map((skill: string, i: number) => (
                            <span key={i} className="px-3 py-1 bg-primary-green/20 text-primary-black border border-primary-green/30 rounded-full text-sm">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tools */}
                    {(career.competencyRequirements?.tools?.length > 0 || career.perplexityData?.competencyRequirements?.tools?.length > 0) && (
                      <div>
                        <h4 className="font-semibold text-primary-black mb-2">Tools & Technologies</h4>
                        <div className="flex flex-wrap gap-2">
                          {(career.perplexityData?.competencyRequirements?.tools || career.competencyRequirements?.tools || []).map((tool: string, i: number) => (
                            <span key={i} className="px-3 py-1 bg-primary-peach/20 text-primary-black border border-primary-peach/30 rounded-full text-sm">
                              {tool}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Learning Curve */}
                    {(career.competencyRequirements?.learningCurve || career.perplexityData?.competencyRequirements?.learningCurve) && (
                      <div>
                        <h4 className="font-semibold text-primary-black mb-2">Learning Requirements</h4>
                        <div className="bg-primary-lavender/10 p-3 rounded-lg border border-primary-lavender/20">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                            <div>
                              <span className="font-medium text-primary-black">Time to Competent:</span>
                              <div className="text-primary-black">{(career.perplexityData?.competencyRequirements?.learningCurve?.timeToCompetent || career.competencyRequirements?.learningCurve?.timeToCompetent || 'N/A')}</div>
                            </div>
                            <div>
                              <span className="font-medium text-primary-black">Difficulty Level:</span>
                              <div className="text-primary-black">{(career.perplexityData?.competencyRequirements?.learningCurve?.difficultyLevel || career.competencyRequirements?.learningCurve?.difficultyLevel || 'N/A')}</div>
                            </div>
                            <div>
                              <span className="font-medium text-primary-black">Prerequisites:</span>
                              <div className="text-primary-black">
                                {(career.perplexityData?.competencyRequirements?.learningCurve?.prerequisites || career.competencyRequirements?.learningCurve?.prerequisites || []).length > 0 
                                  ? (career.perplexityData?.competencyRequirements?.learningCurve?.prerequisites || career.competencyRequirements?.learningCurve?.prerequisites || []).join(', ')
                                  : 'None specified'
                                }
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Current Education Programs */}
                    {career.perplexityData?.currentEducationPathways?.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-primary-black mb-3">Current Education Programs</h4>
                        <div className="space-y-2">
                          {career.perplexityData.currentEducationPathways.slice(0, 3).map((pathway: any, i: number) => (
                            <div key={i} className="bg-primary-yellow/10 p-3 rounded-lg border border-primary-yellow/20">
                              <div className="font-medium text-primary-black">{pathway.title}</div>
                              <div className="text-sm text-primary-black/70 mt-1">{pathway.type} • {pathway.provider} • {pathway.duration}</div>
                              {pathway.cost && (
                                <div className="text-sm text-primary-black/70 mt-1">
                                  Cost: {pathway.cost.min === 0 && pathway.cost.max === 0 ? 'Free' : `£${pathway.cost.min?.toLocaleString()} - £${pathway.cost.max?.toLocaleString()}`}
                                </div>
                              )}
                              {pathway.entryRequirements && pathway.entryRequirements.length > 0 && (
                                <div className="text-sm text-primary-black/70 mt-1">
                                  Requirements: {pathway.entryRequirements.join(', ')}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionSection>
              )}

              {/* Market Intelligence */}
              {(career.perplexityData?.realTimeMarketDemand || career.labourMarketDynamics) && (
                <AccordionSection
                  id="market"
                  title="Market Intelligence"
                  icon={BarChart3}
                  isExpanded={expandedSections.has('market')}
                  onToggle={() => toggleSection('market')}
                >
                  <div className="space-y-4">
                    {career.perplexityData?.realTimeMarketDemand && (
                      <div className="bg-primary-peach/10 p-4 rounded-lg border border-primary-peach/20">
                        <h4 className="font-semibold text-primary-black mb-3">Real-Time UK Market Data</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="font-medium text-primary-black">Job Postings (30 days):</span>
                            <div className="text-primary-black">{career.perplexityData.realTimeMarketDemand.jobPostingVolume?.toLocaleString() || 'N/A'}</div>
                          </div>
                          <div>
                            <span className="font-medium text-primary-black">Growth Rate:</span>
                            <div className="text-primary-black">{career.perplexityData.realTimeMarketDemand.growthRate || 'N/A'}%</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionSection>
              )}

              {/* Work Environment */}
              {(career.workEnvironmentCulture || career.perplexityData?.workEnvironmentDetails) && (
                <AccordionSection
                  id="environment"
                  title="Work Environment"
                  icon={Building2}
                  isExpanded={expandedSections.has('environment')}
                  onToggle={() => toggleSection('environment')}
                >
                  <div className="space-y-4">
                    {career.workEnvironmentCulture?.typicalEmployers?.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-primary-black mb-2">Typical Employers</h4>
                        <div className="flex flex-wrap gap-2">
                          {career.workEnvironmentCulture.typicalEmployers.map((employer: string, i: number) => (
                            <span key={i} className="px-3 py-1 bg-primary-yellow/20 text-primary-black border border-primary-yellow/30 rounded-full text-sm">
                              {employer}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {career.perplexityData?.workEnvironmentDetails && (
                      <div className="bg-primary-yellow/10 p-3 rounded-lg border border-primary-yellow/20">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="font-medium text-primary-black">Remote Options:</span>
                            <div className="text-primary-black">{career.perplexityData.workEnvironmentDetails.remoteOptions ? 'Yes' : 'No'}</div>
                          </div>
                          <div>
                            <span className="font-medium text-primary-black">Work-Life Balance:</span>
                            <div className="text-primary-black">{career.perplexityData.workEnvironmentDetails.workLifeBalance || 'Good'}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionSection>
              )}

              {/* Industry Growth Projection */}
              {career.perplexityData?.industryGrowthProjection && (
                <AccordionSection
                  id="growth"
                  title="Industry Growth Projection"
                  icon={TrendingUp}
                  isExpanded={expandedSections.has('growth')}
                  onToggle={() => toggleSection('growth')}
                >
                  <div className="space-y-4">
                    <div className="bg-primary-lavender/10 p-4 rounded-lg border border-primary-lavender/20">
                      <h4 className="font-semibold text-primary-black mb-3">Growth Forecast</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="font-medium text-primary-black">Next Year:</span>
                          <div className="text-primary-black">{career.perplexityData.industryGrowthProjection.nextYear}%</div>
                        </div>
                        <div>
                          <span className="font-medium text-primary-black">Five Year:</span>
                          <div className="text-primary-black">{career.perplexityData.industryGrowthProjection.fiveYear}%</div>
                        </div>
                        <div>
                          <span className="font-medium text-primary-black">Outlook:</span>
                          <div className="text-primary-black">{career.perplexityData.industryGrowthProjection.outlook}</div>
                        </div>
                      </div>
                      {career.perplexityData.industryGrowthProjection.factors?.length > 0 && (
                        <div className="mt-3">
                          <span className="font-medium text-primary-black">Growth Factors:</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {career.perplexityData.industryGrowthProjection.factors.map((factor: string, i: number) => (
                              <span key={i} className="px-3 py-1 bg-primary-lavender/20 text-primary-black border border-primary-lavender/30 rounded-full text-sm">
                                {factor}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </AccordionSection>
              )}

              {/* Automation Risk Assessment */}
              {career.perplexityData?.automationRiskAssessment && (
                <AccordionSection
                  id="automation"
                  title="Automation Risk Assessment"
                  icon={Zap}
                  isExpanded={expandedSections.has('automation')}
                  onToggle={() => toggleSection('automation')}
                >
                  <div className="space-y-4">
                    <div className="bg-primary-peach/10 p-4 rounded-lg border border-primary-peach/20">
                      <h4 className="font-semibold text-primary-black mb-3">Risk Analysis</h4>
                      <div className="grid grid-cols-1 gap-3 text-sm">
                        <div>
                          <span className="font-medium text-primary-black">Risk Level:</span>
                          <div className="text-primary-black">{career.perplexityData.automationRiskAssessment.level}</div>
                        </div>
                        <div>
                          <span className="font-medium text-primary-black">Timeline:</span>
                          <div className="text-primary-black">{career.perplexityData.automationRiskAssessment.timeline}</div>
                        </div>
                      </div>
                      {career.perplexityData.automationRiskAssessment.mitigationStrategies?.length > 0 && (
                        <div className="mt-3">
                          <span className="font-medium text-primary-black">Mitigation Strategies:</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {career.perplexityData.automationRiskAssessment.mitigationStrategies.map((strategy: string, i: number) => (
                              <span key={i} className="px-3 py-1 bg-primary-peach/20 text-primary-black border border-primary-peach/30 rounded-full text-sm">
                                {strategy}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {career.perplexityData.automationRiskAssessment.futureSkillsNeeded?.length > 0 && (
                        <div className="mt-3">
                          <span className="font-medium text-primary-black">Future Skills Needed:</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {career.perplexityData.automationRiskAssessment.futureSkillsNeeded.map((skill: string, i: number) => (
                              <span key={i} className="px-3 py-1 bg-primary-green/20 text-primary-black border border-primary-green/30 rounded-full text-sm">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </AccordionSection>
              )}

              {/* Current Education Pathways */}
              {career.perplexityData?.currentEducationPathways?.length > 0 && (
                <AccordionSection
                  id="education"
                  title="Current Education Pathways"
                  icon={GraduationCap}
                  isExpanded={expandedSections.has('education')}
                  onToggle={() => toggleSection('education')}
                >
                  <div className="space-y-4">
                    <div className="bg-primary-yellow/10 p-4 rounded-lg border border-primary-yellow/20">
                      <h4 className="font-semibold text-primary-black mb-3">Available Programs</h4>
                      <div className="space-y-3">
                        {career.perplexityData.currentEducationPathways.map((pathway: any, i: number) => (
                          <div key={i} className="bg-primary-black/40 p-3 rounded-lg border border-primary-yellow/20">
                            <div className="font-medium text-primary-black">{pathway.title}</div>
                            <div className="text-sm text-primary-black/70 mt-1">{pathway.type} • {pathway.provider} • {pathway.duration}</div>
                            {pathway.cost && (
                              <div className="text-sm text-primary-black/70 mt-1">
                                Cost: {pathway.cost.min === 0 && pathway.cost.max === 0 ? 'Free' : `£${pathway.cost.min?.toLocaleString()} - £${pathway.cost.max?.toLocaleString()}`}
                              </div>
                            )}
                            {pathway.entryRequirements?.length > 0 && (
                              <div className="text-sm text-primary-black/70 mt-1">
                                Requirements: {pathway.entryRequirements.join(', ')}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </AccordionSection>
              )}

              {/* Role Fundamentals */}
              {career.roleFundamentals && (
                <AccordionSection
                  id="fundamentals"
                  title="Role Fundamentals"
                  icon={Target}
                  isExpanded={expandedSections.has('fundamentals')}
                  onToggle={() => toggleSection('fundamentals')}
                >
                  <div className="space-y-4">
                    {career.roleFundamentals.corePurpose && (
                      <div className="bg-primary-mint/10 p-4 rounded-lg border border-primary-mint/20">
                        <h4 className="font-semibold text-primary-black mb-3">Core Purpose</h4>
                        <p className="text-primary-black/70 text-sm">{career.roleFundamentals.corePurpose}</p>
                      </div>
                    )}
                    {career.roleFundamentals.problemsSolved?.length > 0 && (
                      <div className="bg-primary-green/10 p-4 rounded-lg border border-primary-green/20">
                        <h4 className="font-semibold text-primary-green mb-3">Key Problems You'll Solve</h4>
                        <div className="space-y-2">
                          {career.roleFundamentals.problemsSolved.map((problem: string, i: number) => (
                            <div key={i} className="flex items-start gap-2">
                              <span className="text-primary-green mt-1">•</span>
                              <span className="text-primary-black/70 text-sm">{problem}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {career.roleFundamentals.typicalResponsibilities?.length > 0 && (
                      <div className="bg-primary-lavender/10 p-4 rounded-lg border border-primary-lavender/20">
                        <h4 className="font-semibold text-primary-black mb-3">Typical Responsibilities</h4>
                        <div className="space-y-2">
                          {career.roleFundamentals.typicalResponsibilities.map((responsibility: string, i: number) => (
                            <div key={i} className="flex items-start gap-2">
                              <span className="text-primary-black mt-1">•</span>
                              <span className="text-primary-black/70 text-sm">{responsibility}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionSection>
              )}

              {/* Career Trajectory */}
              {career.careerTrajectory && (
                <AccordionSection
                  id="trajectory"
                  title="Career Trajectory"
                  icon={ArrowUpRight}
                  isExpanded={expandedSections.has('trajectory')}
                  onToggle={() => toggleSection('trajectory')}
                >
                  <div className="space-y-4">
                    {career.careerTrajectory.progressionSteps?.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-primary-black mb-3">Progression Steps</h4>
                        <div className="space-y-2">
                          {career.careerTrajectory.progressionSteps.map((step: any, i: number) => (
                            <div key={i} className="bg-primary-lavender/10 p-3 rounded-lg border border-primary-lavender/20">
                              <div className="font-medium text-primary-black">{step.title}</div>
                              <div className="text-sm text-primary-black/70 mt-1">Timeframe: {step.timeFrame}</div>
                              {step.requirements?.length > 0 && (
                                <div className="text-sm text-primary-black/70 mt-1">
                                  Requirements: {step.requirements.join(', ')}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {career.careerTrajectory.horizontalMoves?.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-primary-black mb-2">Horizontal Moves</h4>
                        <div className="flex flex-wrap gap-2">
                          {career.careerTrajectory.horizontalMoves.map((move: string, i: number) => (
                            <span key={i} className="px-3 py-1 bg-primary-mint/20 text-primary-black border border-primary-mint/30 rounded-full text-sm">
                              {move}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {career.careerTrajectory.leadershipTrack?.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-primary-black mb-2">Leadership Track</h4>
                        <div className="flex flex-wrap gap-2">
                          {career.careerTrajectory.leadershipTrack.map((track: string, i: number) => (
                            <span key={i} className="px-3 py-1 bg-primary-green/20 text-primary-black border border-primary-green/30 rounded-full text-sm">
                              {track}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionSection>
              )}

              {/* Lifestyle Fit */}
              {career.lifestyleFit && (
                <AccordionSection
                  id="lifestyle"
                  title="Lifestyle Fit"
                  icon={Heart}
                  isExpanded={expandedSections.has('lifestyle')}
                  onToggle={() => toggleSection('lifestyle')}
                >
                  <div className="space-y-4">
                    {career.lifestyleFit.workingHours && (
                      <div className="bg-primary-peach/10 p-4 rounded-lg border border-primary-peach/20">
                        <h4 className="font-semibold text-primary-black mb-3">Working Hours</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="font-medium text-primary-black">Typical:</span>
                            <div className="text-primary-black">{career.lifestyleFit.workingHours.typical}</div>
                          </div>
                          <div>
                            <span className="font-medium text-primary-black">Flexibility:</span>
                            <div className="text-primary-black">{career.lifestyleFit.workingHours.flexibility}</div>
                          </div>
                          <div>
                            <span className="font-medium text-primary-black">Shift Work:</span>
                            <div className="text-primary-black">{career.lifestyleFit.workingHours.shiftWork ? 'Yes' : 'No'}</div>
                          </div>
                          <div>
                            <span className="font-medium text-primary-black">On-Call:</span>
                            <div className="text-primary-black">{career.lifestyleFit.workingHours.onCall ? 'Yes' : 'No'}</div>
                          </div>
                        </div>
                      </div>
                    )}
                    {career.lifestyleFit.remoteOptions && (
                      <div className="bg-primary-yellow/10 p-4 rounded-lg border border-primary-yellow/20">
                        <h4 className="font-semibold text-primary-black mb-3">Remote Options</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="font-medium text-primary-black">Remote Work:</span>
                            <div className="text-primary-black">{career.lifestyleFit.remoteOptions.remoteWork ? 'Available' : 'Not Available'}</div>
                          </div>
                          <div>
                            <span className="font-medium text-primary-black">Hybrid Options:</span>
                            <div className="text-primary-black">{career.lifestyleFit.remoteOptions.hybridOptions ? 'Available' : 'Not Available'}</div>
                          </div>
                        </div>
                      </div>
                    )}
                    {career.lifestyleFit.stressProfile && (
                      <div className="bg-primary-lavender/10 p-4 rounded-lg border border-primary-lavender/20">
                        <h4 className="font-semibold text-primary-black mb-3">Stress Profile</h4>
                        <div className="grid grid-cols-1 gap-3 text-sm">
                          <div>
                            <span className="font-medium text-primary-black">Intensity:</span>
                            <div className="text-primary-black">{career.lifestyleFit.stressProfile.intensity}</div>
                          </div>
                          <div>
                            <span className="font-medium text-primary-black">Volatility:</span>
                            <div className="text-primary-black">{career.lifestyleFit.stressProfile.volatility}</div>
                          </div>
                          <div>
                            <span className="font-medium text-primary-black">Emotional Labour:</span>
                            <div className="text-primary-black">{career.lifestyleFit.stressProfile.emotionalLabour}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionSection>
              )}

              {/* Cost & Risk of Entry */}
              {career.costRiskEntry && (
                <AccordionSection
                  id="cost"
                  title="Cost & Risk of Entry"
                  icon={Scale}
                  isExpanded={expandedSections.has('cost')}
                  onToggle={() => toggleSection('cost')}
                >
                  <div className="space-y-4">
                    {career.costRiskEntry.upfrontInvestment && (
                      <div className="bg-primary-peach/10 p-4 rounded-lg border border-primary-peach/20">
                        <h4 className="font-semibold text-primary-black mb-3">Upfront Investment</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="font-medium text-primary-black">Tuition Costs:</span>
                            <div className="text-primary-black">{career.costRiskEntry.upfrontInvestment.tuitionCosts}</div>
                          </div>
                          <div>
                            <span className="font-medium text-primary-black">Training Costs:</span>
                            <div className="text-primary-black">{career.costRiskEntry.upfrontInvestment.trainingCosts}</div>
                          </div>
                          <div>
                            <span className="font-medium text-primary-black">Exam Fees:</span>
                            <div className="text-primary-black">{career.costRiskEntry.upfrontInvestment.examFees}</div>
                          </div>
                          <div>
                            <span className="font-medium text-primary-black">Total Estimate:</span>
                            <div className="text-primary-black">{career.costRiskEntry.upfrontInvestment.totalEstimate}</div>
                          </div>
                        </div>
                      </div>
                    )}
                    {career.costRiskEntry.employmentCertainty && (
                      <div className="bg-primary-green/10 p-4 rounded-lg border border-primary-green/20">
                        <h4 className="font-semibold text-primary-green mb-3">Employment Certainty</h4>
                        <div className="grid grid-cols-1 gap-3 text-sm">
                          <div>
                            <span className="font-medium text-primary-black">Placement Rates:</span>
                            <div className="text-primary-green">{career.costRiskEntry.employmentCertainty.placementRates}</div>
                          </div>
                          <div>
                            <span className="font-medium text-primary-black">Time to First Role:</span>
                            <div className="text-primary-green">{career.costRiskEntry.employmentCertainty.timeToFirstRole}</div>
                          </div>
                        </div>
                      </div>
                    )}
                    {career.costRiskEntry.regulatoryRisk?.licenseRequirements?.length > 0 && (
                      <div className="bg-primary-yellow/10 p-4 rounded-lg border border-primary-yellow/20">
                        <h4 className="font-semibold text-primary-black mb-3">Regulatory Requirements</h4>
                        <div className="flex flex-wrap gap-2">
                          {career.costRiskEntry.regulatoryRisk.licenseRequirements.map((requirement: string, i: number) => (
                            <span key={i} className="px-3 py-1 bg-primary-yellow/20 text-primary-black border border-primary-yellow/30 rounded-full text-sm">
                              {requirement}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionSection>
              )}

              {/* Values & Impact */}
              {career.valuesImpact && (
                <AccordionSection
                  id="values"
                  title="Values & Impact"
                  icon={Lightbulb}
                  isExpanded={expandedSections.has('values')}
                  onToggle={() => toggleSection('values')}
                >
                  <div className="space-y-4">
                    {career.valuesImpact.societalContribution && (
                      <div className="bg-primary-mint/10 p-4 rounded-lg border border-primary-mint/20">
                        <h4 className="font-semibold text-primary-black mb-3">Societal Contribution</h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium text-primary-black">Public Good:</span>
                            <div className="text-primary-black">{career.valuesImpact.societalContribution.publicGood}</div>
                          </div>
                          <div>
                            <span className="font-medium text-primary-black">Sustainability:</span>
                            <div className="text-primary-black">{career.valuesImpact.societalContribution.sustainability}</div>
                          </div>
                          <div>
                            <span className="font-medium text-primary-black">Ethical Footprint:</span>
                            <div className="text-primary-black">{career.valuesImpact.societalContribution.ethicalFootprint}</div>
                          </div>
                        </div>
                      </div>
                    )}
                    {career.valuesImpact.personalAlignment?.intrinsicMotivation?.length > 0 && (
                      <div className="bg-primary-green/10 p-4 rounded-lg border border-primary-green/20">
                        <h4 className="font-semibold text-primary-green mb-3">Personal Alignment</h4>
                        <div className="space-y-2">
                          <div>
                            <span className="font-medium text-primary-black">Intrinsic Motivation:</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {career.valuesImpact.personalAlignment.intrinsicMotivation.map((motivation: string, i: number) => (
                                <span key={i} className="px-3 py-1 bg-primary-green/20 text-primary-black border border-primary-green/30 rounded-full text-sm">
                                  {motivation}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <span className="font-medium text-primary-black">Meaningfulness:</span>
                            <div className="text-primary-green">{career.valuesImpact.personalAlignment.meaningfulness}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionSection>
              )}

              {/* Transferability & Future-Proofing */}
              {career.transferabilityFutureProofing && (
                <AccordionSection
                  id="future"
                  title="Transferability & Future-Proofing"
                  icon={Rocket}
                  isExpanded={expandedSections.has('future')}
                  onToggle={() => toggleSection('future')}
                >
                  <div className="space-y-4">
                    {career.transferabilityFutureProofing.portableSkills?.length > 0 && (
                      <div className="bg-primary-lavender/10 p-4 rounded-lg border border-primary-lavender/20">
                        <h4 className="font-semibold text-primary-black mb-3">Portable Skills</h4>
                        <div className="flex flex-wrap gap-2">
                          {career.transferabilityFutureProofing.portableSkills.map((skill: string, i: number) => (
                            <span key={i} className="px-3 py-1 bg-primary-lavender/20 text-primary-black border border-primary-lavender/30 rounded-full text-sm">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {career.transferabilityFutureProofing.automationExposure && (
                      <div className="bg-primary-peach/10 p-4 rounded-lg border border-primary-peach/20">
                        <h4 className="font-semibold text-primary-black mb-3">Automation Exposure</h4>
                        <div className="grid grid-cols-1 gap-3 text-sm">
                          <div>
                            <span className="font-medium text-primary-black">Vulnerability Level:</span>
                            <div className="text-primary-black">{career.transferabilityFutureProofing.automationExposure.vulnerabilityLevel}</div>
                          </div>
                          <div>
                            <span className="font-medium text-primary-black">Time Horizon:</span>
                            <div className="text-primary-black">{career.transferabilityFutureProofing.automationExposure.timeHorizon}</div>
                          </div>
                          {career.transferabilityFutureProofing.automationExposure.protectiveFactors?.length > 0 && (
                            <div>
                              <span className="font-medium text-primary-black">Protective Factors:</span>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {career.transferabilityFutureProofing.automationExposure.protectiveFactors.map((factor: string, i: number) => (
                                  <span key={i} className="px-3 py-1 bg-primary-peach/20 text-primary-black border border-primary-peach/30 rounded-full text-sm">
                                    {factor}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {career.transferabilityFutureProofing.globalRelevance && (
                      <div className="bg-primary-yellow/10 p-4 rounded-lg border border-primary-yellow/20">
                        <h4 className="font-semibold text-primary-black mb-3">Global Relevance</h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium text-primary-black">Cultural Adaptability:</span>
                            <div className="text-primary-black">{career.transferabilityFutureProofing.globalRelevance.culturalAdaptability}</div>
                          </div>
                          {career.transferabilityFutureProofing.globalRelevance.marketDemand?.length > 0 && (
                            <div>
                              <span className="font-medium text-primary-black">Market Demand:</span>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {career.transferabilityFutureProofing.globalRelevance.marketDemand.map((market: string, i: number) => (
                                  <span key={i} className="px-3 py-1 bg-primary-yellow/20 text-primary-black border border-primary-yellow/30 rounded-full text-sm">
                                    {market}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionSection>
              )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        </CardContent>
      </ContextualCard>
    </DesignProvider>
  );
};

// Accordion Section Component
interface AccordionSectionProps {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const AccordionSection: React.FC<AccordionSectionProps> = ({
  title,
  icon: Icon,
  isExpanded,
  onToggle,
  children
}) => {
  return (
    <div className="border border-primary-green/20 rounded-lg bg-primary-white/95">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-primary-green/10 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <Icon className="w-5 h-5 text-primary-green" />
          <span className="font-semibold text-primary-black">{title}</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-primary-green" />
        ) : (
          <ChevronDown className="w-4 h-4 text-primary-green" />
        )}
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pb-4"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UnifiedCareerCard;