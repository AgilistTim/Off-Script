import React, { useState } from 'react';
import { ComprehensiveCareerGuidance } from '../../services/careerPathwayService';
import { Button } from '../ui/button';
import { 
  GraduationCap, 
  Heart, 
  PoundSterling, 
  CheckCircle, 
  ArrowRight,
  ExternalLink,
  Clock,
  MapPin,
  Users,
  BookOpen,
  Target,
  Lightbulb
} from 'lucide-react';

interface CareerGuidancePanelProps {
  guidance: ComprehensiveCareerGuidance;
  onRefresh?: () => void;
  isLoading?: boolean;
}

const CareerGuidancePanel: React.FC<CareerGuidancePanelProps> = ({
  guidance,
  onRefresh,
  isLoading = false
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  if (isLoading) {
    return (
      <div className="w-full bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Generating your personalized career guidance...</span>
        </div>
      </div>
    );
  }

  const { primaryPathway, alternativePathways, userProfile, actionPlan, crossCuttingResources } = guidance;

  const TabButton = ({ id, label, isActive, onClick }: {
    id: string;
    label: string;
    isActive: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        isActive 
          ? 'bg-blue-600 text-white' 
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );

  const Badge = ({ children, variant = 'default' }: { 
    children: React.ReactNode; 
    variant?: 'default' | 'outline' | 'secondary' | 'success';
  }) => {
    const baseClass = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    const variants = {
      default: 'bg-blue-100 text-blue-800',
      outline: 'border border-gray-300 text-gray-700',
      secondary: 'bg-gray-100 text-gray-800',
      success: 'bg-green-100 text-green-800'
    };
    
    return (
      <span className={`${baseClass} ${variants[variant]}`}>
        {children}
      </span>
    );
  };

  const Card = ({ children, className = '' }: { 
    children: React.ReactNode; 
    className?: string;
  }) => (
    <div className={`bg-white rounded-lg shadow border p-6 ${className}`}>
      {children}
    </div>
  );

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Target className="mr-3 h-6 w-6 text-blue-600" />
              Your Career Pathway Guide
            </h1>
            <p className="text-gray-600 mt-2">
              Comprehensive UK-specific guidance based on your interests and goals
            </p>
          </div>
          {onRefresh && (
            <Button 
              onClick={onRefresh} 
              variant="outline"
              disabled={isLoading}
            >
              Refresh Guidance
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <GraduationCap className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="font-semibold">Career Stage</div>
            <Badge variant="secondary">{userProfile.careerStage}</Badge>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <Heart className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="font-semibold">Primary Match</div>
            <div className="text-2xl font-bold text-green-600">{primaryPathway.match}%</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <Clock className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="font-semibold">Generated</div>
            <div className="text-sm text-gray-600">
              {guidance.generatedAt.toLocaleDateString()}
            </div>
          </div>
        </div>
      </Card>

      {/* Primary Pathway Overview */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            🎯 {primaryPathway.title}
          </h2>
          <Badge variant="success">{primaryPathway.match}% Match</Badge>
        </div>
        
        <p className="text-gray-700 mb-4">{primaryPathway.description}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="flex items-center space-x-2">
            <GraduationCap className="h-5 w-5 text-blue-600" />
            <span className="font-medium">Training Options:</span>
            <span className="text-gray-600">{primaryPathway.trainingOptions.length}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Heart className="h-5 w-5 text-red-600" />
            <span className="font-medium">Volunteer Roles:</span>
            <span className="text-gray-600">{primaryPathway.volunteeringOpportunities.length}</span>
          </div>
          <div className="flex items-center space-x-2">
            <PoundSterling className="h-5 w-5 text-green-600" />
            <span className="font-medium">Funding Options:</span>
            <span className="text-gray-600">{primaryPathway.fundingOptions.length}</span>
          </div>
        </div>

        {/* Quick Action Items */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            This Week's Actions
          </h4>
          <ul className="space-y-1">
            {actionPlan.thisWeek.slice(0, 3).map((action, index) => (
              <li key={index} className="text-blue-800 text-sm flex items-start">
                <ArrowRight className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                {action}
              </li>
            ))}
          </ul>
        </div>
      </Card>

      {/* Tabs */}
      <Card>
        <div className="flex flex-wrap gap-2 mb-6">
          <TabButton 
            id="overview" 
            label="Overview" 
            isActive={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
          />
          <TabButton 
            id="training" 
            label="Training" 
            isActive={activeTab === 'training'}
            onClick={() => setActiveTab('training')}
          />
          <TabButton 
            id="volunteering" 
            label="Volunteering" 
            isActive={activeTab === 'volunteering'}
            onClick={() => setActiveTab('volunteering')}
          />
          <TabButton 
            id="funding" 
            label="Funding" 
            isActive={activeTab === 'funding'}
            onClick={() => setActiveTab('funding')}
          />
          <TabButton 
            id="action-plan" 
            label="Action Plan" 
            isActive={activeTab === 'action-plan'}
            onClick={() => setActiveTab('action-plan')}
          />
          <TabButton 
            id="progression" 
            label="Progression" 
            isActive={activeTab === 'progression'}
            onClick={() => setActiveTab('progression')}
          />
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* User Profile Summary */}
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Your Profile</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Career Goals</h4>
                    <div className="flex flex-wrap gap-2">
                      {userProfile.goals.map((goal, index) => (
                        <Badge key={index} variant="outline">{goal}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Interests</h4>
                    <div className="flex flex-wrap gap-2">
                      {userProfile.interests.map((interest, index) => (
                        <Badge key={index} variant="secondary">{interest}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {userProfile.skills.map((skill, index) => (
                        <Badge key={index} variant="success">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Reflective Questions */}
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Lightbulb className="h-5 w-5 mr-2 text-yellow-600" />
                  Reflective Questions
                </h3>
                <ul className="space-y-3">
                  {primaryPathway.reflectiveQuestions.map((question, index) => (
                    <li key={index} className="text-gray-700 p-3 bg-yellow-50 rounded-lg">
                      <span className="font-medium text-yellow-800">❓ </span>
                      {question}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Alternative Pathways */}
            {alternativePathways.length > 0 && (
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2">Alternative Career Paths</h3>
                <p className="text-gray-600 mb-4">Other options worth exploring</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {alternativePathways.map((pathway) => (
                    <div key={pathway.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{pathway.title}</h4>
                        <Badge variant="outline">{pathway.match}% Match</Badge>
                      </div>
                      <p className="text-gray-600 text-sm mb-3">{pathway.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>{pathway.trainingOptions.length} training options</span>
                        <span>{pathway.volunteeringOpportunities.length} volunteer roles</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'training' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <GraduationCap className="h-5 w-5 mr-2 text-blue-600" />
              Training Options
            </h3>
            <div className="grid gap-4">
              {primaryPathway.trainingOptions.map((training, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{training.title}</h4>
                    <Badge variant="outline">{training.level}</Badge>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{training.description}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Duration:</span>
                      <div className="text-gray-600">{training.duration}</div>
                    </div>
                    <div>
                      <span className="font-medium">Cost:</span>
                      <div className="text-gray-600">{training.cost}</div>
                    </div>
                    <div>
                      <span className="font-medium">Provider:</span>
                      <div className="text-gray-600">{training.provider}</div>
                    </div>
                    {training.fundingAvailable && (
                      <div>
                        <span className="font-medium">Funding:</span>
                        <div className="text-green-600 text-xs">{training.fundingAvailable}</div>
                      </div>
                    )}
                  </div>
                  {training.link && (
                    <a 
                      href={training.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm mt-2 inline-flex items-center"
                    >
                      Learn More <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'volunteering' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Heart className="h-5 w-5 mr-2 text-red-600" />
              Volunteering Opportunities
            </h3>
            <div className="grid gap-4">
              {primaryPathway.volunteeringOpportunities.map((volunteer, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{volunteer.role}</h4>
                    <Badge variant="outline">{volunteer.organization}</Badge>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{volunteer.description}</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-3">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                      {volunteer.location}
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1 text-gray-400" />
                      {volunteer.timeCommitment}
                    </div>
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-1 text-gray-400" />
                      Skills gained
                    </div>
                  </div>
                  <div className="mb-3">
                    <span className="font-medium text-sm">Skills you'll gain:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {volunteer.skillsGained.map((skill, idx) => (
                        <Badge key={idx} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="mb-3">
                    <span className="font-medium text-sm">Career connection:</span>
                    <p className="text-gray-600 text-sm">{volunteer.careerPathConnection}</p>
                  </div>
                  {volunteer.link && (
                    <a 
                      href={volunteer.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm inline-flex items-center"
                    >
                      Apply to Volunteer <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'funding' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <PoundSterling className="h-5 w-5 mr-2 text-green-600" />
              Funding Options
            </h3>
            <div className="grid gap-4">
              {[...primaryPathway.fundingOptions, ...crossCuttingResources.generalFunding].map((funding, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{funding.name}</h4>
                    <Badge variant="success">{funding.amount}</Badge>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{funding.description}</p>
                  <div className="mb-3">
                    <span className="font-medium text-sm">Eligibility:</span>
                    <ul className="text-sm text-gray-600 ml-4 mt-1">
                      {funding.eligibility.map((criteria, idx) => (
                        <li key={idx} className="list-disc">{criteria}</li>
                      ))}
                    </ul>
                  </div>
                  {funding.link && (
                    <a 
                      href={funding.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm inline-flex items-center"
                    >
                      Apply for Funding <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'action-plan' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-blue-600" />
              Your Action Plan
            </h3>
            
            <div className="grid gap-6">
              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="font-semibold text-blue-900 mb-2">This Week</h4>
                <ul className="space-y-2">
                  {actionPlan.thisWeek.map((action, index) => (
                    <li key={index} className="text-gray-700 flex items-start">
                      <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-blue-500 flex-shrink-0" />
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="border-l-4 border-green-500 pl-4">
                <h4 className="font-semibold text-green-900 mb-2">This Month</h4>
                <ul className="space-y-2">
                  {actionPlan.thisMonth.map((action, index) => (
                    <li key={index} className="text-gray-700 flex items-start">
                      <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-green-500 flex-shrink-0" />
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="border-l-4 border-purple-500 pl-4">
                <h4 className="font-semibold text-purple-900 mb-2">Next 3 Months</h4>
                <ul className="space-y-2">
                  {actionPlan.next3Months.map((action, index) => (
                    <li key={index} className="text-gray-700 flex items-start">
                      <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-purple-500 flex-shrink-0" />
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'progression' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <ArrowRight className="h-5 w-5 mr-2 text-purple-600" />
              Career Progression Path
            </h3>
            <div className="space-y-4">
              {primaryPathway.progressionPath.map((stage, index) => (
                <div key={index} className="border rounded-lg p-4 relative">
                  {index < primaryPathway.progressionPath.length - 1 && (
                    <div className="absolute left-8 top-16 w-0.5 h-8 bg-gray-300"></div>
                  )}
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{stage.stage}</h4>
                        <Badge variant="outline">{stage.timeframe}</Badge>
                      </div>
                      <p className="text-gray-600 text-sm mb-3">{stage.description}</p>
                      <div>
                        <span className="font-medium text-sm">Requirements:</span>
                        <ul className="text-sm text-gray-600 ml-4 mt-1">
                          {stage.requirements.map((req, idx) => (
                            <li key={idx} className="list-disc">{req}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Key Resources */}
      {primaryPathway.keyResources.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <BookOpen className="h-5 w-5 mr-2 text-blue-600" />
            Key Resources
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {primaryPathway.keyResources.map((resource, index) => (
              <div key={index} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">{resource.title}</h4>
                  {resource.link && (
                    <ExternalLink className="h-4 w-4 text-gray-400" />
                  )}
                </div>
                <p className="text-gray-600 text-sm mt-1">{resource.description}</p>
                {resource.link && (
                  <a 
                    href={resource.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm mt-2 inline-block"
                  >
                    Visit Resource →
                  </a>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default CareerGuidancePanel; 