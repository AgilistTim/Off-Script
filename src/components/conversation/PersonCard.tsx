import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Target, Heart, TrendingUp, Edit3, Plus, X } from 'lucide-react';

interface PersonProfile {
  interests: string[];
  goals: string[];
  skills: string[];
  values: string[];
  careerStage: string;
  workStyle: string[];
  lastUpdated: string;
}

interface PersonCardProps {
  profile: PersonProfile;
  onUpdateProfile: (profile: PersonProfile) => void;
  className?: string;
}

export const PersonCard: React.FC<PersonCardProps> = ({
  profile,
  onUpdateProfile,
  className = ''
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingProfile, setEditingProfile] = useState<PersonProfile>(profile);

  const handleSave = () => {
    onUpdateProfile(editingProfile);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditingProfile(profile);
    setIsEditing(false);
  };

  const addItem = (field: keyof PersonProfile, value: string) => {
    if (Array.isArray(editingProfile[field])) {
      setEditingProfile(prev => ({
        ...prev,
        [field]: [...(prev[field] as string[]), value]
      }));
    }
  };

  const removeItem = (field: keyof PersonProfile, index: number) => {
    if (Array.isArray(editingProfile[field])) {
      setEditingProfile(prev => ({
        ...prev,
        [field]: (prev[field] as string[]).filter((_, i) => i !== index)
      }));
    }
  };

  const EditableTagList: React.FC<{ 
    items: string[]; 
    field: keyof PersonProfile; 
    placeholder: string; 
    color: string;
  }> = ({ items, field, placeholder, color }) => {
    const [newItem, setNewItem] = useState('');

    const handleAdd = () => {
      if (newItem.trim()) {
        addItem(field, newItem.trim());
        setNewItem('');
      }
    };

    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {items.map((item, index) => (
            <span
              key={index}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${color} group`}
            >
              {item}
              {isEditing && (
                <button
                  onClick={() => removeItem(field, index)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
        {isEditing && (
          <div className="flex gap-2">
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder={placeholder}
              className="flex-1 text-sm px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
            />
            <button
              onClick={handleAdd}
              className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6 shadow-lg ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Your Profile</h3>
            <p className="text-sm text-gray-600">
              Based on our conversation • {profile.lastUpdated}
            </p>
          </div>
        </div>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center space-x-1 text-purple-600 hover:text-purple-700 transition-colors text-sm"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit</span>
          </button>
        ) : (
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1 text-gray-600 hover:text-gray-800 transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Interests */}
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <Heart className="w-4 h-4 text-pink-500" />
            <h4 className="font-medium text-gray-800">Interests</h4>
          </div>
          <EditableTagList
            items={isEditing ? editingProfile.interests : profile.interests}
            field="interests"
            placeholder="Add interest..."
            color="bg-pink-100 text-pink-800"
          />
        </div>

        {/* Goals */}
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <Target className="w-4 h-4 text-blue-500" />
            <h4 className="font-medium text-gray-800">Goals</h4>
          </div>
          <EditableTagList
            items={isEditing ? editingProfile.goals : profile.goals}
            field="goals"
            placeholder="Add goal..."
            color="bg-blue-100 text-blue-800"
          />
        </div>

        {/* Skills */}
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <h4 className="font-medium text-gray-800">Skills</h4>
          </div>
          <EditableTagList
            items={isEditing ? editingProfile.skills : profile.skills}
            field="skills"
            placeholder="Add skill..."
            color="bg-green-100 text-green-800"
          />
        </div>

        {/* Values */}
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
            <h4 className="font-medium text-gray-800">Values</h4>
          </div>
          <EditableTagList
            items={isEditing ? editingProfile.values : profile.values}
            field="values"
            placeholder="Add value..."
            color="bg-yellow-100 text-yellow-800"
          />
        </div>
      </div>

      {/* Career Stage & Work Style */}
      <div className="mt-6 pt-6 border-t border-purple-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Career Stage</label>
            {isEditing ? (
              <select
                value={editingProfile.careerStage}
                onChange={(e) => setEditingProfile(prev => ({ ...prev, careerStage: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              >
                <option value="exploring">Exploring options</option>
                <option value="early_career">Early career (0-3 years)</option>
                <option value="mid_career">Mid career (4-10 years)</option>
                <option value="senior_career">Senior career (10+ years)</option>
                <option value="transitioning">Career transition</option>
              </select>
            ) : (
              <span className="inline-block px-3 py-2 bg-purple-100 text-purple-800 rounded-lg text-sm">
                {profile.careerStage}
              </span>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Work Style</label>
            <EditableTagList
              items={isEditing ? editingProfile.workStyle : profile.workStyle}
              field="workStyle"
              placeholder="Add work preference..."
              color="bg-purple-100 text-purple-800"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-purple-200">
        <p className="text-xs text-gray-500 text-center">
          💡 This profile improves as we learn more about you through conversations
        </p>
      </div>
    </motion.div>
  );
}; 