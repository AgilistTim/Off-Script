import React, { useState, useEffect } from 'react';
import { 
  Save, 
  AlertCircle, 
  Check,
  Globe,
  Bell,
  Shield,
  Database,
  Mail,
  Key
} from 'lucide-react';
import { apiKeys, features } from '../../config/environment';

const AdminSettings: React.FC = () => {
  // General settings
  const [siteName, setSiteName] = useState('Off-Script');
  const [siteDescription, setSiteDescription] = useState('Alternative career pathways platform');
  const [adminEmail, setAdminEmail] = useState('admin@offscript.com');
  
  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [userRegistrationNotifications, setUserRegistrationNotifications] = useState(true);
  const [videoUploadNotifications, setVideoUploadNotifications] = useState(true);
  
  // Security settings
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const [passwordMinLength, setPasswordMinLength] = useState(8);
  const [requireSpecialChars, setRequireSpecialChars] = useState(true);
  
  // Content settings
  const [moderationEnabled, setModerationEnabled] = useState(true);
  const [autoApproveVideos, setAutoApproveVideos] = useState(false);
  const [maxVideoSize, setMaxVideoSize] = useState(500);
  
  // API settings
  const [apiKey, setApiKey] = useState('');
  const [youtubeApiKey, setYoutubeApiKey] = useState('');
  const [bumpupsApiKey, setBumpupsApiKey] = useState('');
  const [apiEnabled, setApiEnabled] = useState(true);
  
  // Form submission
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load API keys from configuration
  useEffect(() => {
    // Only show masked values for security
    if (apiKeys.youtube) {
      const masked = maskApiKey(apiKeys.youtube);
      setYoutubeApiKey(masked);
    }
    
    if (apiKeys.bumpups) {
      const masked = maskApiKey(apiKeys.bumpups);
      setBumpupsApiKey(masked);
    }
    
    // For demo purposes only - this should be a server-side generated API key
    setApiKey('sk_••••••••••••••••••••••••••••');
  }, []);
  
  // Helper to mask API keys for display
  const maskApiKey = (key: string): string => {
    if (!key) return '';
    if (key.length <= 8) return '••••••••';
    
    const firstFour = key.substring(0, 4);
    const lastFour = key.substring(key.length - 4);
    return `${firstFour}••••••••••${lastFour}`;
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);
    
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      
      // Reset success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    }, 1000);
  };
  
  const SettingsSection: React.FC<{
    title: string;
    description: string;
    icon: React.ReactNode;
    children: React.ReactNode;
  }> = ({ title, description, icon, children }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <div className="flex items-start mb-6">
        <div className="mr-4 p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
        </div>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Settings</h1>
        <button 
          onClick={handleSubmit}
          disabled={isSaving}
          className="flex items-center px-4 py-2 bg-primary-blue text-white rounded-md hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          {isSaving ? (
            <>
              <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              Saving...
            </>
          ) : (
            <>
              <Save size={18} className="mr-2" />
              Save All Settings
            </>
          )}
        </button>
      </div>
      
      {saveSuccess && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded flex items-center">
          <Check size={18} className="mr-2" />
          <span>Settings saved successfully!</span>
        </div>
      )}
      
      {saveError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center">
          <AlertCircle size={18} className="mr-2" />
          <span>{saveError}</span>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General Settings */}
        <SettingsSection 
          title="General Settings" 
          description="Basic settings for your platform"
          icon={<Globe size={24} className="text-blue-600 dark:text-blue-400" />}
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Site Name
            </label>
            <input
              type="text"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Site Description
            </label>
            <textarea
              value={siteDescription}
              onChange={(e) => setSiteDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Admin Email
            </label>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </SettingsSection>
        
        {/* Notification Settings */}
        <SettingsSection 
          title="Notification Settings" 
          description="Configure when and how you receive notifications"
          icon={<Bell size={24} className="text-blue-600 dark:text-blue-400" />}
        >
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Email Notifications
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={emailNotifications}
                onChange={() => setEmailNotifications(!emailNotifications)}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              New User Registration Alerts
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={userRegistrationNotifications}
                onChange={() => setUserRegistrationNotifications(!userRegistrationNotifications)}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Video Upload Alerts
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={videoUploadNotifications}
                onChange={() => setVideoUploadNotifications(!videoUploadNotifications)}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </SettingsSection>
        
        {/* Security Settings */}
        <SettingsSection 
          title="Security Settings" 
          description="Configure security options for your platform"
          icon={<Shield size={24} className="text-blue-600 dark:text-blue-400" />}
        >
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Two-Factor Authentication
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={twoFactorAuth}
                onChange={() => setTwoFactorAuth(!twoFactorAuth)}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Minimum Password Length
            </label>
            <input
              type="number"
              min={6}
              max={20}
              value={passwordMinLength}
              onChange={(e) => setPasswordMinLength(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Require Special Characters
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={requireSpecialChars}
                onChange={() => setRequireSpecialChars(!requireSpecialChars)}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </SettingsSection>
        
        {/* Content Settings */}
        <SettingsSection 
          title="Content Settings" 
          description="Configure content moderation and upload settings"
          icon={<Database size={24} className="text-blue-600 dark:text-blue-400" />}
        >
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Content Moderation
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={moderationEnabled}
                onChange={() => setModerationEnabled(!moderationEnabled)}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Auto-Approve Videos
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={autoApproveVideos}
                onChange={() => setAutoApproveVideos(!autoApproveVideos)}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Max Video Size (MB)
            </label>
            <input
              type="number"
              min={10}
              max={2000}
              value={maxVideoSize}
              onChange={(e) => setMaxVideoSize(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </SettingsSection>
        
        {/* API Settings */}
        <SettingsSection 
          title="API Settings" 
          description="Configure API access and keys"
          icon={<Key size={24} className="text-blue-600 dark:text-blue-400" />}
        >
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              API Access
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={apiEnabled}
                onChange={() => setApiEnabled(!apiEnabled)}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Platform API Key
            </label>
            <div className="flex">
              <input
                type="password"
                value={apiKey}
                readOnly
                className="flex-grow px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                type="button"
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-r-md hover:bg-gray-300 dark:hover:bg-gray-500"
                onClick={() => {
                  // In a real app, this would call an API to regenerate the key
                  setApiKey('sk_••••••••••••••••••••••••••••');
                  setSaveSuccess(true);
                  setTimeout(() => setSaveSuccess(false), 3000);
                }}
              >
                Regenerate
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              This key is for the Off-Script platform API. Contact support to change this key.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              YouTube API Key
            </label>
            <div className="flex">
              <input
                type="password"
                value={youtubeApiKey}
                readOnly
                className="flex-grow px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              This key is set via environment variables. Status: {features.enableYouTubeIntegration ? '✅ Active' : '❌ Not configured'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Bumpups API Key
            </label>
            <div className="flex">
              <input
                type="password"
                value={bumpupsApiKey}
                readOnly
                className="flex-grow px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              This key is set via environment variables. Status: {features.enableBumpupsIntegration ? '✅ Active' : '❌ Not configured'}
            </p>
          </div>
        </SettingsSection>
      </form>
    </div>
  );
};

export default AdminSettings; 