import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { updateUserProfile, updateUserPreferences } from '../services/userService';
import { UserProfile, UserPreferences } from '../models/User';
import { motion } from 'framer-motion';

const Profile: React.FC = () => {
  const { currentUser, userData, refreshUserData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isAddingInterest, setIsAddingInterest] = useState(false);
  const [isAddingCareerGoal, setIsAddingCareerGoal] = useState(false);
  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
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
      className="max-w-4xl mx-auto p-4"
    >
      <h1 className="text-2xl font-bold mb-6">Your Profile</h1>
      
      {message && (
        <div className={`p-4 mb-6 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}
      
      <div className="flex flex-col md:flex-row gap-8">
        {/* Profile Information */}
        <div className="flex-1">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
            
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              {/* Bio */}
              <div>
                <label className="block text-sm font-medium mb-1">Bio</label>
                <textarea
                  value={profile.bio || ''}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                  rows={3}
                />
              </div>
              
              {/* School */}
              <div>
                <label className="block text-sm font-medium mb-1">School</label>
                <input
                  type="text"
                  value={profile.school || ''}
                  onChange={(e) => setProfile({ ...profile, school: e.target.value })}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              
              {/* Grade */}
              <div>
                <label className="block text-sm font-medium mb-1">Grade/Year</label>
                <input
                  type="text"
                  value={profile.grade || ''}
                  onChange={(e) => setProfile({ ...profile, grade: e.target.value })}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              
              {/* Interests */}
              <div>
                <label className="block text-sm font-medium mb-1">Interests</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {objectToArray(profile.interests).length > 0 ? (
                    objectToArray(profile.interests).map((interest, index) => (
                      <div key={index} className="bg-blue-100 dark:bg-blue-900 px-3 py-1 rounded-full flex items-center">
                        <span>{interest}</span>
                        <button 
                          type="button" 
                          onClick={() => removeInterest(interest)}
                          className="ml-2 text-red-500 hover:text-red-700"
                        >
                          &times;
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500 text-sm italic">No interests added yet</div>
                  )}
                </div>
                <div className="flex">
                  <input
                    type="text"
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addInterest()}
                    className="flex-1 p-2 border rounded-l dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Add an interest"
                  />
                  <button
                    type="button"
                    onClick={addInterest}
                    disabled={isAddingInterest}
                    className="bg-blue-500 text-white px-4 py-2 rounded-r hover:bg-blue-600 disabled:bg-blue-300"
                  >
                    {isAddingInterest ? 'Adding...' : 'Add'}
                  </button>
                </div>
              </div>
              
              {/* Career Goals */}
              <div>
                <label className="block text-sm font-medium mb-1">Career Goals</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {objectToArray(profile.careerGoals).length > 0 ? (
                    objectToArray(profile.careerGoals).map((goal, index) => (
                      <div key={index} className="bg-green-100 dark:bg-green-900 px-3 py-1 rounded-full flex items-center">
                        <span>{goal}</span>
                        <button 
                          type="button" 
                          onClick={() => removeCareerGoal(goal)}
                          className="ml-2 text-red-500 hover:text-red-700"
                        >
                          &times;
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500 text-sm italic">No career goals added yet</div>
                  )}
                </div>
                <div className="flex">
                  <input
                    type="text"
                    value={newCareerGoal}
                    onChange={(e) => setNewCareerGoal(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCareerGoal()}
                    className="flex-1 p-2 border rounded-l dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Add a career goal"
                  />
                  <button
                    type="button"
                    onClick={addCareerGoal}
                    disabled={isAddingCareerGoal}
                    className="bg-green-500 text-white px-4 py-2 rounded-r hover:bg-green-600 disabled:bg-green-300"
                  >
                    {isAddingCareerGoal ? 'Adding...' : 'Add'}
                  </button>
                </div>
              </div>
              
              {/* Skills */}
              <div>
                <label className="block text-sm font-medium mb-1">Skills</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {objectToArray(profile.skills).length > 0 ? (
                    objectToArray(profile.skills).map((skill, index) => (
                      <div key={index} className="bg-purple-100 dark:bg-purple-900 px-3 py-1 rounded-full flex items-center">
                        <span>{skill}</span>
                        <button 
                          type="button" 
                          onClick={() => removeSkill(skill)}
                          className="ml-2 text-red-500 hover:text-red-700"
                        >
                          &times;
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500 text-sm italic">No skills added yet</div>
                  )}
                </div>
                <div className="flex">
                  <input
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addSkill()}
                    className="flex-1 p-2 border rounded-l dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Add a skill"
                  />
                  <button
                    type="button"
                    onClick={addSkill}
                    disabled={isAddingSkill}
                    className="bg-purple-500 text-white px-4 py-2 rounded-r hover:bg-purple-600 disabled:bg-purple-300"
                  >
                    {isAddingSkill ? 'Adding...' : 'Add'}
                  </button>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Profile'}
              </button>
            </form>
          </div>
        </div>
        
        {/* Account Settings */}
        <div className="flex-1">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4">Account Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={currentUser.email || ''}
                  disabled
                  className="w-full p-2 border rounded bg-gray-100 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Display Name</label>
                <input
                  type="text"
                  value={currentUser.displayName || ''}
                  disabled
                  className="w-full p-2 border rounded bg-gray-100 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Account Created</label>
                <input
                  type="text"
                  value={userData?.createdAt ? new Date(userData.createdAt).toLocaleString() : ''}
                  disabled
                  className="w-full p-2 border rounded bg-gray-100 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Last Login</label>
                <input
                  type="text"
                  value={userData?.lastLogin ? new Date(userData.lastLogin).toLocaleString() : ''}
                  disabled
                  className="w-full p-2 border rounded bg-gray-100 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Preferences</h2>
            
            <form onSubmit={handlePreferencesSubmit} className="space-y-4">
              {/* Theme */}
              <div>
                <label className="block text-sm font-medium mb-1">Theme</label>
                <select
                  value={preferences.theme}
                  onChange={(e) => setPreferences({ ...preferences, theme: e.target.value as 'light' | 'dark' | 'system' })}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
              </div>
              
              {/* Notifications */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="notifications"
                  checked={preferences.notifications}
                  onChange={(e) => setPreferences({ ...preferences, notifications: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="notifications" className="text-sm font-medium">
                  Enable In-App Notifications
                </label>
              </div>
              
              {/* Email Updates */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="emailUpdates"
                  checked={preferences.emailUpdates}
                  onChange={(e) => setPreferences({ ...preferences, emailUpdates: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="emailUpdates" className="text-sm font-medium">
                  Receive Email Updates
                </label>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Preferences'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Profile;
