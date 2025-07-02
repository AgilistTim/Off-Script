import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateUserProfile, updateUserPreferences } from '../services/userService';
import { UserProfile, UserPreferences } from '../models/User';
import { motion } from 'framer-motion';

const Profile: React.FC = () => {
  const { currentUser, userData, refreshUserData } = useAuth();
  const [loading, setLoading] = useState(false);
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
  
  // Load user data when component mounts
  useEffect(() => {
    if (userData) {
      // Load profile data
      if (userData.profile) {
        setProfile({
          bio: userData.profile.bio || '',
          school: userData.profile.school || '',
          grade: userData.profile.grade || '',
          interests: userData.profile.interests || [],
          careerGoals: userData.profile.careerGoals || [],
          skills: userData.profile.skills || []
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
      await refreshUserData();
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
      await refreshUserData();
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
  const addInterest = () => {
    if (newInterest.trim() && !profile.interests?.includes(newInterest.trim())) {
      setProfile({
        ...profile,
        interests: [...(profile.interests || []), newInterest.trim()]
      });
      setNewInterest('');
    }
  };
  
  // Remove an interest
  const removeInterest = (interest: string) => {
    setProfile({
      ...profile,
      interests: profile.interests?.filter(i => i !== interest) || []
    });
  };
  
  // Add a new career goal
  const addCareerGoal = () => {
    if (newCareerGoal.trim() && !profile.careerGoals?.includes(newCareerGoal.trim())) {
      setProfile({
        ...profile,
        careerGoals: [...(profile.careerGoals || []), newCareerGoal.trim()]
      });
      setNewCareerGoal('');
    }
  };
  
  // Remove a career goal
  const removeCareerGoal = (goal: string) => {
    setProfile({
      ...profile,
      careerGoals: profile.careerGoals?.filter(g => g !== goal) || []
    });
  };
  
  // Add a new skill
  const addSkill = () => {
    if (newSkill.trim() && !profile.skills?.includes(newSkill.trim())) {
      setProfile({
        ...profile,
        skills: [...(profile.skills || []), newSkill.trim()]
      });
      setNewSkill('');
    }
  };
  
  // Remove a skill
  const removeSkill = (skill: string) => {
    setProfile({
      ...profile,
      skills: profile.skills?.filter(s => s !== skill) || []
    });
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
                  {profile.interests?.map((interest, index) => (
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
                  ))}
                </div>
                <div className="flex">
                  <input
                    type="text"
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    className="flex-1 p-2 border rounded-l dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Add an interest"
                  />
                  <button
                    type="button"
                    onClick={addInterest}
                    className="bg-blue-500 text-white px-4 py-2 rounded-r hover:bg-blue-600"
                  >
                    Add
                  </button>
                </div>
              </div>
              
              {/* Career Goals */}
              <div>
                <label className="block text-sm font-medium mb-1">Career Goals</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {profile.careerGoals?.map((goal, index) => (
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
                  ))}
                </div>
                <div className="flex">
                  <input
                    type="text"
                    value={newCareerGoal}
                    onChange={(e) => setNewCareerGoal(e.target.value)}
                    className="flex-1 p-2 border rounded-l dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Add a career goal"
                  />
                  <button
                    type="button"
                    onClick={addCareerGoal}
                    className="bg-green-500 text-white px-4 py-2 rounded-r hover:bg-green-600"
                  >
                    Add
                  </button>
                </div>
              </div>
              
              {/* Skills */}
              <div>
                <label className="block text-sm font-medium mb-1">Skills</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {profile.skills?.map((skill, index) => (
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
                  ))}
                </div>
                <div className="flex">
                  <input
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    className="flex-1 p-2 border rounded-l dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Add a skill"
                  />
                  <button
                    type="button"
                    onClick={addSkill}
                    className="bg-purple-500 text-white px-4 py-2 rounded-r hover:bg-purple-600"
                  >
                    Add
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
