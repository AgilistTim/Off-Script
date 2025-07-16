import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, TrendingUp, Clock, CheckCircle, ArrowRight, Briefcase, GraduationCap, Users } from 'lucide-react';

interface CareerCardData {
  id: string;
  title: string;
  description: string;
  industry: string;
  averageSalary: {
    entry: string;
    experienced: string;
    senior: string;
  };
  growthOutlook: string;
  entryRequirements: string[];
  trainingPathways: string[];
  keySkills: string[];
  workEnvironment: string;
  nextSteps: string[];
  location: string;
  confidence: number;
}

interface CareerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  careerCard: CareerCardData | null;
}

export const CareerDetailsModal: React.FC<CareerDetailsModalProps> = ({
  isOpen,
  onClose,
  careerCard
}) => {
  if (!careerCard) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 md:inset-8 lg:inset-16 bg-white rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 relative">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
                
                <div className="pr-12">
                  <h2 className="text-2xl md:text-3xl font-bold mb-2">{careerCard.title}</h2>
                  <div className="flex items-center gap-4 text-blue-100">
                    <div className="flex items-center gap-1">
                      <Briefcase className="h-4 w-4" />
                      <span>{careerCard.industry}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{careerCard.location}</span>
                    </div>
                                         <div className="flex items-center gap-1">
                       <CheckCircle className="h-4 w-4" />
                       <span>{Math.round((careerCard.confidence || 0.85) * 100)}% match</span>
                     </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column */}
                  <div className="space-y-6">
                    {/* Overview */}
                    <section>
                      <h3 className="text-lg font-semibold mb-3 text-gray-900">Overview</h3>
                      <p className="text-gray-600 leading-relaxed">{careerCard.description}</p>
                    </section>

                    {/* Salary Information */}
                    <section>
                      <h3 className="text-lg font-semibold mb-3 text-gray-900 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        Salary Range
                      </h3>
                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Entry Level</div>
                            <div className="font-semibold text-green-700">{careerCard.averageSalary.entry}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Experienced</div>
                            <div className="font-semibold text-green-700">{careerCard.averageSalary.experienced}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Senior</div>
                            <div className="font-semibold text-green-700">{careerCard.averageSalary.senior}</div>
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Growth Outlook */}
                    <section>
                      <h3 className="text-lg font-semibold mb-3 text-gray-900">Growth Outlook</h3>
                      <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-blue-800">{careerCard.growthOutlook}</p>
                      </div>
                    </section>

                    {/* Work Environment */}
                    <section>
                      <h3 className="text-lg font-semibold mb-3 text-gray-900 flex items-center gap-2">
                        <Users className="h-5 w-5 text-purple-600" />
                        Work Environment
                      </h3>
                      <p className="text-gray-600">{careerCard.workEnvironment}</p>
                    </section>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    {/* Key Skills */}
                    <section>
                      <h3 className="text-lg font-semibold mb-3 text-gray-900">Key Skills</h3>
                      <div className="flex flex-wrap gap-2">
                        {careerCard.keySkills.map((skill, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </section>

                    {/* Entry Requirements */}
                    <section>
                      <h3 className="text-lg font-semibold mb-3 text-gray-900 flex items-center gap-2">
                        <GraduationCap className="h-5 w-5 text-orange-600" />
                        Entry Requirements
                      </h3>
                      <ul className="space-y-2">
                        {careerCard.entryRequirements.map((requirement, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-600">{requirement}</span>
                          </li>
                        ))}
                      </ul>
                    </section>

                    {/* Training Pathways */}
                    <section>
                      <h3 className="text-lg font-semibold mb-3 text-gray-900">Training Pathways</h3>
                      <ul className="space-y-2">
                        {careerCard.trainingPathways.map((pathway, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <ArrowRight className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-600">{pathway}</span>
                          </li>
                        ))}
                      </ul>
                    </section>

                    {/* Next Steps */}
                    <section>
                      <h3 className="text-lg font-semibold mb-3 text-gray-900 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-indigo-600" />
                        Next Steps
                      </h3>
                      <div className="bg-indigo-50 rounded-lg p-4">
                        <ol className="space-y-2">
                          {careerCard.nextSteps.map((step, index) => (
                            <li key={index} className="flex items-start gap-3">
                              <span className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white text-sm rounded-full flex items-center justify-center font-medium">
                                {index + 1}
                              </span>
                              <span className="text-indigo-800">{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </section>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t bg-gray-50 p-6">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    This information is personalized based on your interests and conversation.
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