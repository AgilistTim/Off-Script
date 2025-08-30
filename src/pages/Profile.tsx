import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { updateUserProfile, updateUserPreferences } from '../services/userService';
import { UserProfile, UserPreferences } from '../models/User';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Briefcase, 
  Target, 
  TrendingUp, 
  Heart, 
  Edit3, 
  Plus, 
  X, 
  Zap,
  Crown,
  Rocket,
  Star,
  BookOpen,
  PoundSterling,
  Lightbulb,
  Smile,
  Clock,
  Activity,
  BarChart3,
  Download,
  RefreshCw,
  Calendar,
  Users,
  MessageSquare,
  Award
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import careerPathwayService from '../services/careerPathwayService';
import { ProfileAnalyticsService, ProfileAnalytics } from '../services/profile/profileAnalyticsService';
import ProfileInsightsPanel from '../components/profile/ProfileInsightsPanel';

const Profile: React.FC = () => {
  const { currentUser, userData, refreshUserData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPreferences, setIsEditingPreferences] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  // Migrated career insights state
  const [migratedProfile, setMigratedProfile] = useState<any | null>(null);
  const [combinedProfile, setCombinedProfile] = useState<any | null>(null);
  
  // Analytics dashboard state
  const [analytics, setAnalytics] = useState<ProfileAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  
  // Profile form state
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    displayName: '',
    bio: '',
    school: '',
    grade: '',
    interests: [],
    careerGoals: [],
    skills: []
  });
  
  // Preferences form state
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: 'system',
    notifications: true,
    emailUpdates: true
  });
  
  // Convert object-like arrays to real arrays
  const objectToArray = (obj: any): string[] => {
    if (!obj) return [];
    if (Array.isArray(obj)) return obj;
    
    // Handle object with numeric keys like {0: "value", 1: "value2"}
    if (typeof obj === 'object') {
      return Object.values(obj);
    }
    
    return [];
  };

  // Load analytics data
  const loadAnalytics = async () => {
    if (!currentUser) return;
    
    setAnalyticsLoading(true);
    try {
      console.log('🔍 PROFILE DASHBOARD - Loading analytics for user:', currentUser.uid);
      const analyticsData = await ProfileAnalyticsService.processCareerMetrics(currentUser.uid);
      setAnalytics(analyticsData);
      setLastRefresh(new Date());
      console.log('✅ PROFILE DASHBOARD - Analytics loaded successfully:', analyticsData);
    } catch (error) {
      console.error('❌ PROFILE DASHBOARD - Error loading analytics:', error);
      // Set empty analytics to prevent endless loading
      setAnalytics(ProfileAnalyticsService.getDefaultAnalytics());
    } finally {
      setAnalyticsLoading(false);
    }
  };
  
  // Load user data when component mounts
  useEffect(() => {
    console.log("userData useEffect triggered, userData:", userData);
    if (userData) {
      console.log("Loading user data:", userData);
      // Load profile data
      if (userData.profile) {
        console.log("Profile data:", userData.profile);
        
        // Convert object-like arrays to real arrays
        const interests = objectToArray(userData.profile.interests);
        const careerGoals = objectToArray(userData.profile.careerGoals);
        const skills = objectToArray(userData.profile.skills);
        
        const newProfileData = {
          displayName: userData.profile.displayName || '',
          bio: userData.profile.bio || '',
          school: userData.profile.school || '',
          grade: userData.profile.grade || '',
          interests,
          careerGoals,
          skills
        };
        
        setProfile(newProfileData);
        console.log("✅ Profile data loaded successfully:", newProfileData);
      } else {
        console.log("No profile data in userData, will attempt to load migrated data");
      }
      
      // Load preferences data
      if (userData.preferences) {
        setPreferences({
          theme: userData.preferences.theme || 'system',
          notifications: userData.preferences.notifications !== undefined ? userData.preferences.notifications : true,
          emailUpdates: userData.preferences.emailUpdates !== undefined ? userData.preferences.emailUpdates : true
        });
      }
    } else {
      console.log("No userData available, user may still be loading");
    }
  }, [userData]);

  // Fetch migrated career insights
  useEffect(() => {
    const fetchCareerInsights = async () => {
      if (!currentUser) return;
      
      console.log('🔍 PROFILE DEBUG - Checking for migrated career data');
      
      // Check if we already have profile data loaded
      const hasCurrentProfileData = profile.interests?.length || profile.careerGoals?.length || profile.skills?.length;
      
      // Check userData profile 
      const hasUserDataProfile = userData?.profile && (
        (userData.profile.interests?.length || 0) + 
        (userData.profile.careerGoals?.length || 0) + 
        (userData.profile.skills?.length || 0)
      ) >= 2; // At least 2 items across interests, goals, and skills
      
      console.log('🔍 PROFILE DEBUG - Current state:', {
        hasCurrentProfileData,
        hasUserDataProfile,
        currentProfileInterests: profile.interests?.length || 0,
        currentProfileGoals: profile.careerGoals?.length || 0,
        currentProfileSkills: profile.skills?.length || 0,
        userDataProfileExists: !!userData?.profile
      });
      
      // If we already have comprehensive data, skip fetching
      if (hasCurrentProfileData && hasUserDataProfile) {
        console.log('✅ PROFILE DEBUG - Comprehensive profile data already exists, skipping fetch');
        return;
      }
      
      try {
        console.log('🔍 PROFILE DEBUG - Attempting to fetch migrated data');
        
        // Get migrated profile from career pathway service
        const migratedData = await careerPathwayService.getMigratedPersonProfile(currentUser.uid);
        if (migratedData) {
          console.log('🔍 PROFILE DEBUG - Migrated data found:', migratedData);
          setMigratedProfile(migratedData);
        } else {
          console.log('🔍 PROFILE DEBUG - No migrated data found');
        }
        
        // Get combined profile 
        const combinedData = await careerPathwayService.getCombinedUserProfile(currentUser.uid);
        if (combinedData) {
          console.log('🔍 [PROFILE UI] Combined data found with enhanced insights:', {
            hasEnhancedPersonalData: !!combinedData.enhancedPersonalData,
            extractedName: combinedData.enhancedPersonalData?.extractedName,
            personalityTraitsCount: combinedData.enhancedPersonalData?.personalityTraits?.length || 0,
            communicationStyle: combinedData.enhancedPersonalData?.communicationStyle,
            motivationsCount: combinedData.enhancedPersonalData?.motivations?.length || 0,
            concernsCount: combinedData.enhancedPersonalData?.concerns?.length || 0,
            preferencesCount: combinedData.enhancedPersonalData?.preferences?.length || 0,
            source: combinedData.source
          });
          setCombinedProfile(combinedData);
          
          // Update profile state with combined data if we don't have comprehensive userData profile
          if (!hasUserDataProfile && (combinedData.interests?.length || combinedData.careerGoals?.length || combinedData.skills?.length)) {
            console.log('🔄 PROFILE DEBUG - Updating profile with combined/migrated data');
            
            setProfile(prev => {
              const newProfile = {
                ...prev,
                displayName: combinedData.enhancedPersonalData?.extractedName || prev.displayName || '',
                interests: combinedData.interests?.length ? combinedData.interests : prev.interests || [],
                careerGoals: combinedData.careerGoals?.length ? combinedData.careerGoals : prev.careerGoals || [],
                skills: combinedData.skills?.length ? combinedData.skills : prev.skills || []
              };
              console.log('✅ PROFILE DEBUG - Profile updated with migrated data:', newProfile);
              return newProfile;
            });
          } else {
            console.log('🔍 PROFILE DEBUG - Not updating profile - comprehensive userData exists or no combined data');
          }
        } else {
          console.log('🔍 PROFILE DEBUG - No combined data found');
        }
      } catch (error) {
        console.error('❌ PROFILE DEBUG - Error fetching career insights:', error);
      }
    };
    
    // Add a small delay to ensure userData has loaded first
    const timer = setTimeout(fetchCareerInsights, 500);
    return () => clearTimeout(timer);
  }, [currentUser, userData]); // Add userData as dependency

  // Load analytics when user is available
  useEffect(() => {
    const timer = setTimeout(loadAnalytics, 1000); // Load after profile data
    return () => clearTimeout(timer);
  }, [currentUser]);
  
  // Handle profile form submission
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    setLoading(true);
    try {
      await updateUserProfile(currentUser.uid, profile);
      await refreshUserData(); // This will trigger a refetch of user data
      setMessage({ text: 'Profile updated successfully!', type: 'success' });
      setIsEditingProfile(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ text: 'Failed to update profile. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle preferences form submission
  const handlePreferencesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    setLoading(true);
    try {
      await updateUserPreferences(currentUser.uid, preferences);
      await refreshUserData();
      setMessage({ text: 'Preferences updated successfully!', type: 'success' });
      setIsEditingPreferences(false);
    } catch (error) {
      console.error('Error updating preferences:', error);
      setMessage({ text: 'Failed to update preferences. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle adding new interest
  const addInterest = (newInterest: string) => {
    if (newInterest.trim() && !profile.interests?.includes(newInterest.trim())) {
      setProfile(prev => ({
        ...prev,
        interests: [...(prev.interests || []), newInterest.trim()]
      }));
    }
  };
  
  // Handle removing interest
  const removeInterest = (interest: string) => {
    setProfile(prev => ({
      ...prev,
      interests: prev.interests?.filter(i => i !== interest) || []
    }));
  };
  
  // Handle adding new career goal
  const addCareerGoal = (newGoal: string) => {
    if (newGoal.trim() && !profile.careerGoals?.includes(newGoal.trim())) {
      setProfile(prev => ({
        ...prev,
        careerGoals: [...(prev.careerGoals || []), newGoal.trim()]
      }));
    }
  };
  
  // Handle removing career goal
  const removeCareerGoal = (goal: string) => {
    setProfile(prev => ({
      ...prev,
      careerGoals: prev.careerGoals?.filter(g => g !== goal) || []
    }));
  };
  
  // Handle adding new skill
  const addSkill = (newSkill: string) => {
    if (newSkill.trim() && !profile.skills?.includes(newSkill.trim())) {
      setProfile(prev => ({
        ...prev,
        skills: [...(prev.skills || []), newSkill.trim()]
      }));
    }
  };
  
  // Handle removing skill
  const removeSkill = (skill: string) => {
    setProfile(prev => ({
      ...prev,
      skills: prev.skills?.filter(s => s !== skill) || []
    }));
  };

  const ProfileSection: React.FC<{
    title: string;
    icon: React.ReactNode;
    gradient: string;
    children: React.ReactNode;
  }> = ({ title, icon, gradient, children }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.6, 0.01, 0.05, 0.95] }}
      className={`relative overflow-hidden rounded-2xl p-6 sm:p-8 shadow-2xl border border-gray-600/20 ${gradient}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-white/50 backdrop-blur-sm" />
      <div className="relative">
        <div className="flex items-center space-x-4 mb-4 sm:mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-700 rounded-xl flex items-center justify-center shadow-lg">
            {icon}
          </div>
          <h2 className="text-xl sm:text-2xl font-street font-bold text-black">
            {title}
          </h2>
        </div>
        <div className="text-black">
          {children}
        </div>
      </div>
    </motion.div>
  );

  const TagDisplay: React.FC<{
    items: string[];
    color: string;
    icon: React.ReactNode;
    emptyMessage: string;
  }> = ({ items, color, icon, emptyMessage }) => (
    <div className="space-y-4">
      {items && items.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {items.map((item, index) => (
            <motion.span
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full font-bold text-sm ${color} shadow-lg hover:scale-105 transition-transform duration-200`}
            >
              {icon}
              <span>{item}</span>
            </motion.span>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-black/40 text-lg font-medium">
            {emptyMessage}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-100/5 to-gray-200/10 pt-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-4 mb-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-street font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-600 via-gray-700 to-gray-800 animate-glow-pulse">
              CAREER DASHBOARD
            </h1>
            <Button 
              onClick={loadAnalytics}
              disabled={analyticsLoading}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${analyticsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          <p className="text-lg sm:text-xl text-black/80 font-medium">
            Real-time insights into your career development journey
          </p>
          {lastRefresh && (
            <p className="text-sm text-black/60 mt-2">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </p>
          )}
        </motion.div>

        {/* Message Display */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mb-8 p-4 rounded-xl font-bold text-center ${
                message.type === 'success' 
                  ? 'bg-gradient-to-r from-gray-200/20 to-gray-300/20 text-gray-700 border border-gray-600/30' 
                  : 'bg-gradient-to-r from-gray-300/20 to-gray-400/20 text-gray-600 border border-gray-500/30'
              }`}
            >
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Analytics Dashboard */}
        {analytics && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            {/* Engagement Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600">Total Hours</p>
                      <p className="text-2xl font-bold text-blue-900">{analytics.engagementSummary.totalHours}h</p>
                    </div>
                    <Clock className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600">Sessions</p>
                      <p className="text-2xl font-bold text-green-900">{analytics.engagementSummary.totalSessions}</p>
                    </div>
                    <Activity className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-600">Avg Session</p>
                      <p className="text-2xl font-bold text-purple-900">{analytics.engagementSummary.averageSessionLength}m</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-600">Messages</p>
                      <p className="text-2xl font-bold text-orange-900">{analytics.conversationInsights.totalMessages}</p>
                    </div>
                    <MessageSquare className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Skills & Interests Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Skills Progression */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Skills Development
                  </CardTitle>
                  <CardDescription>
                    Your emerging skills and growth areas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-2">Top Skills</p>
                      <div className="space-y-2">
                        {analytics.skillsProgression.identifiedSkills.slice(0, 5).map((skill, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <span className="text-sm">{skill.skill}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${skill.proficiency}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500">{skill.proficiency}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {analytics.skillsProgression.growthAreas.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Growth Areas</p>
                        <div className="flex flex-wrap gap-2">
                          {analytics.skillsProgression.growthAreas.slice(0, 4).map((area, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {area}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Interest Evolution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Interest Evolution
                  </CardTitle>
                  <CardDescription>
                    How your career interests are developing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-blue-600">{analytics.interestEvolution.interestDiversity}</p>
                        <p className="text-xs text-gray-500">Areas Explored</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">{analytics.interestEvolution.focusShift}%</p>
                        <p className="text-xs text-gray-500">Focus Change</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-purple-600">{analytics.skillsProgression.topSkillCategory}</p>
                        <p className="text-xs text-gray-500">Top Category</p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium mb-2">Current Interests</p>
                      <div className="space-y-2">
                        {analytics.interestEvolution.currentInterests.slice(0, 5).map((interest, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <span className="text-sm">{interest.interest}</span>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={interest.trend === 'growing' ? 'default' : 
                                         interest.trend === 'declining' ? 'destructive' : 'secondary'}
                                className="text-xs"
                              >
                                {interest.trend}
                              </Badge>
                              <span className="text-xs text-gray-500">{interest.strength}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Career Milestones */}
            {analytics.careerMilestones.length > 0 && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Recent Career Milestones
                  </CardTitle>
                  <CardDescription>
                    Key moments in your career development journey
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.careerMilestones.slice(0, 6).map((milestone, index) => {
                      console.log(`🗓️ MILESTONE ${index} DEBUG:`, {
                        date: milestone.date,
                        dateType: typeof milestone.date,
                        isDate: milestone.date instanceof Date,
                        dateConstructor: milestone.date?.constructor?.name,
                        rawValue: milestone.date
                      });
                      return (
                        <div key={index} className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
                          <div className={`w-3 h-3 rounded-full mt-1 ${
                            milestone.significance === 'major' ? 'bg-red-500' :
                            milestone.significance === 'moderate' ? 'bg-yellow-500' : 'bg-blue-500'
                          }`} />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{milestone.description}</p>
                            <p className="text-xs text-gray-500">
                              {milestone.date.toLocaleDateString()} • {milestone.type.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Top Discussion Topics */}
            {analytics.conversationInsights.topDiscussionTopics.length > 0 && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Most Discussed Topics
                  </CardTitle>
                  <CardDescription>
                    What you've been exploring in conversations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {analytics.conversationInsights.topDiscussionTopics.slice(0, 8).map((topic, index) => (
                      <div key={index} className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium">{topic.topic}</p>
                        <p className="text-xs text-gray-500">{topic.frequency} times</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {/* Loading state for analytics */}
        {analyticsLoading && (
          <div className="text-center py-8 mb-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-500" />
            <p className="text-gray-600">Loading your career analytics...</p>
          </div>
        )}

        {/* AI-Powered Insights Panel */}
        {analytics && currentUser && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mb-8"
          >
            <ProfileInsightsPanel
              userId={currentUser.uid}
              analytics={analytics}
              userProfile={profile}
              className="w-full"
            />
          </motion.div>
        )}

        {/* AI Career Insights - Full width section when available */}
        {(migratedProfile || (combinedProfile && combinedProfile.hasCurrentData && (
          (combinedProfile.interests?.length || 0) + 
          (combinedProfile.careerGoals?.length || 0) + 
          (combinedProfile.skills?.length || 0)
        ) >= 1) || (profile && (
          (profile.interests?.length || 0) + 
          (profile.careerGoals?.length || 0) + 
          (profile.skills?.length || 0)
        ) >= 1)) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <ProfileSection
              title={migratedProfile ? "AI CAREER INSIGHTS" : "YOUR CAREER PROFILE"}
              icon={<Zap className="w-6 h-6 text-black" />}
              gradient="bg-gradient-to-br from-gray-600 to-gray-700"
            >
              <div className="grid grid-cols-1 gap-8">
                {/* Career Profile - Interests, Goals, Skills */}
                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-black mb-4">
                    {migratedProfile ? "MIGRATED CAREER PROFILE" : "FROM YOUR CONVERSATIONS"}
                  </h3>
                  
                  {migratedProfile ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div>
                        <h4 className="text-lg font-semibold text-black mb-3">INTERESTS</h4>
                        <TagDisplay
                          items={migratedProfile.interests || []}
                          color="bg-blue-100 text-blue-800"
                          icon={<Heart className="w-4 h-4" />}
                          emptyMessage="No interests discovered yet"
                        />
                      </div>
                      
                      <div>
                        <h4 className="text-lg font-semibold text-gray-600 mb-3">CAREER GOALS</h4>
                        <TagDisplay
                          items={migratedProfile.goals || []}
                          color="bg-green-100 text-green-800"
                          icon={<Target className="w-4 h-4" />}
                          emptyMessage="No career goals identified yet"
                        />
                      </div>
                      
                      <div>
                        <h4 className="text-lg font-semibold text-gray-700 mb-3">SKILLS</h4>
                        <TagDisplay
                          items={migratedProfile.skills || []}
                          color="bg-indigo-100 text-indigo-800"
                          icon={<Star className="w-4 h-4" />}
                          emptyMessage="No skills assessed yet"
                        />
                      </div>
                    </div>
                  ) : (combinedProfile || profile) ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div>
                        <h4 className="text-lg font-semibold text-black mb-3">INTERESTS</h4>
                        <TagDisplay
                          items={(combinedProfile?.interests?.length ? combinedProfile.interests : profile.interests) || []}
                          color="bg-blue-100 text-blue-800"
                          icon={<Heart className="w-4 h-4" />}
                          emptyMessage="No interests identified yet"
                        />
                      </div>
                      
                      <div>
                        <h4 className="text-lg font-semibold text-gray-600 mb-3">CAREER GOALS</h4>
                        <TagDisplay
                          items={(combinedProfile?.careerGoals?.length ? combinedProfile.careerGoals : profile.careerGoals) || []}
                          color="bg-green-100 text-green-800"
                          icon={<Target className="w-4 h-4" />}
                          emptyMessage="No career goals identified yet"
                        />
                      </div>
                      
                      <div>
                        <h4 className="text-lg font-semibold text-gray-700 mb-3">SKILLS</h4>
                        <TagDisplay
                          items={(combinedProfile?.skills?.length ? combinedProfile.skills : profile.skills) || []}
                          color="bg-indigo-100 text-indigo-800"
                          icon={<Star className="w-4 h-4" />}
                          emptyMessage="No skills identified yet"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-black/40 text-lg font-medium">
                        No career profile data available yet
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ProfileSection>
          </motion.div>
        )}

        {/* Enhanced Personal Insights - Show if available from conversation analysis */}
        {combinedProfile?.enhancedPersonalData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <ProfileSection
              title="CONVERSATION INSIGHTS"
              icon={<Lightbulb className="w-6 h-6 text-black" />}
              gradient="bg-gradient-to-br from-orange-300 to-purple-300"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Personal Traits */}
                {combinedProfile.enhancedPersonalData.personalityTraits?.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-600 mb-3">PERSONALITY TRAITS</h4>
                    <TagDisplay
                      items={combinedProfile.enhancedPersonalData.personalityTraits}
                      color="bg-amber-100 text-amber-800"
                      icon={<Smile className="w-4 h-4" />}
                      emptyMessage="No traits identified"
                    />
                  </div>
                )}

                {/* Motivations */}
                {combinedProfile.enhancedPersonalData.motivations?.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-yellow-600 mb-3">MOTIVATIONS</h4>
                    <TagDisplay
                      items={combinedProfile.enhancedPersonalData.motivations}
                      color="bg-emerald-100 text-emerald-800"
                      icon={<Zap className="w-4 h-4" />}
                      emptyMessage="No motivations identified"
                    />
                  </div>
                )}

                {/* Communication Style */}
                {combinedProfile.enhancedPersonalData.communicationStyle && (
                  <div>
                    <h4 className="text-lg font-semibold text-black mb-3">COMMUNICATION STYLE</h4>
                    <div className="bg-white/10 rounded-lg p-4">
                      <div className="text-black font-medium">
                        {combinedProfile.enhancedPersonalData.communicationStyle}
                      </div>
                    </div>
                  </div>
                )}

                {/* Preferences */}
                {combinedProfile.enhancedPersonalData.preferences?.length > 0 && (
                  <div>
                    <h4 className="text-lg font-black text-gray-700 mb-3">PREFERENCES</h4>
                    <TagDisplay
                      items={combinedProfile.enhancedPersonalData.preferences}
                      color="bg-purple-100 text-purple-800"
                      icon={<Heart className="w-4 h-4" />}
                      emptyMessage="No preferences identified"
                    />
                  </div>
                )}
              </div>
            </ProfileSection>
          </motion.div>
        )}

        {/* Report Generation Section */}
        {analytics && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-8"
          >
            <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Career Development Reports
                </CardTitle>
                <CardDescription>
                  Generate detailed PDF reports to share with parents, teachers, or career counselors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    className="flex items-center gap-2"
                    onClick={() => window.location.href = '/reports'}
                  >
                    <Download className="h-4 w-4" />
                    Parent Report
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() => window.location.href = '/reports'}
                  >
                    <Download className="h-4 w-4" />
                    Progress Summary
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() => window.location.href = '/reports'}
                  >
                    <Download className="h-4 w-4" />
                    Skills Portfolio
                  </Button>
                </div>
                <p className="text-sm text-gray-600 mt-4">
                  Reports include your engagement metrics, skills development, career exploration, and personalized recommendations.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Basic Profile Information */}
          <ProfileSection
            title="BASIC INFO"
            icon={<User className="w-6 h-6 text-black" />}
            gradient="bg-gradient-to-br from-yellow-400 to-green-500"
          >
            {!isEditingProfile ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-black">PROFILE DETAILS</h3>
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-pink-500 rounded-lg text-white font-bold hover:scale-105 transition-transform duration-200"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>EDIT</span>
                  </button>
                </div>
                
                {profile.displayName && (
                  <div className="bg-white/10 rounded-lg p-4">
                    <div className="text-black font-bold mb-2">DISPLAY NAME</div>
                    <div className="text-black">{profile.displayName}</div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/10 rounded-lg p-4">
                    <div className="text-black font-bold mb-1">SCHOOL</div>
                    <div className="text-black">{profile.school || 'Not specified'}</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4">
                    <div className="text-black font-bold mb-1">GRADE</div>
                    <div className="text-black">{profile.grade || 'Not specified'}</div>
                  </div>
                </div>
                
                {profile.bio && (
                  <div className="bg-white/10 rounded-lg p-4">
                    <div className="text-black font-bold mb-2">BIO</div>
                    <div className="text-black">{profile.bio}</div>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div>
                  <label className="block text-black font-bold mb-2">DISPLAY NAME</label>
                  <input
                    type="text"
                    value={profile.displayName || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, displayName: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/10 border border-blue-500/30 rounded-lg text-black placeholder-white/50 focus:border-blue-500 focus:outline-none"
                    placeholder="How should we address you?"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-black font-bold mb-2">SCHOOL</label>
                    <input
                      type="text"
                      value={profile.school || ''}
                      onChange={(e) => setProfile(prev => ({ ...prev, school: e.target.value }))}
                      className="w-full px-4 py-3 bg-white/10 border border-blue-500/30 rounded-lg text-black placeholder-white/50 focus:border-blue-500 focus:outline-none"
                      placeholder="Your school..."
                    />
                  </div>
                  <div>
                    <label className="block text-black font-bold mb-2">GRADE</label>
                    <input
                      type="text"
                      value={profile.grade || ''}
                      onChange={(e) => setProfile(prev => ({ ...prev, grade: e.target.value }))}
                      className="w-full px-4 py-3 bg-white/10 border border-blue-500/30 rounded-lg text-black placeholder-white/50 focus:border-blue-500 focus:outline-none"
                      placeholder="Your grade..."
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-black font-bold mb-2">BIO</label>
                  <textarea
                    value={profile.bio || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                    rows={4}
                    className="w-full px-4 py-3 bg-primary-white/10 border border-electric-blue/30 rounded-lg text-black placeholder-primary-white/50 focus:border-electric-blue focus:outline-none resize-none"
                    placeholder="Tell us about yourself..."
                  />
                </div>
                
                <div className="flex space-x-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-pink-500 rounded-lg text-white font-bold hover:scale-105 transition-transform duration-200 disabled:opacity-50"
                  >
                    <span>{loading ? 'SAVING...' : 'SAVE CHANGES'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="px-6 py-3 bg-green-500/10 border border-green-500/30 rounded-lg text-black font-bold hover:bg-green-500/20 transition-colors duration-200"
                  >
                    CANCEL
                  </button>
                </div>
              </form>
            )}
          </ProfileSection>

          {/* Preferences */}
          <ProfileSection
            title="PREFERENCES"
            icon={<BookOpen className="w-6 h-6 text-black" />}
            gradient="bg-gradient-to-br from-purple-300 to-teal-300"
          >
            {!isEditingPreferences ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-black text-black">SETTINGS</h3>
                  <button
                    onClick={() => setIsEditingPreferences(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-pink-500 rounded-lg text-white font-bold hover:scale-105 transition-transform duration-200"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>EDIT</span>
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-white/10 rounded-lg p-4 flex justify-between items-center">
                    <span className="text-black font-bold">THEME</span>
                    <span className="text-black font-bold uppercase">{preferences.theme}</span>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4 flex justify-between items-center">
                    <span className="text-black font-bold">NOTIFICATIONS</span>
                    <span className={`font-bold uppercase ${preferences.notifications ? 'text-gray-700' : 'text-gray-600'}`}>
                      {preferences.notifications ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4 flex justify-between items-center">
                    <span className="text-black font-bold">EMAIL UPDATES</span>
                    <span className={`font-bold uppercase ${preferences.emailUpdates ? 'text-gray-700' : 'text-gray-600'}`}>
                      {preferences.emailUpdates ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePreferencesSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-black font-bold mb-2">THEME</label>
                    <select
                      value={preferences.theme}
                      onChange={(e) => setPreferences(prev => ({ ...prev, theme: e.target.value as 'light' | 'dark' | 'system' }))}
                      className="w-full px-4 py-3 bg-white/10 border border-blue-500/30 rounded-lg text-black focus:border-blue-500 focus:outline-none"
                    >
                      <option value="system">SYSTEM</option>
                      <option value="light">LIGHT</option>
                      <option value="dark">DARK</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <input
                      type="checkbox"
                      id="notifications"
                      checked={preferences.notifications}
                      onChange={(e) => setPreferences(prev => ({ ...prev, notifications: e.target.checked }))}
                      className="w-5 h-5 text-black bg-white/10 border-blue-500/30 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="notifications" className="text-black font-bold">
                      ENABLE NOTIFICATIONS
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <input
                      type="checkbox"
                      id="emailUpdates"
                      checked={preferences.emailUpdates}
                      onChange={(e) => setPreferences(prev => ({ ...prev, emailUpdates: e.target.checked }))}
                      className="w-5 h-5 text-black bg-white/10 border-blue-500/30 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="emailUpdates" className="text-black font-bold">
                      ENABLE EMAIL UPDATES
                    </label>
                  </div>
                </div>
                
                <div className="flex space-x-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-pink-500 rounded-lg text-white font-bold hover:scale-105 transition-transform duration-200 disabled:opacity-50"
                  >
                    <span>{loading ? 'SAVING...' : 'SAVE CHANGES'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingPreferences(false)}
                    className="px-6 py-3 bg-green-500/10 border border-green-500/30 rounded-lg text-black font-bold hover:bg-green-500/20 transition-colors duration-200"
                  >
                    CANCEL
                  </button>
                </div>
              </form>
            )}
          </ProfileSection>
        </div>

        {/* Empty State for New Users */}
        {!migratedProfile && !combinedProfile && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-center py-16"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-gray-600 to-gray-700 rounded-full flex items-center justify-center mx-auto mb-6 shadow-glow-blue">
              <Rocket className="w-12 h-12 text-black" />
            </div>
            <h3 className="text-3xl font-street font-black text-black mb-4">
              START YOUR CAREER JOURNEY
            </h3>
            <p className="text-xl text-black/70 mb-8 max-w-2xl mx-auto">
              Begin a conversation with our AI to unlock personalized career insights and build your profile
            </p>
            <button
              onClick={() => window.location.href = '/chat'}
              className="inline-flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-green-500 via-orange-400 to-yellow-500 rounded-xl text-black font-bold text-lg hover:scale-105 transition-transform duration-200 shadow-glow-blue"
            >
              <Zap className="w-6 h-6" />
              <span>START CONVERSATION</span>
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Profile;
