import React, { useState } from 'react';
import { ComprehensiveCareerGuidance } from '../../services/careerPathwayService';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  GraduationCap, 
  Heart, 
  CheckCircle, 
  ArrowRight,
  ExternalLink,
  Clock,
  MapPin,
  Users,
  BookOpen,
  Target,
  Lightbulb,
  TrendingUp,
  Briefcase,
  Star,
  Play,
  DollarSign
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
  // Early null check
  if (!guidance?.primaryPathway) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <Briefcase className="h-6 w-6 text-gray-400" />
            </div>
            <div>
              <CardTitle className="text-lg mb-2">Career Guidance Not Available</CardTitle>
              <CardDescription className="mb-4">
                We're still generating your personalized career guidance. Please check back in a moment.
              </CardDescription>
              {onRefresh && (
                <Button onClick={onRefresh} variant="outline">
                  Refresh Guide
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <CardDescription>Refreshing your career guidance...</CardDescription>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { userProfile, primaryPathway, alternativePathways, crossCuttingResources } = guidance;

  // Clear career stage descriptions
  const getCareerStageDescription = (stage: string) => {
    switch (stage) {
      case 'exploring':
        return 'Discovering your options';
      case 'transitioning':
        return 'Making a career change';
      case 'advancing':
        return 'Growing in your field';
      default:
        return stage;
    }
  };

  const Badge = ({ children, variant = 'default' }: { 
    children: React.ReactNode; 
    variant?: 'default' | 'outline' | 'secondary' | 'success';
  }) => {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    const variantClasses = {
      default: 'bg-blue-100 text-blue-800',
      outline: 'border border-gray-300 text-gray-700',
      secondary: 'bg-gray-100 text-gray-800',
      success: 'bg-green-100 text-green-800'
    };
    
    return (
      <span className={`${baseClasses} ${variantClasses[variant]}`}>
        {children}
      </span>
    );
  };

  return (
    <div className="w-full space-y-6">
      {/* Header Section with Key Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                🎯 Your Career Pathway Guide
              </CardTitle>
              <CardDescription className="text-base mt-2">
                Personalized guidance based on your interests and goals
              </CardDescription>
            </div>
            {onRefresh && (
              <Button onClick={onRefresh} variant="outline">
                <TrendingUp className="w-4 h-4 mr-2" />
                Refresh Guide
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <GraduationCap className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="font-semibold">Your Journey Stage</div>
              <div className="text-lg font-bold text-blue-600 capitalize">
                {getCareerStageDescription(userProfile?.careerStage || 'exploring')}
              </div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Heart className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="font-semibold">Compatibility Score</div>
              <div className="text-2xl font-bold text-green-600">{primaryPathway.match || 0}%</div>
              <div className="text-xs text-gray-600 mt-1">How well this path fits your profile</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Tab Interface */}
      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="overview" className="w-full">
            <div className="border-b border-gray-200 px-3 md:px-6 pt-4 md:pt-6">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto md:h-12 gap-1 md:gap-0 p-1">
                <TabsTrigger 
                  value="overview" 
                  className="flex items-center justify-center md:space-x-2 text-sm md:text-base py-3 md:py-0 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  <Target className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="ml-1 md:ml-0 hidden sm:inline">Overview</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="pathway" 
                  className="flex items-center justify-center md:space-x-2 text-sm md:text-base py-3 md:py-0 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  <Briefcase className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="ml-1 md:ml-0 hidden sm:inline">Career Path</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="training" 
                  className="flex items-center justify-center md:space-x-2 text-sm md:text-base py-3 md:py-0 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  <BookOpen className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="ml-1 md:ml-0 hidden sm:inline">Learning</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="action" 
                  className="flex items-center justify-center md:space-x-2 text-sm md:text-base py-3 md:py-0 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  <Play className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="ml-1 md:ml-0 hidden sm:inline">Take Action</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-3 md:p-6">
              <TabsContent value="overview" className="space-y-4 md:space-y-6 mt-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                  {/* User Profile Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Your Profile</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Career Goals</h4>
                        <div className="flex flex-wrap gap-2">
                          {userProfile?.goals?.map((goal, index) => (
                            <Badge key={index} variant="outline">{goal}</Badge>
                          )) || <span className="text-gray-500 text-sm">No goals specified</span>}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Interests</h4>
                        <div className="flex flex-wrap gap-2">
                          {userProfile?.interests?.map((interest, index) => (
                            <Badge key={index} variant="secondary">{interest}</Badge>
                          )) || <span className="text-gray-500 text-sm">No interests specified</span>}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Skills</h4>
                        <div className="flex flex-wrap gap-2">
                          {userProfile?.skills?.map((skill, index) => (
                            <Badge key={index} variant="success">{skill}</Badge>
                          )) || <span className="text-gray-500 text-sm">No skills specified</span>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Primary Pathway Overview */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center">
                        <Star className="w-5 h-5 mr-2 text-yellow-500" />
                        Recommended Career Path
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {primaryPathway.title || 'Career Path'}
                      </h3>
                      <p className="text-gray-600 mb-4">
                        {primaryPathway.description || 'No description available'}
                      </p>
                      <Button className="w-full">
                        <ArrowRight className="w-4 h-4 mr-2" />
                        Explore This Path
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Call to Action */}
                <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                  <CardContent className="p-6 text-center">
                    <div className="space-y-4">
                      <div className="mx-auto w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                        <Lightbulb className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-xl mb-2">Ready to Start Your Journey?</CardTitle>
                        <CardDescription className="text-base mb-4">
                          Explore the different tabs above to discover training opportunities, understand your career progression, and create an action plan.
                        </CardDescription>
                        <div className="flex justify-center space-x-3">
                          <Button>
                            <BookOpen className="w-4 h-4 mr-2" />
                            View Learning Options
                          </Button>
                          <Button variant="outline">
                            <Play className="w-4 h-4 mr-2" />
                            Create Action Plan
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="pathway" className="space-y-6 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Career Progression Path</CardTitle>
                    <CardDescription>
                      Your step-by-step journey to success in {primaryPathway.title}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {primaryPathway.progressionPath && primaryPathway.progressionPath.length > 0 ? (
                      <div className="space-y-4">
                        {primaryPathway.progressionPath.map((stage, index) => (
                          <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                            <h4 className="font-semibold text-gray-900">{stage.stage}</h4>
                            <p className="text-gray-600 text-sm">{stage.description}</p>
                            <div className="flex items-center mt-2 space-x-4 text-xs text-gray-500">
                              <span className="flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {stage.timeframe}
                              </span>
                            </div>
                            {stage.requirements && stage.requirements.length > 0 && (
                              <div className="mt-2">
                                <span className="text-xs font-medium text-gray-700">Requirements:</span>
                                <ul className="text-xs text-gray-600 mt-1 list-disc list-inside">
                                  {stage.requirements.map((req, reqIndex) => (
                                    <li key={reqIndex}>{req}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No progression path available</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="training" className="space-y-6 mt-0">
                <div className="grid gap-6">
                  {/* Training Options */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Training & Education Options</CardTitle>
                      <CardDescription>
                        Courses and qualifications to build your skills
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {primaryPathway.trainingOptions && primaryPathway.trainingOptions.length > 0 ? (
                        <div className="grid gap-4">
                          {primaryPathway.trainingOptions.slice(0, 3).map((training, index) => (
                            <div key={index} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-900">{training.title}</h4>
                                  <p className="text-sm text-gray-600 mt-1">{training.description}</p>
                                  <div className="flex items-center mt-2 space-x-4 text-sm text-gray-500">
                                    <span>{training.level}</span>
                                    <span>{training.duration}</span>
                                    <span className="font-medium text-green-600">{training.cost}</span>
                                  </div>
                                  <div className="text-sm text-gray-600 mt-1">
                                    Provider: {training.provider}
                                  </div>
                                </div>
                                {training.link && (
                                  <Button size="sm" variant="light" asChild>
                                    <a href={training.link} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="w-3 h-3 mr-1" />
                                      Learn More
                                    </a>
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No training options available</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Volunteering Opportunities */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Gain Experience</CardTitle>
                      <CardDescription>
                        Volunteering and work experience opportunities
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {primaryPathway.volunteeringOpportunities && primaryPathway.volunteeringOpportunities.length > 0 ? (
                        <div className="grid gap-4">
                          {primaryPathway.volunteeringOpportunities.slice(0, 3).map((opportunity, index) => (
                            <div key={index} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-900">{opportunity.role}</h4>
                                  <p className="text-sm text-gray-600 mt-1">{opportunity.description}</p>
                                  <div className="flex items-center mt-2 space-x-4 text-sm text-gray-500">
                                    <span className="flex items-center">
                                      <MapPin className="w-3 h-3 mr-1" />
                                      {opportunity.location}
                                    </span>
                                    <span className="flex items-center">
                                      <Clock className="w-3 h-3 mr-1" />
                                      {opportunity.timeCommitment}
                                    </span>
                                  </div>
                                  <div className="text-sm text-gray-600 mt-1">
                                    Organization: {opportunity.organization}
                                  </div>
                                </div>
                                {opportunity.link && (
                                  <Button size="sm" variant="outline" asChild>
                                    <a href={opportunity.link} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="w-3 h-3 mr-1" />
                                      Apply
                                    </a>
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No experience opportunities available</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Funding Options */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Funding & Financial Support</CardTitle>
                      <CardDescription>
                        Available funding schemes and financial assistance
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {(primaryPathway.fundingOptions && primaryPathway.fundingOptions.length > 0) || 
                       (crossCuttingResources?.generalFunding && crossCuttingResources.generalFunding.length > 0) ? (
                        <div className="grid gap-4">
                          {/* Primary pathway funding */}
                          {primaryPathway.fundingOptions?.slice(0, 2).map((funding, index) => (
                            <div key={`primary-${index}`} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-900">{funding.name}</h4>
                                  <p className="text-sm text-gray-600 mt-1">{funding.description}</p>
                                  <div className="flex items-center mt-2 space-x-4 text-sm">
                                    <span className="font-medium text-green-600 flex items-center">
                                      <DollarSign className="w-3 h-3 mr-1" />
                                      {funding.amount}
                                    </span>
                                  </div>
                                  <div className="text-sm text-gray-600 mt-1">
                                    Eligibility: {Array.isArray(funding.eligibility) ? funding.eligibility.join(', ') : funding.eligibility}
                                  </div>
                                </div>
                                {funding.link && (
                                  <Button size="sm" variant="outline" asChild>
                                    <a href={funding.link} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="w-3 h-3 mr-1" />
                                      Apply
                                    </a>
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                          
                          {/* General funding */}
                          {crossCuttingResources?.generalFunding?.slice(0, 2).map((funding, index) => (
                            <div key={`general-${index}`} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-900">{funding.name}</h4>
                                  <p className="text-sm text-gray-600 mt-1">{funding.description}</p>
                                  <div className="flex items-center mt-2 space-x-4 text-sm">
                                    <span className="font-medium text-green-600 flex items-center">
                                      <DollarSign className="w-3 h-3 mr-1" />
                                      {funding.amount}
                                    </span>
                                  </div>
                                  <div className="text-sm text-gray-600 mt-1">
                                    Eligibility: {Array.isArray(funding.eligibility) ? funding.eligibility.join(', ') : funding.eligibility}
                                  </div>
                                </div>
                                {funding.link && (
                                  <Button size="sm" variant="outline" asChild>
                                    <a href={funding.link} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="w-3 h-3 mr-1" />
                                      Apply
                                    </a>
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No funding options available</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="action" className="space-y-6 mt-0">
                {/* Actionable Steps with Resources */}
                <div className="grid gap-6">
                  {/* This Week - Immediate Actions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Clock className="w-5 h-5 mr-2 text-green-600" />
                        This Week - Quick Wins
                      </CardTitle>
                      <CardDescription>
                        Immediate actions you can take right now
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {guidance.actionPlan?.thisWeek?.map((action, index) => {
                          // Detect action type and provide specific resources
                          const isVolunteerAction = action.toLowerCase().includes('volunteer');
                          const isTrainingAction = action.toLowerCase().includes('training') || action.toLowerCase().includes('course');
                          const isResearchAction = action.toLowerCase().includes('research') || action.toLowerCase().includes('explore');
                          
                          return (
                            <div key={index} className="border border-green-200 rounded-lg p-4 bg-green-50">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-start">
                                    <CheckCircle className="w-4 h-4 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
                                    <span className="text-sm font-medium text-gray-900">{action}</span>
                                  </div>
                                  
                                  {/* Actionable guidance based on action type */}
                                  {isVolunteerAction && primaryPathway.volunteeringOpportunities?.[0] && (
                                    <div className="mt-3 ml-6 p-3 bg-white rounded border">
                                      <div className="text-xs font-medium text-gray-900">{primaryPathway.volunteeringOpportunities[0].organization}</div>
                                      <div className="text-xs text-gray-600">{primaryPathway.volunteeringOpportunities[0].role}</div>
                                      <div className="flex items-center text-xs text-gray-500 mt-1">
                                        <MapPin className="w-3 h-3 mr-1" />
                                        {primaryPathway.volunteeringOpportunities[0].location}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {isTrainingAction && primaryPathway.trainingOptions?.[0] && (
                                    <div className="mt-3 ml-6 p-3 bg-white rounded border">
                                      <div className="text-xs font-medium text-gray-900">{primaryPathway.trainingOptions[0].title}</div>
                                      <div className="text-xs text-gray-600">{primaryPathway.trainingOptions[0].provider}</div>
                                      <div className="flex items-center text-xs text-green-600 mt-1">
                                        <DollarSign className="w-3 h-3 mr-1" />
                                        {primaryPathway.trainingOptions[0].cost}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {isResearchAction && (
                                    <div className="mt-3 ml-6 p-3 bg-white rounded border">
                                      <div className="text-xs font-medium text-gray-900">Recommended Resources</div>
                                      <div className="text-xs text-gray-600 mt-1">
                                        • National Career Service - Free advice and tools<br/>
                                        • gov.uk/volunteering - Official volunteering opportunities<br/>
                                        • Industry professional associations
                                      </div>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Action buttons */}
                                <div className="ml-4">
                                  {isVolunteerAction && primaryPathway.volunteeringOpportunities?.[0]?.link && (
                                    <Button size="sm" asChild>
                                      <a href={primaryPathway.volunteeringOpportunities[0].link} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="w-3 h-3 mr-1" />
                                        Apply Now
                                      </a>
                                    </Button>
                                  )}
                                  
                                  {isTrainingAction && primaryPathway.trainingOptions?.[0]?.link && (
                                    <Button size="sm" asChild>
                                      <a href={primaryPathway.trainingOptions[0].link} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="w-3 h-3 mr-1" />
                                        Explore Course
                                      </a>
                                    </Button>
                                  )}
                                  
                                  {isResearchAction && (
                                    <Button size="sm" variant="outline" asChild>
                                      <a href="https://nationalcareers.service.gov.uk/explore-careers/job-sector" target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="w-3 h-3 mr-1" />
                                        Start Research
                                      </a>
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        }) || (
                          <div className="text-gray-500 text-sm">No immediate actions available</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Monthly and 3-Month Plans */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center text-base">
                          <Clock className="w-4 h-4 mr-2 text-blue-600" />
                          This Month
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-3">
                          {guidance.actionPlan?.thisMonth?.map((action, index) => (
                            <li key={index} className="flex items-start">
                              <CheckCircle className="w-4 h-4 mr-2 mt-0.5 text-blue-600 flex-shrink-0" />
                              <span className="text-sm text-gray-700">{action}</span>
                            </li>
                          )) || <li className="text-gray-500 text-sm">No monthly actions specified</li>}
                        </ul>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center text-base">
                          <Clock className="w-4 h-4 mr-2 text-purple-600" />
                          Next 3 Months
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-3">
                          {guidance.actionPlan?.next3Months?.map((action, index) => (
                            <li key={index} className="flex items-start">
                              <CheckCircle className="w-4 h-4 mr-2 mt-0.5 text-purple-600 flex-shrink-0" />
                              <span className="text-sm text-gray-700">{action}</span>
                            </li>
                          )) || <li className="text-gray-500 text-sm">No long-term actions specified</li>}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Quick Access Resources */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Quick Access Resources</CardTitle>
                      <CardDescription>
                        Essential links to get started immediately
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Button variant="outline" size="sm" asChild>
                          <a href="https://www.gov.uk/volunteering" target="_blank" rel="noopener noreferrer">
                            <Users className="w-4 h-4 mr-2" />
                            Find Volunteer Roles
                          </a>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <a href="https://find-postgraduate-study.ac.uk" target="_blank" rel="noopener noreferrer">
                            <BookOpen className="w-4 h-4 mr-2" />
                            University Courses
                          </a>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <a href="https://www.gov.uk/apprenticeships-guide" target="_blank" rel="noopener noreferrer">
                            <GraduationCap className="w-4 h-4 mr-2" />
                            Apprenticeships
                          </a>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <a href="https://nationalcareers.service.gov.uk" target="_blank" rel="noopener noreferrer">
                            <Target className="w-4 h-4 mr-2" />
                            Career Guidance
                          </a>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <a href="https://nationalcareers.service.gov.uk/explore-careers/job-sector" target="_blank" rel="noopener noreferrer">
                            <Lightbulb className="w-4 h-4 mr-2" />
                            Job Market Info
                          </a>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <a href="https://www.gov.uk/browse/working" target="_blank" rel="noopener noreferrer">
                            <Briefcase className="w-4 h-4 mr-2" />
                            Working in UK
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default CareerGuidancePanel; 