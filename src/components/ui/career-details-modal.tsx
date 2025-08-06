import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, CheckCircle, Briefcase, GraduationCap, Users, RefreshCw } from 'lucide-react';
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
                {careerCard.perplexityData ? (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200">
                      <h2 className="text-lg font-bold text-green-800 mb-2 flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" />
                        🎉 ENHANCED PERPLEXITY DATA FOUND AND DISPLAYED!
                      </h2>
                      <p className="text-sm text-green-700">All available enhanced career intelligence is shown below</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Verified Salary Ranges */}
                      {careerCard.perplexityData.verifiedSalaryRanges && (
                        <section className="border border-gray-200 rounded-lg p-4">
                          <h3 className="text-lg font-semibold mb-3 text-gray-900 border-b pb-2 flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-green-600" />
                            💰 Verified Salary Ranges
                          </h3>
                          <div className="space-y-3">
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div className="text-center">
                                <div className="text-xs text-gray-500">Entry</div>
                                <div className="font-medium text-green-700">
                                  £{careerCard.perplexityData.verifiedSalaryRanges.entry.min.toLocaleString()} - £{careerCard.perplexityData.verifiedSalaryRanges.entry.max.toLocaleString()}
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-xs text-gray-500">Mid</div>
                                <div className="font-medium text-green-700">
                                  £{careerCard.perplexityData.verifiedSalaryRanges.mid.min.toLocaleString()} - £{careerCard.perplexityData.verifiedSalaryRanges.mid.max.toLocaleString()}
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-xs text-gray-500">Senior</div>
                                <div className="font-medium text-green-700">
                                  £{careerCard.perplexityData.verifiedSalaryRanges.senior.min.toLocaleString()} - £{careerCard.perplexityData.verifiedSalaryRanges.senior.max.toLocaleString()}
                                </div>
                              </div>
                            </div>
                            {careerCard.perplexityData.verifiedSalaryRanges.byRegion && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <div className="text-xs text-gray-600 mb-2">Regional Breakdown</div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div>London: £{careerCard.perplexityData.verifiedSalaryRanges.byRegion.london.min.toLocaleString()} - £{careerCard.perplexityData.verifiedSalaryRanges.byRegion.london.max.toLocaleString()}</div>
                                  <div>Manchester: £{careerCard.perplexityData.verifiedSalaryRanges.byRegion.manchester.min.toLocaleString()} - £{careerCard.perplexityData.verifiedSalaryRanges.byRegion.manchester.max.toLocaleString()}</div>
                                  <div>Birmingham: £{careerCard.perplexityData.verifiedSalaryRanges.byRegion.birmingham.min.toLocaleString()} - £{careerCard.perplexityData.verifiedSalaryRanges.byRegion.birmingham.max.toLocaleString()}</div>
                                  <div>Scotland: £{careerCard.perplexityData.verifiedSalaryRanges.byRegion.scotland.min.toLocaleString()} - £{careerCard.perplexityData.verifiedSalaryRanges.byRegion.scotland.max.toLocaleString()}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        </section>
                      )}

                      {/* Real-Time Market Demand */}
                      {careerCard.perplexityData.realTimeMarketDemand && (
                        <section className="border border-gray-200 rounded-lg p-4">
                          <h3 className="text-lg font-semibold mb-3 text-gray-900 border-b pb-2">📈 Real-Time Market Demand</h3>
                          <div className="space-y-2 text-sm">
                            <div><span className="font-medium">Job Postings:</span> {careerCard.perplexityData.realTimeMarketDemand.jobPostingVolume?.toLocaleString() || 'N/A'}</div>
                            <div><span className="font-medium">Growth Rate:</span> {careerCard.perplexityData.realTimeMarketDemand.growthRate || 'N/A'}%</div>
                            <div><span className="font-medium">Competition:</span> {careerCard.perplexityData.realTimeMarketDemand.competitionLevel || 'N/A'}</div>
                          </div>
                        </section>
                      )}

                      {/* Education Pathways */}
                      {careerCard.perplexityData.currentEducationPathways && careerCard.perplexityData.currentEducationPathways.length > 0 && (
                        <section className="border border-gray-200 rounded-lg p-4">
                          <h3 className="text-lg font-semibold mb-3 text-gray-900 border-b pb-2 flex items-center gap-2">
                            <GraduationCap className="h-5 w-5 text-orange-600" />
                            🎓 Education Pathways ({careerCard.perplexityData.currentEducationPathways.length})
                          </h3>
                          <div className="space-y-3">
                            {careerCard.perplexityData.currentEducationPathways.map((pathway, i) => (
                              <div key={i} className="bg-orange-50 p-3 rounded text-sm">
                                <div className="font-medium text-orange-900">{pathway.title}</div>
                                <div className="text-orange-700">{pathway.type} • {pathway.provider} • {pathway.duration}</div>
                                {pathway.cost && (
                                  <div className="text-orange-600">
                                    Cost: {pathway.cost.min === 0 && pathway.cost.max === 0 ? 'Free' : `£${pathway.cost.min?.toLocaleString()} - £${pathway.cost.max?.toLocaleString()}`}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </section>
                      )}

                      {/* Work Environment Details */}
                      {careerCard.perplexityData.workEnvironmentDetails && (
                        <section className="border border-gray-200 rounded-lg p-4">
                          <h3 className="text-lg font-semibold mb-3 text-gray-900 border-b pb-2 flex items-center gap-2">
                            <Users className="h-5 w-5 text-purple-600" />
                            🏢 Work Environment
                          </h3>
                          <div className="space-y-2 text-sm">
                            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">{JSON.stringify(careerCard.perplexityData.workEnvironmentDetails, null, 2)}</pre>
                          </div>
                        </section>
                      )}

                      {/* Automation Risk Assessment */}
                      {careerCard.perplexityData.automationRiskAssessment && (
                        <section className="border border-gray-200 rounded-lg p-4">
                          <h3 className="text-lg font-semibold mb-3 text-gray-900 border-b pb-2">🤖 Automation Risk Assessment</h3>
                          <div className="space-y-2 text-sm">
                            <div><span className="font-medium">Risk Level:</span> {careerCard.perplexityData.automationRiskAssessment.level || 'N/A'}</div>
                            <div><span className="font-medium">Timeline:</span> {careerCard.perplexityData.automationRiskAssessment.timeline || 'N/A'}</div>
                            {careerCard.perplexityData.automationRiskAssessment.mitigationStrategies && (
                              <div>
                                <span className="font-medium">Mitigation Strategies:</span>
                                <ul className="mt-1">
                                  {careerCard.perplexityData.automationRiskAssessment.mitigationStrategies.map((strategy, i) => (
                                    <li key={i} className="text-xs">• {strategy}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </section>
                      )}

                      {/* Industry Growth Projection */}
                      {careerCard.perplexityData.industryGrowthProjection && (
                        <section className="border border-gray-200 rounded-lg p-4">
                          <h3 className="text-lg font-semibold mb-3 text-gray-900 border-b pb-2">📊 Industry Growth Projection</h3>
                          <div className="space-y-2 text-sm">
                            <div><span className="font-medium">Next Year:</span> {careerCard.perplexityData.industryGrowthProjection.nextYear}%</div>
                            <div><span className="font-medium">5-Year:</span> {careerCard.perplexityData.industryGrowthProjection.fiveYear}%</div>
                            <div><span className="font-medium">Outlook:</span> {careerCard.perplexityData.industryGrowthProjection.outlook}</div>
                            {careerCard.perplexityData.industryGrowthProjection.factors && (
                              <div>
                                <span className="font-medium">Growth Factors:</span>
                                <ul className="mt-1">
                                  {careerCard.perplexityData.industryGrowthProjection.factors.map((factor, i) => (
                                    <li key={i} className="text-xs">• {factor}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </section>
                      )}
                    </div>

                    {/* DEBUG SECTION */}
                    <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h3 className="text-sm font-bold text-blue-800 mb-2">🔍 DEBUG: Full Perplexity Data</h3>
                      <div className="text-xs">
                        <div className="mb-2">Data areas available:</div>
                        <ul className="ml-4 mb-3">
                          <li>✅ verifiedSalaryRanges: {careerCard.perplexityData.verifiedSalaryRanges ? '✓ YES' : '✗ NO'}</li>
                          <li>✅ realTimeMarketDemand: {careerCard.perplexityData.realTimeMarketDemand ? '✓ YES' : '✗ NO'}</li>
                          <li>✅ currentEducationPathways: {careerCard.perplexityData.currentEducationPathways ? '✓ YES' : '✗ NO'}</li>
                          <li>✅ workEnvironmentDetails: {careerCard.perplexityData.workEnvironmentDetails ? '✓ YES' : '✗ NO'}</li>
                          <li>✅ automationRiskAssessment: {careerCard.perplexityData.automationRiskAssessment ? '✓ YES' : '✗ NO'}</li>
                          <li>✅ industryGrowthProjection: {careerCard.perplexityData.industryGrowthProjection ? '✓ YES' : '✗ NO'}</li>
                        </ul>
                        <div className="bg-gray-100 p-2 rounded overflow-auto max-h-40">
                          <pre>{JSON.stringify(careerCard.perplexityData, null, 2)}</pre>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h2 className="text-lg font-bold text-red-800 mb-2">❌ NO ENHANCED PERPLEXITY DATA FOUND</h2>
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
                )}
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