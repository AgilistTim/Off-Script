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
  PoundSterling
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
    if (userData) {
      console.log("Loading user data:", userData);
      // Load profile data
      if (userData.profile) {
        console.log("Profile data:", userData.profile);
        
        // Convert object-like arrays to real arrays
        const interests = objectToArray(userData.profile.interests);
        const careerGoals = objectToArray(userData.profile.careerGoals);
        const skills = objectToArray(userData.profile.skills);
        
        console.log("Converted arrays:", { interests, careerGoals, skills });
        
        setProfile({
          bio: userData.profile.bio || '',
          school: userData.profile.school || '',
          grade: userData.profile.grade || '',
          interests,
          careerGoals,
          skills
        });
        
        console.log("Profile state after setting:", {
          bio: userData.profile.bio || '',
          school: userData.profile.school || '',
          grade: userData.profile.grade || '',
          interests,
          careerGoals,
          skills
        });
      }
      
      // Load preferences data
      if (userData.preferences) {
        setPreferences({
          theme: userData.preferences.theme || 'system',
          notifications: userData.preferences.notifications !== undefined ? userData.preferences.notifications : true,
          emailUpdates: userData.preferences.emailUpdates !== undefined ? userData.preferences.emailUpdates : true
        });
      }
    }
  }, [userData]);

  // Fetch migrated career insights
  useEffect(() => {
    const fetchCareerInsights = async () => {
      if (!currentUser) return;
      
      try {
        // Get migrated profile from career pathway service
        const migratedData = await careerPathwayService.getMigratedPersonProfile(currentUser.uid);
        if (migratedData) {
          setMigratedProfile(migratedData);
        }
        
        // Get combined profile 
        const combinedData = await careerPathwayService.getCombinedUserProfile(currentUser.uid);
        if (combinedData) {
          setCombinedProfile(combinedData);
        }
      } catch (error) {
        console.error('Error fetching career insights:', error);
      }
    };
    
    fetchCareerInsights();
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
      className={`relative overflow-hidden rounded-2xl p-8 shadow-2xl border border-electric-blue/20 ${gradient}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary-black/90 to-primary-black/70 backdrop-blur-sm" />
      <div className="relative">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-electric-blue to-neon-pink rounded-xl flex items-center justify-center shadow-lg">
            {icon}
          </div>
          <h2 className="text-2xl font-street font-black text-primary-white">
            {title}
          </h2>
        </div>
        {children}
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
          <div className="text-primary-white/40 text-lg font-medium">
            {emptyMessage}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-black via-primary-black to-electric-blue/10 pt-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-6xl font-street font-black text-transparent bg-clip-text bg-gradient-to-r from-electric-blue via-neon-pink to-cyber-yellow mb-4 animate-glow-pulse">
            YOUR PROFILE
          </h1>
          <p className="text-xl text-primary-white/80 font-medium">
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
                  : 'bg-gradient-to-r from-neon-pink/20 to-electric-blue/20 text-neon-pink border border-neon-pink/30'
              }`}
            >
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Generated Career Insights - Primary Display */}
          {(migratedProfile || combinedProfile) && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="xl:col-span-2"
            >
              <ProfileSection
                title="AI CAREER INSIGHTS"
                icon={<Zap className="w-6 h-6 text-primary-white" />}
                gradient="bg-gradient-to-br from-electric-blue/20 to-neon-pink/20"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Career Profile */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-black text-electric-blue mb-4">
                      CAREER PROFILE
                    </h3>
                    
                    {migratedProfile && (
                      <div className="space-y-4">
                        <TagDisplay
                          items={migratedProfile.interests || []}
                          color="bg-gradient-to-r from-neon-pink to-cyber-yellow text-primary-black"
                          icon={<Heart className="w-4 h-4" />}
                          emptyMessage="No interests discovered yet"
                        />
                        
                        <TagDisplay
                          items={migratedProfile.goals || []}
                          color="bg-gradient-to-r from-electric-blue to-neon-pink text-primary-white"
                          icon={<Target className="w-4 h-4" />}
                          emptyMessage="No career goals identified yet"
                        />
                        
                        <TagDisplay
                          items={migratedProfile.skills || []}
                          color="bg-gradient-to-r from-acid-green to-electric-blue text-primary-black"
                          icon={<Star className="w-4 h-4" />}
                          emptyMessage="No skills assessed yet"
                        />
                      </div>
                    )}
                  </div>

                  {/* Combined Profile */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-black text-neon-pink mb-4">
                      ENHANCED PROFILE
                    </h3>
                    
                    {combinedProfile && (
                      <div className="space-y-4">
                        <TagDisplay
                          items={combinedProfile.values || []}
                          color="bg-gradient-to-r from-cyber-yellow to-acid-green text-primary-black"
                          icon={<Crown className="w-4 h-4" />}
                          emptyMessage="No values identified yet"
                        />
                        
                        {combinedProfile.careerStage && (
                          <div className="bg-gradient-to-r from-electric-blue/20 to-neon-pink/20 rounded-xl p-4 border border-electric-blue/30">
                            <div className="flex items-center space-x-2 mb-2">
                              <Rocket className="w-5 h-5 text-electric-blue" />
                              <span className="font-black text-primary-white">CAREER STAGE</span>
                            </div>
                            <span className="text-lg font-bold text-cyber-yellow">
                              {combinedProfile.careerStage}
                            </span>
                          </div>
                        )}
                        
                        <TagDisplay
                          items={combinedProfile.workStyle || []}
                          color="bg-gradient-to-r from-neon-pink to-electric-blue text-primary-white"
                          icon={<Briefcase className="w-4 h-4" />}
                          emptyMessage="No work style preferences yet"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </ProfileSection>
            </motion.div>
          )}

          {/* Basic Profile Information - Only show if no AI insights available */}
          {!(migratedProfile || combinedProfile) && (
            <ProfileSection
              title="BASIC INFO"
              icon={<User className="w-6 h-6 text-primary-white" />}
              gradient="bg-gradient-to-br from-cyber-yellow/20 to-acid-green/20"
            >
            {!isEditingProfile ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-black text-primary-white">PROFILE DETAILS</h3>
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-electric-blue to-neon-pink rounded-lg text-primary-white font-bold hover:scale-105 transition-transform duration-200"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>EDIT</span>
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-primary-white/10 rounded-lg p-4">
                    <div className="text-electric-blue font-bold mb-1">SCHOOL</div>
                    <div className="text-primary-white">{profile.school || 'Not specified'}</div>
                  </div>
                  <div className="bg-primary-white/10 rounded-lg p-4">
                    <div className="text-electric-blue font-bold mb-1">GRADE</div>
                    <div className="text-primary-white">{profile.grade || 'Not specified'}</div>
                  </div>
                </div>
                
                {profile.bio && (
                  <div className="bg-primary-white/10 rounded-lg p-4">
                    <div className="text-electric-blue font-bold mb-2">BIO</div>
                    <div className="text-primary-white">{profile.bio}</div>
                  </div>
                )}
                
                <div className="space-y-4">
                  <TagDisplay
                    items={profile.interests || []}
                    color="bg-gradient-to-r from-neon-pink to-cyber-yellow text-primary-black"
                    icon={<Heart className="w-4 h-4" />}
                    emptyMessage="No interests added yet"
                  />
                  
                  <TagDisplay
                    items={profile.careerGoals || []}
                    color="bg-gradient-to-r from-electric-blue to-neon-pink text-primary-white"
                    icon={<Target className="w-4 h-4" />}
                    emptyMessage="No career goals added yet"
                  />
                  
                  <TagDisplay
                    items={profile.skills || []}
                    color="bg-gradient-to-r from-acid-green to-electric-blue text-primary-black"
                    icon={<Star className="w-4 h-4" />}
                    emptyMessage="No skills added yet"
                  />
                </div>
              </div>
            ) : (
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-electric-blue font-bold mb-2">SCHOOL</label>
                    <input
                      type="text"
                      value={profile.school || ''}
                      onChange={(e) => setProfile(prev => ({ ...prev, school: e.target.value }))}
                      className="w-full px-4 py-3 bg-primary-white/10 border border-electric-blue/30 rounded-lg text-primary-white placeholder-primary-white/50 focus:border-electric-blue focus:outline-none"
                      placeholder="Your school..."
                    />
                  </div>
                  <div>
                    <label className="block text-electric-blue font-bold mb-2">GRADE</label>
                    <input
                      type="text"
                      value={profile.grade || ''}
                      onChange={(e) => setProfile(prev => ({ ...prev, grade: e.target.value }))}
                      className="w-full px-4 py-3 bg-primary-white/10 border border-electric-blue/30 rounded-lg text-primary-white placeholder-primary-white/50 focus:border-electric-blue focus:outline-none"
                      placeholder="Your grade..."
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-electric-blue font-bold mb-2">BIO</label>
                  <textarea
                    value={profile.bio || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                    rows={4}
                    className="w-full px-4 py-3 bg-primary-white/10 border border-electric-blue/30 rounded-lg text-primary-white placeholder-primary-white/50 focus:border-electric-blue focus:outline-none resize-none"
                    placeholder="Tell us about yourself..."
                  />
                </div>
                
                <div className="flex space-x-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-electric-blue to-neon-pink rounded-lg text-primary-white font-bold hover:scale-105 transition-transform duration-200 disabled:opacity-50"
                  >
                    <span>{loading ? 'SAVING...' : 'SAVE CHANGES'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="px-6 py-3 bg-primary-white/10 border border-primary-white/30 rounded-lg text-primary-white font-bold hover:bg-primary-white/20 transition-colors duration-200"
                  >
                    CANCEL
                  </button>
                </div>
              </form>
            )}
          </ProfileSection>
          )}

          {/* Preferences */}
          <ProfileSection
            title="PREFERENCES"
            icon={<BookOpen className="w-6 h-6 text-primary-white" />}
            gradient="bg-gradient-to-br from-neon-pink/20 to-electric-blue/20"
          >
            {!isEditingPreferences ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-black text-primary-white">SETTINGS</h3>
                  <button
                    onClick={() => setIsEditingPreferences(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-electric-blue to-neon-pink rounded-lg text-primary-white font-bold hover:scale-105 transition-transform duration-200"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>EDIT</span>
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-primary-white/10 rounded-lg p-4 flex justify-between items-center">
                    <span className="text-primary-white font-bold">THEME</span>
                    <span className="text-electric-blue font-bold uppercase">{preferences.theme}</span>
                  </div>
                  <div className="bg-primary-white/10 rounded-lg p-4 flex justify-between items-center">
                    <span className="text-primary-white font-bold">NOTIFICATIONS</span>
                    <span className={`font-bold uppercase ${preferences.notifications ? 'text-acid-green' : 'text-neon-pink'}`}>
                      {preferences.notifications ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                  <div className="bg-primary-white/10 rounded-lg p-4 flex justify-between items-center">
                    <span className="text-primary-white font-bold">EMAIL UPDATES</span>
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
                    <label className="block text-electric-blue font-bold mb-2">THEME</label>
                    <select
                      value={preferences.theme}
                      onChange={(e) => setPreferences(prev => ({ ...prev, theme: e.target.value as 'light' | 'dark' | 'system' }))}
                      className="w-full px-4 py-3 bg-primary-white/10 border border-electric-blue/30 rounded-lg text-primary-white focus:border-electric-blue focus:outline-none"
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
                      className="w-5 h-5 text-electric-blue bg-primary-white/10 border-electric-blue/30 rounded focus:ring-electric-blue"
                    />
                    <label htmlFor="notifications" className="text-primary-white font-bold">
                      ENABLE NOTIFICATIONS
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <input
                      type="checkbox"
                      id="emailUpdates"
                      checked={preferences.emailUpdates}
                      onChange={(e) => setPreferences(prev => ({ ...prev, emailUpdates: e.target.checked }))}
                      className="w-5 h-5 text-electric-blue bg-primary-white/10 border-electric-blue/30 rounded focus:ring-electric-blue"
                    />
                    <label htmlFor="emailUpdates" className="text-primary-white font-bold">
                      ENABLE EMAIL UPDATES
                    </label>
                  </div>
                </div>
                
                <div className="flex space-x-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-electric-blue to-neon-pink rounded-lg text-primary-white font-bold hover:scale-105 transition-transform duration-200 disabled:opacity-50"
                  >
                    <span>{loading ? 'SAVING...' : 'SAVE CHANGES'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingPreferences(false)}
                    className="px-6 py-3 bg-primary-white/10 border border-primary-white/30 rounded-lg text-primary-white font-bold hover:bg-primary-white/20 transition-colors duration-200"
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
            <div className="w-24 h-24 bg-gradient-to-br from-electric-blue to-neon-pink rounded-full flex items-center justify-center mx-auto mb-6 shadow-glow-blue">
              <Rocket className="w-12 h-12 text-primary-white" />
            </div>
            <h3 className="text-3xl font-street font-black text-primary-white mb-4">
              START YOUR CAREER JOURNEY
            </h3>
            <p className="text-xl text-primary-white/70 mb-8 max-w-2xl mx-auto">
              Begin a conversation with our AI to unlock personalized career insights and build your profile
            </p>
            <button
              onClick={() => window.location.href = '/chat'}
              className="inline-flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-electric-blue via-neon-pink to-cyber-yellow rounded-xl text-primary-black font-black text-lg hover:scale-105 transition-transform duration-200 shadow-glow-blue"
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
