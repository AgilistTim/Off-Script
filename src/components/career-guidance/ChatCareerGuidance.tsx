import React from 'react';
import { ComprehensiveCareerGuidance } from '../../services/careerPathwayService';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  ExternalLink,
  Target,
  GraduationCap,
  Heart,
  ArrowRight,
  Clock,
  DollarSign,
  MapPin,
  Users
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface ChatCareerGuidanceProps {
  guidance: ComprehensiveCareerGuidance;
  onRefresh?: () => void;
  isLoading?: boolean;
}

const ChatCareerGuidance: React.FC<ChatCareerGuidanceProps> = ({
  guidance,
  onRefresh,
  isLoading = false
}) => {
  if (!guidance?.primaryPathway) {
    return (
      <Card>
        <CardContent className="p-4 text-center">
          <div className="space-y-3">
            <div className="mx-auto w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <Target className="h-4 w-4 text-gray-400" />
            </div>
            <div>
              <CardTitle className="text-sm mb-1">Career Guidance Not Available</CardTitle>
              <CardDescription className="text-xs">
                Continue chatting to generate personalized guidance.
              </CardDescription>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 text-center">
          <div className="space-y-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            <CardDescription className="text-xs">Updating your guidance...</CardDescription>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { userProfile, primaryPathway, crossCuttingResources, actionPlan } = guidance;

  // Get the most relevant funding option
  const topFunding = crossCuttingResources?.generalFunding?.[0];
  
  // Get the most relevant training option
  const topTraining = primaryPathway?.trainingOptions?.[0];
  
  // Get the most relevant volunteering opportunity
  const topVolunteering = primaryPathway?.volunteeringOpportunities?.[0];

  return (
    <div className="w-full space-y-3">
      {/* Header with key stats */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-gray-900">
                🎯 Your Career Match
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                {primaryPathway.title}
              </CardDescription>
            </div>
            <Badge variant="default" className="text-xs">
              <Heart className="w-3 h-3 mr-1" />
              {primaryPathway.match}%
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* This Week Actions - Made Actionable */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center">
            <Clock className="w-4 h-4 mr-2 text-blue-600" />
            This Week's Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {actionPlan?.thisWeek?.map((action, index) => (
            <div key={index} className="space-y-2">
              <div className="text-xs font-medium text-gray-900">{action}</div>
              
              {/* Make actions actionable with specific resources */}
              {action.toLowerCase().includes('volunteer') && topVolunteering && (
                <div className="bg-blue-50 p-2 rounded-lg">
                  <div className="text-xs font-medium text-blue-900">{topVolunteering.organization}</div>
                  <div className="text-xs text-blue-700">{topVolunteering.role}</div>
                  <div className="flex items-center text-xs text-blue-600 mt-1">
                    <MapPin className="w-3 h-3 mr-1" />
                    {topVolunteering.location}
                  </div>
                  <div className="flex items-center text-xs text-blue-600">
                    <Clock className="w-3 h-3 mr-1" />
                    {topVolunteering.timeCommitment}
                  </div>
                  {topVolunteering.link && (
                    <Button asChild size="sm" className="mt-2 h-6 text-xs">
                      <a href={topVolunteering.link} target="_blank" rel="noopener noreferrer">
                        Apply Now <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </Button>
                  )}
                </div>
              )}
              
              {action.toLowerCase().includes('training') && topTraining && (
                <div className="bg-green-50 p-2 rounded-lg">
                  <div className="text-xs font-medium text-green-900">{topTraining.title}</div>
                  <div className="text-xs text-green-700">{topTraining.provider}</div>
                  <div className="flex items-center text-xs text-green-600 mt-1">
                    <Clock className="w-3 h-3 mr-1" />
                    {topTraining.duration}
                  </div>
                  <div className="flex items-center text-xs text-green-600">
                    <DollarSign className="w-3 h-3 mr-1" />
                    {topTraining.cost}
                  </div>
                  {topTraining.fundingAvailable && (
                    <div className="text-xs text-green-600 font-medium">
                      💰 {topTraining.fundingAvailable}
                    </div>
                  )}
                  {topTraining.link && (
                    <Button asChild size="sm" className="mt-2 h-6 text-xs">
                      <a href={topTraining.link} target="_blank" rel="noopener noreferrer">
                        Learn More <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </div>
          )) || (
            <div className="text-xs text-gray-500">
              Action plan is being generated...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Funding Highlight */}
      {topFunding && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center">
              <DollarSign className="w-4 h-4 mr-2 text-green-600" />
              Funding Available
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-900">{topFunding.name}</div>
              <div className="text-xs text-gray-600">{topFunding.description}</div>
              <div className="text-xs font-medium text-green-600">
                Amount: {topFunding.amount}
              </div>
              {topFunding.applicationDeadline && (
                <div className="text-xs text-orange-600">
                  Deadline: {topFunding.applicationDeadline}
                </div>
              )}
              {topFunding.link && (
                <Button asChild size="sm" className="mt-2 h-6 text-xs">
                  <a href={topFunding.link} target="_blank" rel="noopener noreferrer">
                    Apply Now <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <Card>
        <CardContent className="p-3">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="text-center">
              <div className="font-medium text-gray-900">{userProfile?.interests?.length || 0}</div>
              <div className="text-gray-500">Interests</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-900">{primaryPathway?.trainingOptions?.length || 0}</div>
              <div className="text-gray-500">Training Options</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call to Action */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
        <CardContent className="p-3 text-center">
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-900">
              Ready to Start Your Journey?
            </div>
            <div className="text-xs text-gray-600 mb-3">
              Explore the full guide with detailed training options, career progression, and action plans.
            </div>
            <div className="flex space-x-2">
              <Button asChild size="sm" className="flex-1 h-7 text-xs">
                <Link to="/dashboard?tab=current-path">
                  <Target className="w-3 h-3 mr-1" />
                  View Full Guide
                </Link>
              </Button>
              {onRefresh && (
                <Button onClick={onRefresh} variant="outline" size="sm" className="h-7 text-xs">
                  Refresh
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatCareerGuidance; 