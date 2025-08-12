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
  Smile
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import careerPathwayService from '../services/careerPathwayService';

const Profile: React.FC = () => {
  const { currentUser, userData, refreshUserData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPreferences, setIsEditingPreferences] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  // Migrated career insights state
  const [migratedProfile, setMigratedProfile] = useState<any | null>(null);
  const [combinedProfile, setCombinedProfile] = useState<any | null>(null);
  
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
      className={`relative overflow-hidden rounded-2xl p-8 shadow-2xl border border-primary-green/20 ${gradient}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary-white/60 to-primary-white/50 backdrop-blur-sm" />
      <div className="relative">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-green to-primary-peach rounded-xl flex items-center justify-center shadow-lg">
            {icon}
          </div>
          <h2 className="text-2xl font-street font-black text-primary-black">
            {title}
          </h2>
        </div>
        <div className="text-primary-black">
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
          <div className="text-primary-black/40 text-lg font-medium">
            {emptyMessage}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-white via-primary-mint/5 to-primary-lavender/10 pt-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-6xl font-street font-black text-transparent bg-clip-text bg-gradient-to-r from-primary-green via-primary-peach to-primary-yellow mb-4 animate-glow-pulse">
            YOUR PROFILE
          </h1>
          <p className="text-xl text-primary-black/80 font-medium">
            Your career journey insights and preferences
          </p>
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
                  ? 'bg-gradient-to-r from-acid-green/20 to-cyber-yellow/20 text-acid-green border border-acid-green/30' 
                  : 'bg-gradient-to-r from-primary-peach/20 to-primary-lavender/20 text-primary-peach border border-primary-peach/30'
              }`}
            >
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

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
              icon={<Zap className="w-6 h-6 text-primary-black" />}
              gradient="bg-gradient-to-br from-primary-green to-primary-peach"
            >
              <div className="grid grid-cols-1 gap-8">
                {/* Career Profile - Interests, Goals, Skills */}
                <div className="space-y-6">
                  <h3 className="text-xl font-black text-primary-black mb-4">
                    {migratedProfile ? "MIGRATED CAREER PROFILE" : "FROM YOUR CONVERSATIONS"}
                  </h3>
                  
                  {migratedProfile ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div>
                        <h4 className="text-lg font-black text-primary-black mb-3">INTERESTS</h4>
                        <TagDisplay
                          items={migratedProfile.interests || []}
                          color="bg-gradient-to-r from-primary-peach to-primary-yellow text-primary-black"
                          icon={<Heart className="w-4 h-4" />}
                          emptyMessage="No interests discovered yet"
                        />
                      </div>
                      
                      <div>
                        <h4 className="text-lg font-black text-neon-pink mb-3">CAREER GOALS</h4>
                        <TagDisplay
                          items={migratedProfile.goals || []}
                          color="bg-gradient-to-r from-primary-green to-primary-peach text-primary-black"
                          icon={<Target className="w-4 h-4" />}
                          emptyMessage="No career goals identified yet"
                        />
                      </div>
                      
                      <div>
                        <h4 className="text-lg font-black text-acid-green mb-3">SKILLS</h4>
                        <TagDisplay
                          items={migratedProfile.skills || []}
                          color="bg-gradient-to-r from-primary-green to-primary-lavender text-primary-black"
                          icon={<Star className="w-4 h-4" />}
                          emptyMessage="No skills assessed yet"
                        />
                      </div>
                    </div>
                  ) : (combinedProfile || profile) ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div>
                        <h4 className="text-lg font-black text-primary-black mb-3">INTERESTS</h4>
                        <TagDisplay
                          items={(combinedProfile?.interests?.length ? combinedProfile.interests : profile.interests) || []}
                          color="bg-gradient-to-r from-primary-peach to-primary-yellow text-primary-black"
                          icon={<Heart className="w-4 h-4" />}
                          emptyMessage="No interests identified yet"
                        />
                      </div>
                      
                      <div>
                        <h4 className="text-lg font-black text-neon-pink mb-3">CAREER GOALS</h4>
                        <TagDisplay
                          items={(combinedProfile?.careerGoals?.length ? combinedProfile.careerGoals : profile.careerGoals) || []}
                          color="bg-gradient-to-r from-primary-green to-primary-peach text-primary-black"
                          icon={<Target className="w-4 h-4" />}
                          emptyMessage="No career goals identified yet"
                        />
                      </div>
                      
                      <div>
                        <h4 className="text-lg font-black text-acid-green mb-3">SKILLS</h4>
                        <TagDisplay
                          items={(combinedProfile?.skills?.length ? combinedProfile.skills : profile.skills) || []}
                          color="bg-gradient-to-r from-primary-green to-primary-lavender text-primary-black"
                          icon={<Star className="w-4 h-4" />}
                          emptyMessage="No skills identified yet"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-primary-black/40 text-lg font-medium">
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
              icon={<Lightbulb className="w-6 h-6 text-primary-black" />}
              gradient="bg-gradient-to-br from-primary-peach to-primary-lavender"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Personal Traits */}
                {combinedProfile.enhancedPersonalData.personalityTraits?.length > 0 && (
                  <div>
                    <h4 className="text-lg font-black text-neon-pink mb-3">PERSONALITY TRAITS</h4>
                    <TagDisplay
                      items={combinedProfile.enhancedPersonalData.personalityTraits}
                      color="bg-gradient-to-r from-primary-peach to-primary-lavender text-primary-black"
                      icon={<Smile className="w-4 h-4" />}
                      emptyMessage="No traits identified"
                    />
                  </div>
                )}

                {/* Motivations */}
                {combinedProfile.enhancedPersonalData.motivations?.length > 0 && (
                  <div>
                    <h4 className="text-lg font-black text-cyber-yellow mb-3">MOTIVATIONS</h4>
                    <TagDisplay
                      items={combinedProfile.enhancedPersonalData.motivations}
                      color="bg-gradient-to-r from-cyber-yellow to-acid-green text-primary-black"
                      icon={<Zap className="w-4 h-4" />}
                      emptyMessage="No motivations identified"
                    />
                  </div>
                )}

                {/* Communication Style */}
                {combinedProfile.enhancedPersonalData.communicationStyle && (
                  <div>
                    <h4 className="text-lg font-black text-primary-black mb-3">COMMUNICATION STYLE</h4>
                    <div className="bg-primary-white/10 rounded-lg p-4">
                      <div className="text-primary-black font-medium">
                        {combinedProfile.enhancedPersonalData.communicationStyle}
                      </div>
                    </div>
                  </div>
                )}

                {/* Preferences */}
                {combinedProfile.enhancedPersonalData.preferences?.length > 0 && (
                  <div>
                    <h4 className="text-lg font-black text-acid-green mb-3">PREFERENCES</h4>
                    <TagDisplay
                      items={combinedProfile.enhancedPersonalData.preferences}
                      color="bg-gradient-to-r from-acid-green to-cyber-yellow text-primary-black"
                      icon={<Heart className="w-4 h-4" />}
                      emptyMessage="No preferences identified"
                    />
                  </div>
                )}
              </div>
            </ProfileSection>
          </motion.div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Basic Profile Information */}
          <ProfileSection
            title="BASIC INFO"
            icon={<User className="w-6 h-6 text-primary-black" />}
            gradient="bg-gradient-to-br from-primary-yellow to-primary-green"
          >
            {!isEditingProfile ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-black text-primary-black">PROFILE DETAILS</h3>
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-electric-blue to-neon-pink rounded-lg text-primary-black font-bold hover:scale-105 transition-transform duration-200"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>EDIT</span>
                  </button>
                </div>
                
                {profile.displayName && (
                  <div className="bg-primary-white/10 rounded-lg p-4">
                    <div className="text-primary-black font-bold mb-2">DISPLAY NAME</div>
                    <div className="text-primary-black">{profile.displayName}</div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-primary-white/10 rounded-lg p-4">
                    <div className="text-primary-black font-bold mb-1">SCHOOL</div>
                    <div className="text-primary-black">{profile.school || 'Not specified'}</div>
                  </div>
                  <div className="bg-primary-white/10 rounded-lg p-4">
                    <div className="text-primary-black font-bold mb-1">GRADE</div>
                    <div className="text-primary-black">{profile.grade || 'Not specified'}</div>
                  </div>
                </div>
                
                {profile.bio && (
                  <div className="bg-primary-white/10 rounded-lg p-4">
                    <div className="text-primary-black font-bold mb-2">BIO</div>
                    <div className="text-primary-black">{profile.bio}</div>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div>
                  <label className="block text-primary-black font-bold mb-2">DISPLAY NAME</label>
                  <input
                    type="text"
                    value={profile.displayName || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, displayName: e.target.value }))}
                    className="w-full px-4 py-3 bg-primary-white/10 border border-electric-blue/30 rounded-lg text-primary-black placeholder-primary-white/50 focus:border-electric-blue focus:outline-none"
                    placeholder="How should we address you?"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-primary-black font-bold mb-2">SCHOOL</label>
                    <input
                      type="text"
                      value={profile.school || ''}
                      onChange={(e) => setProfile(prev => ({ ...prev, school: e.target.value }))}
                      className="w-full px-4 py-3 bg-primary-white/10 border border-electric-blue/30 rounded-lg text-primary-black placeholder-primary-white/50 focus:border-electric-blue focus:outline-none"
                      placeholder="Your school..."
                    />
                  </div>
                  <div>
                    <label className="block text-primary-black font-bold mb-2">GRADE</label>
                    <input
                      type="text"
                      value={profile.grade || ''}
                      onChange={(e) => setProfile(prev => ({ ...prev, grade: e.target.value }))}
                      className="w-full px-4 py-3 bg-primary-white/10 border border-electric-blue/30 rounded-lg text-primary-black placeholder-primary-white/50 focus:border-electric-blue focus:outline-none"
                      placeholder="Your grade..."
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-primary-black font-bold mb-2">BIO</label>
                  <textarea
                    value={profile.bio || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                    rows={4}
                    className="w-full px-4 py-3 bg-primary-white/10 border border-electric-blue/30 rounded-lg text-primary-black placeholder-primary-white/50 focus:border-electric-blue focus:outline-none resize-none"
                    placeholder="Tell us about yourself..."
                  />
                </div>
                
                <div className="flex space-x-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-electric-blue to-neon-pink rounded-lg text-primary-black font-bold hover:scale-105 transition-transform duration-200 disabled:opacity-50"
                  >
                    <span>{loading ? 'SAVING...' : 'SAVE CHANGES'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="px-6 py-3 bg-primary-green/10 border border-primary-green/30 rounded-lg text-primary-black font-bold hover:bg-primary-green/20 transition-colors duration-200"
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
            icon={<BookOpen className="w-6 h-6 text-primary-black" />}
            gradient="bg-gradient-to-br from-primary-lavender to-primary-mint"
          >
            {!isEditingPreferences ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-black text-primary-black">SETTINGS</h3>
                  <button
                    onClick={() => setIsEditingPreferences(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-electric-blue to-neon-pink rounded-lg text-primary-black font-bold hover:scale-105 transition-transform duration-200"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>EDIT</span>
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-primary-white/10 rounded-lg p-4 flex justify-between items-center">
                    <span className="text-primary-black font-bold">THEME</span>
                    <span className="text-primary-black font-bold uppercase">{preferences.theme}</span>
                  </div>
                  <div className="bg-primary-white/10 rounded-lg p-4 flex justify-between items-center">
                    <span className="text-primary-black font-bold">NOTIFICATIONS</span>
                    <span className={`font-bold uppercase ${preferences.notifications ? 'text-acid-green' : 'text-neon-pink'}`}>
                      {preferences.notifications ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                  <div className="bg-primary-white/10 rounded-lg p-4 flex justify-between items-center">
                    <span className="text-primary-black font-bold">EMAIL UPDATES</span>
                    <span className={`font-bold uppercase ${preferences.emailUpdates ? 'text-acid-green' : 'text-neon-pink'}`}>
                      {preferences.emailUpdates ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePreferencesSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-primary-black font-bold mb-2">THEME</label>
                    <select
                      value={preferences.theme}
                      onChange={(e) => setPreferences(prev => ({ ...prev, theme: e.target.value as 'light' | 'dark' | 'system' }))}
                      className="w-full px-4 py-3 bg-primary-white/10 border border-electric-blue/30 rounded-lg text-primary-black focus:border-electric-blue focus:outline-none"
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
                      className="w-5 h-5 text-primary-black bg-primary-white/10 border-electric-blue/30 rounded focus:ring-electric-blue"
                    />
                    <label htmlFor="notifications" className="text-primary-black font-bold">
                      ENABLE NOTIFICATIONS
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <input
                      type="checkbox"
                      id="emailUpdates"
                      checked={preferences.emailUpdates}
                      onChange={(e) => setPreferences(prev => ({ ...prev, emailUpdates: e.target.checked }))}
                      className="w-5 h-5 text-primary-black bg-primary-white/10 border-electric-blue/30 rounded focus:ring-electric-blue"
                    />
                    <label htmlFor="emailUpdates" className="text-primary-black font-bold">
                      ENABLE EMAIL UPDATES
                    </label>
                  </div>
                </div>
                
                <div className="flex space-x-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-electric-blue to-neon-pink rounded-lg text-primary-black font-bold hover:scale-105 transition-transform duration-200 disabled:opacity-50"
                  >
                    <span>{loading ? 'SAVING...' : 'SAVE CHANGES'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingPreferences(false)}
                    className="px-6 py-3 bg-primary-green/10 border border-primary-green/30 rounded-lg text-primary-black font-bold hover:bg-primary-green/20 transition-colors duration-200"
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
            <div className="w-24 h-24 bg-gradient-to-br from-primary-green to-primary-peach rounded-full flex items-center justify-center mx-auto mb-6 shadow-glow-blue">
              <Rocket className="w-12 h-12 text-primary-black" />
            </div>
            <h3 className="text-3xl font-street font-black text-primary-black mb-4">
              START YOUR CAREER JOURNEY
            </h3>
            <p className="text-xl text-primary-black/70 mb-8 max-w-2xl mx-auto">
              Begin a conversation with our AI to unlock personalized career insights and build your profile
            </p>
            <button
              onClick={() => window.location.href = '/chat'}
              className="inline-flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-primary-green via-primary-peach to-primary-yellow rounded-xl text-primary-black font-black text-lg hover:scale-105 transition-transform duration-200 shadow-glow-blue"
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
