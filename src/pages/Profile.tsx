import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { updateUserProfile, updateUserPreferences } from '../services/userService';
import { UserProfile, UserPreferences } from '../models/User';
import { motion } from 'framer-motion';
import { User, Briefcase, Target, TrendingUp, Heart } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import careerPathwayService from '../services/careerPathwayService';

const Profile: React.FC = () => {
  const { currentUser, userData, refreshUserData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isAddingInterest, setIsAddingInterest] = useState(false);
  const [isAddingCareerGoal, setIsAddingCareerGoal] = useState(false);
  const [isAddingSkill, setIsAddingSkill] = useState(false);
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
  
  // New interest, career goal, or skill input
  const [newInterest, setNewInterest] = useState('');
  const [newCareerGoal, setNewCareerGoal] = useState('');
  const [newSkill, setNewSkill] = useState('');
  
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
    
    try {
      setLoading(true);
      await updateUserProfile(currentUser.uid, profile);
      const refreshedData = await refreshUserData();
      
      if (refreshedData && refreshedData.profile) {
        // Update local state with the refreshed data
        setProfile({
          bio: refreshedData.profile.bio || '',
          school: refreshedData.profile.school || '',
          grade: refreshedData.profile.grade || '',
          interests: Array.isArray(refreshedData.profile.interests) ? refreshedData.profile.interests : [],
          careerGoals: Array.isArray(refreshedData.profile.careerGoals) ? refreshedData.profile.careerGoals : [],
          skills: Array.isArray(refreshedData.profile.skills) ? refreshedData.profile.skills : []
        });
      }
      
      setMessage({ text: 'Profile updated successfully!', type: 'success' });
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ text: 'Failed to update profile. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setMessage(null);
      }, 3000);
    }
  };
  
  // Handle preferences form submission
  const handlePreferencesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) return;
    
    try {
      setLoading(true);
      await updateUserPreferences(currentUser.uid, preferences);
      const refreshedData = await refreshUserData();
      
      if (refreshedData && refreshedData.preferences) {
        // Update local state with the refreshed data
        setPreferences({
          theme: refreshedData.preferences.theme || 'system',
          notifications: refreshedData.preferences.notifications !== undefined ? refreshedData.preferences.notifications : true,
          emailUpdates: refreshedData.preferences.emailUpdates !== undefined ? refreshedData.preferences.emailUpdates : true
        });
      }
      
      setMessage({ text: 'Preferences updated successfully!', type: 'success' });
    } catch (error) {
      console.error('Error updating preferences:', error);
      setMessage({ text: 'Failed to update preferences. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setMessage(null);
      }, 3000);
    }
  };
  
  // Add a new interest
  const addInterest = async () => {
    if (newInterest.trim()) {
      const currentInterests = objectToArray(profile.interests);
      
      // Check if interest already exists
      if (currentInterests.includes(newInterest.trim())) {
        return;
      }
      
      const updatedInterests = [...currentInterests, newInterest.trim()];
      
      // Update local state
      setProfile({
        ...profile,
        interests: updatedInterests
      });
      
      // Save to Firebase
      if (currentUser) {
        try {
          setIsAddingInterest(true);
          const userDocRef = doc(db, 'users', currentUser.uid);
          await updateDoc(userDocRef, {
            'profile.interests': updatedInterests
          });
          await refreshUserData();
          console.log("Added interest and saved to Firebase:", newInterest.trim());
        } catch (error) {
          console.error("Error saving interest to Firebase:", error);
          setMessage({ text: 'Failed to save interest', type: 'error' });
        } finally {
          setIsAddingInterest(false);
        }
      }
      
      setNewInterest('');
    }
  };
  
  // Remove an interest
  const removeInterest = async (interest: string) => {
    const currentInterests = objectToArray(profile.interests);
    const updatedInterests = currentInterests.filter(i => i !== interest);
    
    // Update local state
    setProfile({
      ...profile,
      interests: updatedInterests
    });
    
    // Save to Firebase
    if (currentUser) {
      try {
        setLoading(true);
        const userDocRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userDocRef, {
          'profile.interests': updatedInterests
        });
        await refreshUserData();
        console.log("Removed interest and saved to Firebase:", interest);
      } catch (error) {
        console.error("Error removing interest from Firebase:", error);
        setMessage({ text: 'Failed to remove interest', type: 'error' });
      } finally {
        setLoading(false);
      }
    }
  };
  
  // Add a new career goal
  const addCareerGoal = async () => {
    if (newCareerGoal.trim()) {
      const currentCareerGoals = objectToArray(profile.careerGoals);
      
      // Check if career goal already exists
      if (currentCareerGoals.includes(newCareerGoal.trim())) {
        return;
      }
      
      const updatedCareerGoals = [...currentCareerGoals, newCareerGoal.trim()];
      
      // Update local state
      setProfile({
        ...profile,
        careerGoals: updatedCareerGoals
      });
      
      // Save to Firebase
      if (currentUser) {
        try {
          setIsAddingCareerGoal(true);
          const userDocRef = doc(db, 'users', currentUser.uid);
          await updateDoc(userDocRef, {
            'profile.careerGoals': updatedCareerGoals
          });
          await refreshUserData();
          console.log("Added career goal and saved to Firebase:", newCareerGoal.trim());
        } catch (error) {
          console.error("Error saving career goal to Firebase:", error);
          setMessage({ text: 'Failed to save career goal', type: 'error' });
        } finally {
          setIsAddingCareerGoal(false);
        }
      }
      
      setNewCareerGoal('');
    }
  };
  
  // Remove a career goal
  const removeCareerGoal = async (goal: string) => {
    const currentCareerGoals = objectToArray(profile.careerGoals);
    const updatedCareerGoals = currentCareerGoals.filter(g => g !== goal);
    
    // Update local state
    setProfile({
      ...profile,
      careerGoals: updatedCareerGoals
    });
    
    // Save to Firebase
    if (currentUser) {
      try {
        setLoading(true);
        const userDocRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userDocRef, {
          'profile.careerGoals': updatedCareerGoals
        });
        await refreshUserData();
        console.log("Removed career goal and saved to Firebase:", goal);
      } catch (error) {
        console.error("Error removing career goal from Firebase:", error);
        setMessage({ text: 'Failed to remove career goal', type: 'error' });
      } finally {
        setLoading(false);
      }
    }
  };
  
  // Add a new skill
  const addSkill = async () => {
    if (newSkill.trim()) {
      const currentSkills = objectToArray(profile.skills);
      
      // Check if skill already exists
      if (currentSkills.includes(newSkill.trim())) {
        return;
      }
      
      const updatedSkills = [...currentSkills, newSkill.trim()];
      
      // Update local state
      setProfile({
        ...profile,
        skills: updatedSkills
      });
      
      // Save to Firebase
      if (currentUser) {
        try {
          setIsAddingSkill(true);
          const userDocRef = doc(db, 'users', currentUser.uid);
          await updateDoc(userDocRef, {
            'profile.skills': updatedSkills
          });
          await refreshUserData();
          console.log("Added skill and saved to Firebase:", newSkill.trim());
        } catch (error) {
          console.error("Error saving skill to Firebase:", error);
          setMessage({ text: 'Failed to save skill', type: 'error' });
        } finally {
          setIsAddingSkill(false);
        }
      }
      
      setNewSkill('');
    }
  };
  
  // Remove a skill
  const removeSkill = async (skill: string) => {
    const currentSkills = objectToArray(profile.skills);
    const updatedSkills = currentSkills.filter(s => s !== skill);
    
    // Update local state
    setProfile({
      ...profile,
      skills: updatedSkills
    });
    
    // Save to Firebase
    if (currentUser) {
      try {
        setLoading(true);
        const userDocRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userDocRef, {
          'profile.skills': updatedSkills
        });
        await refreshUserData();
        console.log("Removed skill and saved to Firebase:", skill);
      } catch (error) {
        console.error("Error removing skill from Firebase:", error);
        setMessage({ text: 'Failed to remove skill', type: 'error' });
      } finally {
        setLoading(false);
      }
    }
  };
  
  // Save profile changes
  const saveProfile = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      
      // Ensure arrays are properly initialized
      const profileToSave = {
        ...profile,
        interests: objectToArray(profile.interests),
        careerGoals: objectToArray(profile.careerGoals),
        skills: objectToArray(profile.skills)
      };
      
      console.log("Saving profile data:", profileToSave);
      
      await updateDoc(userDocRef, {
        profile: profileToSave
      });
      
      // Update user data in context
      await refreshUserData();
      
      setMessage({ text: 'Profile updated successfully', type: 'success' });
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ text: 'Failed to update profile', type: 'error' });
    } finally {
      setLoading(false);
    }
  };
  
  if (!currentUser) {
    return (
      <div className="text-center py-10">
        <p className="text-lg">Please sign in to view your profile.</p>
      </div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-6xl mx-auto p-4 space-y-6"
    >
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Your Profile</h1>
      
      {message && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
        >
          {message.text}
        </motion.div>
      )}
      
      {/* Career Insights Section */}
      {(migratedProfile || combinedProfile) && (
        <Card className="bg-gradient-to-br from-teal-50 to-blue-50 border border-teal-200">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <CardTitle className="text-xl text-gray-900">Your Profile</CardTitle>
                <CardDescription className="text-gray-600">
                  Insights from your career exploration (migrated from guest session)
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Interests */}
              {(combinedProfile?.interests || migratedProfile?.interests) && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    <Heart className="w-4 h-4 mr-2 text-pink-500" />
                    Interests
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(combinedProfile?.interests || migratedProfile?.interests || []).slice(0, 6).map((interest: string, index: number) => (
                      <Badge key={index} variant="secondary" className="bg-pink-100 text-pink-800 hover:bg-pink-200">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Goals */}
              {(combinedProfile?.goals || migratedProfile?.goals) && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    <Target className="w-4 h-4 mr-2 text-blue-500" />
                    Goals
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(combinedProfile?.goals || migratedProfile?.goals || []).slice(0, 4).map((goal: string, index: number) => (
                      <Badge key={index} variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                        {goal}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Skills */}
              {(combinedProfile?.skills || migratedProfile?.skills) && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    <Briefcase className="w-4 h-4 mr-2 text-purple-500" />
                    Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(combinedProfile?.skills || migratedProfile?.skills || []).slice(0, 5).map((skill: string, index: number) => (
                      <Badge key={index} variant="secondary" className="bg-purple-100 text-purple-800 hover:bg-purple-200">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Values */}
              {(combinedProfile?.values || migratedProfile?.values) && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    <TrendingUp className="w-4 h-4 mr-2 text-green-500" />
                    Values
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(combinedProfile?.values || migratedProfile?.values || []).slice(0, 4).map((value: string, index: number) => (
                      <Badge key={index} variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">
                        {value}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your personal details and preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              {/* Bio */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Bio</label>
                <textarea
                  value={profile.bio || ''}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  rows={3}
                  placeholder="Tell us a bit about yourself..."
                />
              </div>
              
              {/* School */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">School</label>
                <input
                  type="text"
                  value={profile.school || ''}
                  onChange={(e) => setProfile({ ...profile, school: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Your school or institution"
                />
              </div>
              
              {/* Grade */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Grade/Year</label>
                <input
                  type="text"
                  value={profile.grade || ''}
                  onChange={(e) => setProfile({ ...profile, grade: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="e.g., 11, Year 12, Freshman"
                />
              </div>
              
              {/* Interests */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Interests</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {objectToArray(profile.interests).length > 0 ? (
                    objectToArray(profile.interests).map((interest, index) => (
                      <Badge key={index} variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                        {interest}
                        <button 
                          type="button" 
                          onClick={() => removeInterest(interest)}
                          className="ml-2 text-red-500 hover:text-red-700 font-bold"
                        >
                          ×
                        </button>
                      </Badge>
                    ))
                  ) : (
                    <div className="text-gray-500 text-sm italic">No interests added yet</div>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest())}
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Add an interest"
                  />
                  <Button
                    type="button"
                    onClick={addInterest}
                    disabled={isAddingInterest}
                    variant="outline"
                    size="sm"
                  >
                    {isAddingInterest ? 'Adding...' : 'Add'}
                  </Button>
                </div>
              </div>
              
              {/* Career Goals */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Career Goals</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {objectToArray(profile.careerGoals).length > 0 ? (
                    objectToArray(profile.careerGoals).map((goal, index) => (
                      <Badge key={index} variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">
                        {goal}
                        <button 
                          type="button" 
                          onClick={() => removeCareerGoal(goal)}
                          className="ml-2 text-red-500 hover:text-red-700 font-bold"
                        >
                          ×
                        </button>
                      </Badge>
                    ))
                  ) : (
                    <div className="text-gray-500 text-sm italic">No career goals added yet</div>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCareerGoal}
                    onChange={(e) => setNewCareerGoal(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCareerGoal())}
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Add a career goal"
                  />
                  <Button
                    type="button"
                    onClick={addCareerGoal}
                    disabled={isAddingCareerGoal}
                    variant="outline" 
                    size="sm"
                  >
                    {isAddingCareerGoal ? 'Adding...' : 'Add'}
                  </Button>
                </div>
              </div>
              
              {/* Skills */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Skills</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {objectToArray(profile.skills).length > 0 ? (
                    objectToArray(profile.skills).map((skill, index) => (
                      <Badge key={index} variant="secondary" className="bg-purple-100 text-purple-800 hover:bg-purple-200">
                        {skill}
                        <button 
                          type="button" 
                          onClick={() => removeSkill(skill)}
                          className="ml-2 text-red-500 hover:text-red-700 font-bold"
                        >
                          ×
                        </button>
                      </Badge>
                    ))
                  ) : (
                    <div className="text-gray-500 text-sm italic">No skills added yet</div>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Add a skill"
                  />
                  <Button
                    type="button"
                    onClick={addSkill}
                    disabled={isAddingSkill}
                    variant="outline"
                    size="sm"
                  >
                    {isAddingSkill ? 'Adding...' : 'Add'}
                  </Button>
                </div>
              </div>
              
              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Saving...' : 'Save Profile'}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        {/* Account Information & Preferences */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Your account details and registration info</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Email</label>
                <input
                  type="email"
                  value={currentUser.email || ''}
                  disabled
                  className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Display Name</label>
                <input
                  type="text"
                  value={currentUser.displayName || ''}
                  disabled
                  className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Account Created</label>
                <input
                  type="text"
                  value={userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() + ', ' + new Date(userData.createdAt).toLocaleTimeString() : ''}
                  disabled
                  className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Last Login</label>
                <input
                  type="text"
                  value={userData?.lastLogin ? new Date(userData.lastLogin).toLocaleDateString() + ', ' + new Date(userData.lastLogin).toLocaleTimeString() : ''}
                  disabled
                  className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400"
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>Customize your experience</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePreferencesSubmit} className="space-y-4">
                {/* Theme */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Theme</label>
                  <select
                    value={preferences.theme}
                    onChange={(e) => setPreferences({ ...preferences, theme: e.target.value as 'light' | 'dark' | 'system' })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </div>
                
                {/* Notifications */}
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="notifications"
                    checked={preferences.notifications}
                    onChange={(e) => setPreferences({ ...preferences, notifications: e.target.checked })}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <label htmlFor="notifications" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Enable In-App Notifications
                  </label>
                </div>
                
                {/* Email Updates */}
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="emailUpdates"
                    checked={preferences.emailUpdates}
                    onChange={(e) => setPreferences({ ...preferences, emailUpdates: e.target.checked })}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <label htmlFor="emailUpdates" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Receive Email Updates
                  </label>
                </div>
                
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Saving...' : 'Save Preferences'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
};

export default Profile;
