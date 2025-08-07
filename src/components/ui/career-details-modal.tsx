import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, CheckCircle, Briefcase, GraduationCap, Users, RefreshCw, ChevronDown, Target, MapPin, Clock, Shield, Building2, BarChart3, DollarSign, Book, Award, AlertTriangle } from 'lucide-react';
import { CareerCard } from '../../types/careerCard';

interface CareerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  careerCard: CareerCard | null;
  onRefreshDetails?: (cardId: string) => void;
}

export const CareerDetailsModal: React.FC<CareerDetailsModalProps> = ({
  isOpen,
  onClose,
  careerCard,
  onRefreshDetails
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshDetails = async () => {
    if (!careerCard || !onRefreshDetails) return;
    setIsRefreshing(true);
    try {
      await onRefreshDetails(careerCard.id || careerCard.title);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!careerCard) return null;

  console.log('🔍 CAREER MODAL - Career card received:', {
    title: careerCard.title,
    hasPerplexityData: !!careerCard.perplexityData,
    perplexityDataKeys: careerCard.perplexityData ? Object.keys(careerCard.perplexityData) : [],
    fullPerplexityData: careerCard.perplexityData
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 md:inset-8 lg:inset-16 bg-white rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 relative">
                <div className="absolute top-4 right-4 flex gap-2">
                  {onRefreshDetails && (
                    <button
                      onClick={handleRefreshDetails}
                      disabled={isRefreshing}
                      className="p-2 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                  )}
                  <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="pr-12">
                  <h2 className="text-2xl md:text-3xl font-bold mb-2">{careerCard.title}</h2>
                  <div className="flex items-center gap-4 text-blue-100 mb-2">
                    <div className="flex items-center gap-1">
                      <Briefcase className="h-4 w-4" />
                      <span>{careerCard.industry || 'Various Industries'}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    {careerCard.perplexityData ? (
                      <div className="flex items-center gap-1 bg-green-500/20 px-2 py-1 rounded text-green-100">
                        <CheckCircle className="h-3 w-3" />
                        <span>Enhanced AI data available</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 bg-blue-500/20 px-2 py-1 rounded text-blue-100">
                        <CheckCircle className="h-3 w-3" />
                        <span>Basic data only</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <EnhancedCareerDataDisplay careerCard={careerCard} />
              </div>

              {/* Footer */}
              <div className="border-t bg-gray-50 p-6">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    Career guidance powered by AI
                  </div>
                  <button
                    onClick={onClose}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Got it
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Enhanced nested accordion component for comprehensive data display
interface EnhancedCareerDataDisplayProps {
  careerCard: CareerCard;
}

const EnhancedCareerDataDisplay: React.FC<EnhancedCareerDataDisplayProps> = ({ careerCard }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview', 'compensation']));

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

  const hasEnhancedData = !!(
    careerCard.perplexityData || 
    careerCard.roleFundamentals || 
    careerCard.compensationRewards ||
    careerCard.competencyRequirements ||
    careerCard.careerTrajectory ||
    careerCard.labourMarketDynamics ||
    careerCard.workEnvironmentCulture ||
    careerCard.lifestyleFit
  );

  if (!hasEnhancedData) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-bold text-red-800 mb-2">❌ NO ENHANCED DATA FOUND</h2>
          <p className="text-sm text-red-700">This career card does not have enhanced AI analysis. Only basic information is available.</p>
        </div>
        
        <div className="space-y-4">
          <section>
            <h3 className="text-lg font-semibold mb-3 text-gray-900">Basic Information</h3>
            <p className="text-gray-600">{careerCard.description || 'No description available'}</p>
          </section>

          {careerCard.keySkills && careerCard.keySkills.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold mb-3 text-gray-900">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {careerCard.keySkills.map((skill, index) => (
                  <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Success Message */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200">
        <h2 className="text-lg font-bold text-green-800 mb-2 flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          🎉 COMPREHENSIVE CAREER INTELLIGENCE AVAILABLE!
        </h2>
        <p className="text-sm text-green-700">All enhanced career data is displayed below in comprehensive sections</p>
      </div>

      {/* Accordion Sections */}
      <div className="space-y-3">
        
        {/* 1. Role Overview */}
        <AccordionSection
          id="overview"
          title="Role Overview"
          icon={Target}
          isExpanded={expandedSections.has('overview')}
          onToggle={() => toggleSection('overview')}
          bgColor="bg-blue-50"
          borderColor="border-blue-200"
          textColor="text-blue-900"
        >
          <div className="space-y-4">
            {careerCard.roleFundamentals && (
              <>
                {careerCard.roleFundamentals.corePurpose && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Core Purpose</h4>
                    <p className="text-gray-700 text-sm">{careerCard.roleFundamentals.corePurpose}</p>
                  </div>
                )}
                
                {careerCard.roleFundamentals.problemsSolved && careerCard.roleFundamentals.problemsSolved.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Problems You'll Solve</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {careerCard.roleFundamentals.problemsSolved.map((problem, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-blue-500 mt-1">•</span>
                          <span>{problem}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {careerCard.roleFundamentals.typicalResponsibilities && careerCard.roleFundamentals.typicalResponsibilities.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Key Responsibilities</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {careerCard.roleFundamentals.typicalResponsibilities.map((resp, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-blue-500 mt-1">•</span>
                          <span>{resp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {careerCard.roleFundamentals.keyStakeholders && careerCard.roleFundamentals.keyStakeholders.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Key Stakeholders</h4>
                    <div className="flex flex-wrap gap-2">
                      {careerCard.roleFundamentals.keyStakeholders.map((stakeholder, i) => (
                        <span key={i} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          {stakeholder}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            
            {/* Fallback to basic description if no roleFundamentals */}
            {!careerCard.roleFundamentals && careerCard.description && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                <p className="text-gray-700 text-sm">{careerCard.description}</p>
              </div>
            )}
          </div>
        </AccordionSection>

        {/* 2. Compensation & Rewards */}
        <AccordionSection
          id="compensation"
          title="Compensation & Rewards"
          icon={DollarSign}
          isExpanded={expandedSections.has('compensation')}
          onToggle={() => toggleSection('compensation')}
          bgColor="bg-green-50"
          borderColor="border-green-200"
          textColor="text-green-900"
        >
          <div className="space-y-4">
            {/* Perplexity salary data */}
            {careerCard.perplexityData?.verifiedSalaryRanges && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Verified Salary Ranges</h4>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 bg-green-100 rounded-lg">
                    <div className="text-xs text-gray-600 mb-1">Entry Level</div>
                    <div className="font-bold text-green-800">
                      £{careerCard.perplexityData.verifiedSalaryRanges.entry.min.toLocaleString()} - £{careerCard.perplexityData.verifiedSalaryRanges.entry.max.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-green-100 rounded-lg">
                    <div className="text-xs text-gray-600 mb-1">Mid Level</div>
                    <div className="font-bold text-green-800">
                      £{careerCard.perplexityData.verifiedSalaryRanges.mid.min.toLocaleString()} - £{careerCard.perplexityData.verifiedSalaryRanges.mid.max.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-green-100 rounded-lg">
                    <div className="text-xs text-gray-600 mb-1">Senior Level</div>
                    <div className="font-bold text-green-800">
                      £{careerCard.perplexityData.verifiedSalaryRanges.senior.min.toLocaleString()} - £{careerCard.perplexityData.verifiedSalaryRanges.senior.max.toLocaleString()}
                    </div>
                  </div>
                </div>

                {careerCard.perplexityData.verifiedSalaryRanges.byRegion && (
                  <div className="mt-4">
                    <h5 className="font-medium text-gray-800 mb-2">Regional Breakdown</h5>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="p-2 bg-gray-50 rounded">
                        <span className="font-medium">London:</span> £{careerCard.perplexityData.verifiedSalaryRanges.byRegion.london.min.toLocaleString()} - £{careerCard.perplexityData.verifiedSalaryRanges.byRegion.london.max.toLocaleString()}
                      </div>
                      <div className="p-2 bg-gray-50 rounded">
                        <span className="font-medium">Manchester:</span> £{careerCard.perplexityData.verifiedSalaryRanges.byRegion.manchester.min.toLocaleString()} - £{careerCard.perplexityData.verifiedSalaryRanges.byRegion.manchester.max.toLocaleString()}
                      </div>
                      <div className="p-2 bg-gray-50 rounded">
                        <span className="font-medium">Birmingham:</span> £{careerCard.perplexityData.verifiedSalaryRanges.byRegion.birmingham.min.toLocaleString()} - £{careerCard.perplexityData.verifiedSalaryRanges.byRegion.birmingham.max.toLocaleString()}
                      </div>
                      <div className="p-2 bg-gray-50 rounded">
                        <span className="font-medium">Scotland:</span> £{careerCard.perplexityData.verifiedSalaryRanges.byRegion.scotland.min.toLocaleString()} - £{careerCard.perplexityData.verifiedSalaryRanges.byRegion.scotland.max.toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Comprehensive compensation data */}
            {careerCard.compensationRewards && (
              <div className="space-y-3">
                {careerCard.compensationRewards.salaryRange && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Salary Structure</h4>
                    <div className="bg-green-100 p-3 rounded-lg text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div><span className="font-medium">Entry:</span> £{careerCard.compensationRewards.salaryRange.entry?.toLocaleString() || 'N/A'}</div>
                        <div><span className="font-medium">Mid:</span> £{careerCard.compensationRewards.salaryRange.mid?.toLocaleString() || 'N/A'}</div>
                        <div><span className="font-medium">Senior:</span> £{careerCard.compensationRewards.salaryRange.senior?.toLocaleString() || 'N/A'}</div>
                        <div><span className="font-medium">Exceptional:</span> £{careerCard.compensationRewards.salaryRange.exceptional?.toLocaleString() || 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                )}

                {careerCard.compensationRewards.nonFinancialBenefits && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Benefits Package</h4>
                    <div className="space-y-2 text-sm">
                      {careerCard.compensationRewards.nonFinancialBenefits.pension && (
                        <div className="flex items-start gap-2">
                          <Shield className="h-4 w-4 text-green-600 mt-0.5" />
                          <div>
                            <span className="font-medium">Pension:</span> {careerCard.compensationRewards.nonFinancialBenefits.pension}
                          </div>
                        </div>
                      )}
                      {careerCard.compensationRewards.nonFinancialBenefits.healthcare && (
                        <div className="flex items-start gap-2">
                          <Shield className="h-4 w-4 text-green-600 mt-0.5" />
                          <div>
                            <span className="font-medium">Healthcare:</span> {careerCard.compensationRewards.nonFinancialBenefits.healthcare}
                          </div>
                        </div>
                      )}
                      {careerCard.compensationRewards.nonFinancialBenefits.professionalDevelopment && (
                        <div className="flex items-start gap-2">
                          <Book className="h-4 w-4 text-green-600 mt-0.5" />
                          <div>
                            <span className="font-medium">Professional Development:</span> {careerCard.compensationRewards.nonFinancialBenefits.professionalDevelopment}
                          </div>
                        </div>
                      )}
                      {careerCard.compensationRewards.nonFinancialBenefits.perks && careerCard.compensationRewards.nonFinancialBenefits.perks.length > 0 && (
                        <div>
                          <span className="font-medium">Additional Perks:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {careerCard.compensationRewards.nonFinancialBenefits.perks.map((perk, i) => (
                              <span key={i} className="px-2 py-1 bg-green-200 text-green-800 rounded text-xs">
                                {perk}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </AccordionSection>

        {/* 3. Skills & Qualifications */}
        <AccordionSection
          id="skills"
          title="Skills & Qualifications"
          icon={Book}
          isExpanded={expandedSections.has('skills')}
          onToggle={() => toggleSection('skills')}
          bgColor="bg-purple-50"
          borderColor="border-purple-200"
          textColor="text-purple-900"
        >
          <div className="space-y-4">
            {careerCard.competencyRequirements && (
              <>
                {careerCard.competencyRequirements.technicalSkills && careerCard.competencyRequirements.technicalSkills.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Technical Skills Required</h4>
                    <div className="flex flex-wrap gap-2">
                      {careerCard.competencyRequirements.technicalSkills.map((skill, i) => (
                        <span key={i} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {careerCard.competencyRequirements.softSkills && careerCard.competencyRequirements.softSkills.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Soft Skills Needed</h4>
                    <div className="flex flex-wrap gap-2">
                      {careerCard.competencyRequirements.softSkills.map((skill, i) => (
                        <span key={i} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {careerCard.competencyRequirements.qualificationPathway && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900">Education Pathways</h4>
                    
                    {careerCard.competencyRequirements.qualificationPathway.degrees && careerCard.competencyRequirements.qualificationPathway.degrees.length > 0 && (
                      <div>
                        <h5 className="font-medium text-gray-800 mb-2">University Degrees</h5>
                        <ul className="text-sm text-gray-700 space-y-1">
                          {careerCard.competencyRequirements.qualificationPathway.degrees.map((degree, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <GraduationCap className="h-4 w-4 text-purple-600 mt-0.5" />
                              <span>{degree}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {careerCard.competencyRequirements.qualificationPathway.apprenticeships && careerCard.competencyRequirements.qualificationPathway.apprenticeships.length > 0 && (
                      <div>
                        <h5 className="font-medium text-gray-800 mb-2">Apprenticeships</h5>
                        <ul className="text-sm text-gray-700 space-y-1">
                          {careerCard.competencyRequirements.qualificationPathway.apprenticeships.map((apprenticeship, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <Users className="h-4 w-4 text-purple-600 mt-0.5" />
                              <span>{apprenticeship}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {careerCard.competencyRequirements.qualificationPathway.bootcamps && careerCard.competencyRequirements.qualificationPathway.bootcamps.length > 0 && (
                      <div>
                        <h5 className="font-medium text-gray-800 mb-2">Bootcamps & Intensive Programs</h5>
                        <ul className="text-sm text-gray-700 space-y-1">
                          {careerCard.competencyRequirements.qualificationPathway.bootcamps.map((bootcamp, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <Award className="h-4 w-4 text-purple-600 mt-0.5" />
                              <span>{bootcamp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {careerCard.competencyRequirements.qualificationPathway.alternativeRoutes && careerCard.competencyRequirements.qualificationPathway.alternativeRoutes.length > 0 && (
                      <div>
                        <h5 className="font-medium text-gray-800 mb-2">Alternative Routes</h5>
                        <ul className="text-sm text-gray-700 space-y-1">
                          {careerCard.competencyRequirements.qualificationPathway.alternativeRoutes.map((route, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-purple-600 mt-0.5" />
                              <span>{route}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {careerCard.competencyRequirements.learningCurve && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Learning Timeline</h4>
                    <div className="bg-purple-100 p-3 rounded-lg text-sm space-y-2">
                      {careerCard.competencyRequirements.learningCurve.timeToCompetent && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-purple-600" />
                          <span><span className="font-medium">Time to Competent:</span> {careerCard.competencyRequirements.learningCurve.timeToCompetent}</span>
                        </div>
                      )}
                      {careerCard.competencyRequirements.learningCurve.difficultyLevel && (
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-purple-600" />
                          <span><span className="font-medium">Difficulty Level:</span> {careerCard.competencyRequirements.learningCurve.difficultyLevel}</span>
                        </div>
                      )}
                      {careerCard.competencyRequirements.learningCurve.prerequisites && careerCard.competencyRequirements.learningCurve.prerequisites.length > 0 && (
                        <div>
                          <span className="font-medium">Prerequisites:</span>
                          <ul className="mt-1 ml-4">
                            {careerCard.competencyRequirements.learningCurve.prerequisites.map((prereq, i) => (
                              <li key={i} className="text-purple-700">• {prereq}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Perplexity education pathways */}
            {careerCard.perplexityData?.currentEducationPathways && careerCard.perplexityData.currentEducationPathways.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Current Education Programs ({careerCard.perplexityData.currentEducationPathways.length})</h4>
                <div className="space-y-3">
                  {careerCard.perplexityData.currentEducationPathways.map((pathway, i) => (
                    <div key={i} className="bg-purple-50 p-3 rounded-lg text-sm">
                      <div className="font-medium text-purple-900">{pathway.title}</div>
                      <div className="text-purple-700 mt-1">{pathway.type} • {pathway.provider} • {pathway.duration}</div>
                      {pathway.cost && (
                        <div className="text-purple-600 mt-1">
                          Cost: {pathway.cost.min === 0 && pathway.cost.max === 0 ? 'Free' : `£${pathway.cost.min?.toLocaleString()} - £${pathway.cost.max?.toLocaleString()}`}
                        </div>
                      )}
                      {pathway.entryRequirements && pathway.entryRequirements.length > 0 && (
                        <div className="text-purple-600 mt-1">
                          Requirements: {pathway.entryRequirements.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fallback to basic skills if no comprehensive data */}
            {!careerCard.competencyRequirements && careerCard.keySkills && careerCard.keySkills.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Key Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {careerCard.keySkills.map((skill, i) => (
                    <span key={i} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </AccordionSection>

        {/* 4. Career Progression */}
        <AccordionSection
          id="career"
          title="Career Progression"
          icon={TrendingUp}
          isExpanded={expandedSections.has('career')}
          onToggle={() => toggleSection('career')}
          bgColor="bg-orange-50"
          borderColor="border-orange-200"
          textColor="text-orange-900"
        >
          <div className="space-y-4">
            {careerCard.careerTrajectory && (
              <>
                {careerCard.careerTrajectory.progressionSteps && careerCard.careerTrajectory.progressionSteps.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Advancement Steps</h4>
                    <div className="space-y-3">
                      {careerCard.careerTrajectory.progressionSteps.map((step, i) => (
                        <div key={i} className="bg-orange-100 p-3 rounded-lg">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                              {i + 1}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-orange-900">{step.title}</div>
                              {step.timeFrame && (
                                <div className="text-sm text-orange-700 mt-1">
                                  <Clock className="inline h-3 w-3 mr-1" />
                                  {step.timeFrame}
                                </div>
                              )}
                              {step.requirements && step.requirements.length > 0 && (
                                <div className="mt-2 text-sm text-orange-700">
                                  <span className="font-medium">Requirements:</span>
                                  <ul className="mt-1">
                                    {step.requirements.map((req, j) => (
                                      <li key={j} className="ml-4">• {req}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {careerCard.careerTrajectory.horizontalMoves && careerCard.careerTrajectory.horizontalMoves.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Horizontal Opportunities</h4>
                    <div className="flex flex-wrap gap-2">
                      {careerCard.careerTrajectory.horizontalMoves.map((move, i) => (
                        <span key={i} className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                          {move}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {careerCard.careerTrajectory.specialistTrack && careerCard.careerTrajectory.specialistTrack.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Specialist Tracks</h4>
                    <div className="flex flex-wrap gap-2">
                      {careerCard.careerTrajectory.specialistTrack.map((track, i) => (
                        <span key={i} className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                          {track}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Fallback to basic next steps */}
            {!careerCard.careerTrajectory && careerCard.nextSteps && careerCard.nextSteps.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Next Steps</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  {careerCard.nextSteps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-orange-500 mt-1">•</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </AccordionSection>

        {/* 5. Market Intelligence */}
        <AccordionSection
          id="market"
          title="Market Intelligence"
          icon={BarChart3}
          isExpanded={expandedSections.has('market')}
          onToggle={() => toggleSection('market')}
          bgColor="bg-indigo-50"
          borderColor="border-indigo-200"
          textColor="text-indigo-900"
        >
          <div className="space-y-4">
            {careerCard.labourMarketDynamics && (
              <>
                {careerCard.labourMarketDynamics.demandOutlook && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Demand Outlook</h4>
                    <div className="bg-indigo-100 p-3 rounded-lg text-sm space-y-2">
                      {careerCard.labourMarketDynamics.demandOutlook.growthForecast && (
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-indigo-600" />
                          <span><span className="font-medium">Growth Forecast:</span> {careerCard.labourMarketDynamics.demandOutlook.growthForecast}</span>
                        </div>
                      )}
                      {careerCard.labourMarketDynamics.demandOutlook.timeHorizon && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-indigo-600" />
                          <span><span className="font-medium">Time Horizon:</span> {careerCard.labourMarketDynamics.demandOutlook.timeHorizon}</span>
                        </div>
                      )}
                      {careerCard.labourMarketDynamics.demandOutlook.regionalHotspots && careerCard.labourMarketDynamics.demandOutlook.regionalHotspots.length > 0 && (
                        <div>
                          <span className="font-medium">Regional Hotspots:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {careerCard.labourMarketDynamics.demandOutlook.regionalHotspots.map((region, i) => (
                              <span key={i} className="px-2 py-1 bg-indigo-200 text-indigo-800 rounded text-xs">
                                {region}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {careerCard.labourMarketDynamics.supplyProfile && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Supply Profile</h4>
                    <div className="bg-indigo-100 p-3 rounded-lg text-sm space-y-2">
                      {careerCard.labourMarketDynamics.supplyProfile.talentScarcity && (
                        <div><span className="font-medium">Talent Scarcity:</span> {careerCard.labourMarketDynamics.supplyProfile.talentScarcity}</div>
                      )}
                      {careerCard.labourMarketDynamics.supplyProfile.competitionLevel && (
                        <div><span className="font-medium">Competition Level:</span> {careerCard.labourMarketDynamics.supplyProfile.competitionLevel}</div>
                      )}
                      {careerCard.labourMarketDynamics.supplyProfile.barriers && careerCard.labourMarketDynamics.supplyProfile.barriers.length > 0 && (
                        <div>
                          <span className="font-medium">Entry Barriers:</span>
                          <ul className="mt-1 ml-4">
                            {careerCard.labourMarketDynamics.supplyProfile.barriers.map((barrier, i) => (
                              <li key={i} className="text-indigo-700">• {barrier}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {careerCard.labourMarketDynamics.economicSensitivity && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Economic Sensitivity</h4>
                    <div className="bg-indigo-100 p-3 rounded-lg text-sm space-y-2">
                      {careerCard.labourMarketDynamics.economicSensitivity.recessionImpact && (
                        <div><span className="font-medium">Recession Impact:</span> {careerCard.labourMarketDynamics.economicSensitivity.recessionImpact}</div>
                      )}
                      {careerCard.labourMarketDynamics.economicSensitivity.techDisruption && (
                        <div><span className="font-medium">Tech Disruption:</span> {careerCard.labourMarketDynamics.economicSensitivity.techDisruption}</div>
                      )}
                      {careerCard.labourMarketDynamics.economicSensitivity.cyclicalPatterns && (
                        <div><span className="font-medium">Cyclical Patterns:</span> {careerCard.labourMarketDynamics.economicSensitivity.cyclicalPatterns}</div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Perplexity market data */}
            {careerCard.perplexityData?.realTimeMarketDemand && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Real-Time Market Data</h4>
                <div className="bg-indigo-100 p-3 rounded-lg text-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-indigo-600" />
                    <span><span className="font-medium">Job Postings (30 days):</span> {careerCard.perplexityData.realTimeMarketDemand.jobPostingVolume?.toLocaleString() || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-indigo-600" />
                    <span><span className="font-medium">Growth Rate:</span> {careerCard.perplexityData.realTimeMarketDemand.growthRate || 'N/A'}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-indigo-600" />
                    <span><span className="font-medium">Competition Level:</span> {careerCard.perplexityData.realTimeMarketDemand.competitionLevel || 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Industry growth projection */}
            {careerCard.perplexityData?.industryGrowthProjection && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Industry Growth Projection</h4>
                <div className="bg-indigo-100 p-3 rounded-lg text-sm space-y-2">
                  <div><span className="font-medium">Next Year:</span> {careerCard.perplexityData.industryGrowthProjection.nextYear}%</div>
                  <div><span className="font-medium">5-Year Outlook:</span> {careerCard.perplexityData.industryGrowthProjection.fiveYear}%</div>
                  <div><span className="font-medium">Overall Outlook:</span> {careerCard.perplexityData.industryGrowthProjection.outlook}</div>
                  {careerCard.perplexityData.industryGrowthProjection.factors && careerCard.perplexityData.industryGrowthProjection.factors.length > 0 && (
                    <div>
                      <span className="font-medium">Growth Factors:</span>
                      <ul className="mt-1 ml-4">
                        {careerCard.perplexityData.industryGrowthProjection.factors.map((factor, i) => (
                          <li key={i} className="text-indigo-700">• {factor}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Automation risk */}
            {careerCard.perplexityData?.automationRiskAssessment && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Automation Risk Assessment
                </h4>
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-sm space-y-2">
                  <div><span className="font-medium">Risk Level:</span> {careerCard.perplexityData.automationRiskAssessment.level || 'N/A'}</div>
                  <div><span className="font-medium">Timeline:</span> {careerCard.perplexityData.automationRiskAssessment.timeline || 'N/A'}</div>
                  {careerCard.perplexityData.automationRiskAssessment.mitigationStrategies && careerCard.perplexityData.automationRiskAssessment.mitigationStrategies.length > 0 && (
                    <div>
                      <span className="font-medium">Mitigation Strategies:</span>
                      <ul className="mt-1 ml-4">
                        {careerCard.perplexityData.automationRiskAssessment.mitigationStrategies.map((strategy, i) => (
                          <li key={i} className="text-amber-700">• {strategy}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {careerCard.perplexityData.automationRiskAssessment.futureSkillsNeeded && careerCard.perplexityData.automationRiskAssessment.futureSkillsNeeded.length > 0 && (
                    <div>
                      <span className="font-medium">Future Skills Needed:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {careerCard.perplexityData.automationRiskAssessment.futureSkillsNeeded.map((skill, i) => (
                          <span key={i} className="px-2 py-1 bg-amber-200 text-amber-800 rounded text-xs">
                            {skill}
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

        {/* 6. Work Environment */}
        <AccordionSection
          id="environment"
          title="Work Environment"
          icon={Building2}
          isExpanded={expandedSections.has('environment')}
          onToggle={() => toggleSection('environment')}
          bgColor="bg-teal-50"
          borderColor="border-teal-200"
          textColor="text-teal-900"
        >
          <div className="space-y-4">
            {careerCard.workEnvironmentCulture && (
              <>
                {careerCard.workEnvironmentCulture.typicalEmployers && careerCard.workEnvironmentCulture.typicalEmployers.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Typical Employers</h4>
                    <div className="flex flex-wrap gap-2">
                      {careerCard.workEnvironmentCulture.typicalEmployers.map((employer, i) => (
                        <span key={i} className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm">
                          {employer}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {careerCard.workEnvironmentCulture.teamStructures && careerCard.workEnvironmentCulture.teamStructures.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Team Structures</h4>
                    <div className="flex flex-wrap gap-2">
                      {careerCard.workEnvironmentCulture.teamStructures.map((structure, i) => (
                        <span key={i} className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm">
                          {structure}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {careerCard.workEnvironmentCulture.culturalNorms && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Cultural Norms</h4>
                    <div className="bg-teal-100 p-3 rounded-lg text-sm space-y-2">
                      {careerCard.workEnvironmentCulture.culturalNorms.pace && (
                        <div><span className="font-medium">Pace:</span> {careerCard.workEnvironmentCulture.culturalNorms.pace}</div>
                      )}
                      {careerCard.workEnvironmentCulture.culturalNorms.formality && (
                        <div><span className="font-medium">Formality:</span> {careerCard.workEnvironmentCulture.culturalNorms.formality}</div>
                      )}
                      {careerCard.workEnvironmentCulture.culturalNorms.decisionMaking && (
                        <div><span className="font-medium">Decision Making:</span> {careerCard.workEnvironmentCulture.culturalNorms.decisionMaking}</div>
                      )}
                      {careerCard.workEnvironmentCulture.culturalNorms.diversityInclusion && (
                        <div><span className="font-medium">Diversity & Inclusion:</span> {careerCard.workEnvironmentCulture.culturalNorms.diversityInclusion}</div>
                      )}
                    </div>
                  </div>
                )}

                {careerCard.workEnvironmentCulture.physicalContext && careerCard.workEnvironmentCulture.physicalContext.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Physical Context</h4>
                    <div className="flex flex-wrap gap-2">
                      {careerCard.workEnvironmentCulture.physicalContext.map((context, i) => (
                        <span key={i} className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm">
                          {context}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Perplexity work environment data */}
            {careerCard.perplexityData?.workEnvironmentDetails && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Work Environment Details</h4>
                <div className="bg-teal-100 p-3 rounded-lg text-sm space-y-2">
                  {careerCard.perplexityData.workEnvironmentDetails.remoteOptions !== undefined && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-teal-600" />
                      <span><span className="font-medium">Remote Options:</span> {careerCard.perplexityData.workEnvironmentDetails.remoteOptions ? 'Yes' : 'No'}</span>
                    </div>
                  )}
                  {careerCard.perplexityData.workEnvironmentDetails.flexibilityLevel && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-teal-600" />
                      <span><span className="font-medium">Flexibility Level:</span> {careerCard.perplexityData.workEnvironmentDetails.flexibilityLevel}</span>
                    </div>
                  )}
                  {careerCard.perplexityData.workEnvironmentDetails.typicalHours && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-teal-600" />
                      <span><span className="font-medium">Typical Hours:</span> {careerCard.perplexityData.workEnvironmentDetails.typicalHours}</span>
                    </div>
                  )}
                  {careerCard.perplexityData.workEnvironmentDetails.workLifeBalance && (
                    <div><span className="font-medium">Work-Life Balance:</span> {careerCard.perplexityData.workEnvironmentDetails.workLifeBalance}</div>
                  )}
                  {careerCard.perplexityData.workEnvironmentDetails.stressLevel && (
                    <div><span className="font-medium">Stress Level:</span> {careerCard.perplexityData.workEnvironmentDetails.stressLevel}</div>
                  )}
                </div>
              </div>
            )}

            {/* Lifestyle fit data */}
            {careerCard.lifestyleFit && (
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Lifestyle Compatibility</h4>
                
                {careerCard.lifestyleFit.workingHours && (
                  <div>
                    <h5 className="font-medium text-gray-800 mb-2">Working Hours</h5>
                    <div className="bg-teal-100 p-3 rounded-lg text-sm">
                      {careerCard.lifestyleFit.workingHours.typical && (
                        <div><span className="font-medium">Typical:</span> {careerCard.lifestyleFit.workingHours.typical}</div>
                      )}
                      {careerCard.lifestyleFit.workingHours.flexibility && (
                        <div><span className="font-medium">Flexibility:</span> {careerCard.lifestyleFit.workingHours.flexibility}</div>
                      )}
                      {careerCard.lifestyleFit.workingHours.shiftWork !== undefined && (
                        <div><span className="font-medium">Shift Work:</span> {careerCard.lifestyleFit.workingHours.shiftWork ? 'Yes' : 'No'}</div>
                      )}
                      {careerCard.lifestyleFit.workingHours.onCall !== undefined && (
                        <div><span className="font-medium">On Call:</span> {careerCard.lifestyleFit.workingHours.onCall ? 'Yes' : 'No'}</div>
                      )}
                    </div>
                  </div>
                )}

                {careerCard.lifestyleFit.remoteOptions && (
                  <div>
                    <h5 className="font-medium text-gray-800 mb-2">Remote & Travel Options</h5>
                    <div className="bg-teal-100 p-3 rounded-lg text-sm space-y-2">
                      {careerCard.lifestyleFit.remoteOptions.remoteWork !== undefined && (
                        <div><span className="font-medium">Remote Work:</span> {careerCard.lifestyleFit.remoteOptions.remoteWork ? 'Available' : 'Not Available'}</div>
                      )}
                      {careerCard.lifestyleFit.remoteOptions.hybridOptions !== undefined && (
                        <div><span className="font-medium">Hybrid Options:</span> {careerCard.lifestyleFit.remoteOptions.hybridOptions ? 'Available' : 'Not Available'}</div>
                      )}
                      {careerCard.lifestyleFit.remoteOptions.travelRequirements && (
                        <div>
                          <span className="font-medium">Travel Requirements:</span>
                          <div className="ml-4 mt-1">
                            {careerCard.lifestyleFit.remoteOptions.travelRequirements.frequency && (
                              <div>• Frequency: {careerCard.lifestyleFit.remoteOptions.travelRequirements.frequency}</div>
                            )}
                            {careerCard.lifestyleFit.remoteOptions.travelRequirements.duration && (
                              <div>• Duration: {careerCard.lifestyleFit.remoteOptions.travelRequirements.duration}</div>
                            )}
                            {careerCard.lifestyleFit.remoteOptions.travelRequirements.international !== undefined && (
                              <div>• International: {careerCard.lifestyleFit.remoteOptions.travelRequirements.international ? 'Required' : 'Not Required'}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {careerCard.lifestyleFit.stressProfile && (
                  <div>
                    <h5 className="font-medium text-gray-800 mb-2">Stress Profile</h5>
                    <div className="bg-teal-100 p-3 rounded-lg text-sm">
                      {careerCard.lifestyleFit.stressProfile.intensity && (
                        <div><span className="font-medium">Intensity:</span> {careerCard.lifestyleFit.stressProfile.intensity}</div>
                      )}
                      {careerCard.lifestyleFit.stressProfile.volatility && (
                        <div><span className="font-medium">Volatility:</span> {careerCard.lifestyleFit.stressProfile.volatility}</div>
                      )}
                      {careerCard.lifestyleFit.stressProfile.emotionalLabour && (
                        <div><span className="font-medium">Emotional Labour:</span> {careerCard.lifestyleFit.stressProfile.emotionalLabour}</div>
                      )}
                    </div>
                  </div>
                )}

                {careerCard.lifestyleFit.workLifeBoundaries && (
                  <div>
                    <h5 className="font-medium text-gray-800 mb-2">Work-Life Boundaries</h5>
                    <div className="bg-teal-100 p-3 rounded-lg text-sm">
                      {careerCard.lifestyleFit.workLifeBoundaries.flexibility && (
                        <div><span className="font-medium">Flexibility:</span> {careerCard.lifestyleFit.workLifeBoundaries.flexibility}</div>
                      )}
                      {careerCard.lifestyleFit.workLifeBoundaries.autonomy && (
                        <div><span className="font-medium">Autonomy:</span> {careerCard.lifestyleFit.workLifeBoundaries.autonomy}</div>
                      )}
                      {careerCard.lifestyleFit.workLifeBoundaries.predictability && (
                        <div><span className="font-medium">Predictability:</span> {careerCard.lifestyleFit.workLifeBoundaries.predictability}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </AccordionSection>
      </div>
    </div>
  );
};

// Reusable accordion section component
interface AccordionSectionProps {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  isExpanded: boolean;
  onToggle: () => void;
  bgColor: string;
  borderColor: string;
  textColor: string;
  children: React.ReactNode;
}

const AccordionSection: React.FC<AccordionSectionProps> = ({
  id,
  title,
  icon: Icon,
  isExpanded,
  onToggle,
  bgColor,
  borderColor,
  textColor,
  children
}) => {
  return (
    <div className={`border ${borderColor} rounded-lg overflow-hidden`}>
      <button
        onClick={onToggle}
        className={`w-full px-4 py-3 ${bgColor} ${textColor} flex items-center justify-between hover:opacity-80 transition-opacity`}
      >
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5" />
          <span className="font-semibold text-left">{title}</span>
        </div>
        <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
      </button>
      
      {isExpanded && (
        <div className="p-4 bg-white border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  );
};