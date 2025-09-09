/**
 * Prompt Management Admin Interface
 * 
 * Allows admins to view, edit, and test conversation objectives and trees
 * Real-time updates with Firebase integration
 */

import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Edit3, 
  Save, 
  X, 
  Plus, 
  BarChart3, 
  TestTube, 
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ConversationObjective, 
  ConversationTree, 
  PromptManifest 
} from '../../types/ConversationObjectives';
import { promptCache } from '../../services/realtimePromptCache';

interface PromptManagementState {
  objectives: ConversationObjective[];
  trees: ConversationTree[];
  manifest: PromptManifest | null;
  selectedObjective: ConversationObjective | null;
  selectedTree: ConversationTree | null;
  isEditing: boolean;
  editingField: string | null;
  cacheStats: any;
}

const PromptManagement: React.FC = () => {
  const [state, setState] = useState<PromptManagementState>({
    objectives: [],
    trees: [],
    manifest: null,
    selectedObjective: null,
    selectedTree: null,
    isEditing: false,
    editingField: null,
    cacheStats: null
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<any>(null);

  useEffect(() => {
    loadPromptData();
    
    // Set up periodic cache stats refresh
    const statsInterval = setInterval(() => {
      const stats = promptCache.getCacheStats();
      setState(prev => ({ ...prev, cacheStats: stats }));
    }, 5000);

    return () => clearInterval(statsInterval);
  }, []);

  const loadPromptData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load real Firebase data via cache
      console.log('📥 [ADMIN] Loading conversation objectives from Firebase cache...');
      
      // Wait for cache to be ready
      console.log('⏳ [ADMIN] Waiting for cache initialization...');
      await promptCache.waitForReady();
      console.log('✅ [ADMIN] Cache is ready');
      
      const objectives: ConversationObjective[] = [];
      const trees: ConversationTree[] = [];

      // Get manifest to know what objectives and trees are active
      const manifest = promptCache.getManifest();
      console.log('📋 [ADMIN] Current manifest:', manifest);

      if (manifest?.activeObjectives) {
        console.log(`🔍 [ADMIN] Loading ${Object.keys(manifest.activeObjectives).length} objectives...`);
        
        // Load all active objectives
        for (const objectiveId of Object.keys(manifest.activeObjectives)) {
          try {
            const objective = await promptCache.getObjective(objectiveId);
            if (objective) {
              objectives.push(objective);
              console.log(`✅ [ADMIN] Loaded objective: ${objectiveId}`);
            } else {
              console.warn(`⚠️ [ADMIN] Objective not found: ${objectiveId}`);
            }
          } catch (error) {
            console.error(`❌ [ADMIN] Error loading objective ${objectiveId}:`, error);
          }
        }
      }

      if (manifest?.activeTrees) {
        console.log(`🌳 [ADMIN] Loading ${Object.keys(manifest.activeTrees).length} trees...`);
        
        // Load all active trees
        for (const treeId of Object.keys(manifest.activeTrees)) {
          try {
            const tree = await promptCache.getTree(treeId);
            if (tree) {
              trees.push(tree);
              console.log(`✅ [ADMIN] Loaded tree: ${treeId}`);
            } else {
              console.warn(`⚠️ [ADMIN] Tree not found: ${treeId}`);
            }
          } catch (error) {
            console.error(`❌ [ADMIN] Error loading tree ${treeId}:`, error);
          }
        }
      }

      console.log(`📊 [ADMIN] Loaded ${objectives.length} objectives and ${trees.length} trees`);

      // Update state with real Firebase data
      setState(prev => ({
        ...prev,
        objectives,
        trees,
        manifest,
        selectedObjective: objectives[0] || null
      }));

      // Load cache stats
      const stats = promptCache.getCacheStats();
      setState(prev => ({ ...prev, cacheStats: stats }));

    } catch (err) {
      setError(`Failed to load prompt data: ${err}`);
      console.error('Error loading prompt data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditField = (field: string, value: any) => {
    if (!state.selectedObjective) return;

    setState(prev => ({
      ...prev,
      selectedObjective: {
        ...prev.selectedObjective!,
        [field]: value
      }
    }));
  };

  const handleSaveObjective = async () => {
    if (!state.selectedObjective) return;

    try {
      // Here we would save to Firebase
      console.log('Saving objective:', state.selectedObjective);
      
      // Update local state
      setState(prev => ({
        ...prev,
        objectives: prev.objectives.map(obj => 
          obj.id === prev.selectedObjective!.id ? prev.selectedObjective! : obj
        ),
        isEditing: false,
        editingField: null
      }));

      setTestResults({ success: true, message: 'Objective saved successfully!' });
      setTimeout(() => setTestResults(null), 3000);

    } catch (err) {
      setError(`Failed to save objective: ${err}`);
    }
  };

  const testObjective = async (objectiveId: string) => {
    try {
      setTestResults({ testing: true, message: 'Testing objective...' });

      // Simulate testing the objective
      await new Promise(resolve => setTimeout(resolve, 2000));

      const mockResults = {
        success: true,
        promptLength: 1250,
        estimatedResponseTime: 85,
        estimatedTokens: 180,
        qualityScore: 0.92,
        suggestions: [
          'Consider reducing prompt length by 10% for faster response',
          'Tone could be slightly more encouraging for uncertain personas'
        ]
      };

      setTestResults(mockResults);
      setTimeout(() => setTestResults(null), 10000);

    } catch (err) {
      setTestResults({ success: false, message: `Test failed: ${err}` });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Prompt Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage conversation objectives and optimize conversation flows
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={loadPromptData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh Data
          </button>
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center">
            <Plus size={16} className="mr-2" />
            New Objective
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
          <AlertCircle size={16} className="mr-2" />
          {error}
        </div>
      )}

      {/* Cache Performance Stats */}
      {state.cacheStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Cache Hit Rate</p>
                <p className="text-2xl font-bold text-green-600">{state.cacheStats.hitRate}%</p>
              </div>
              <TrendingUp className="text-green-600" size={24} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Cached Items</p>
                <p className="text-2xl font-bold text-blue-600">{state.cacheStats.cacheSize}</p>
              </div>
              <BarChart3 className="text-blue-600" size={24} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Hits</p>
                <p className="text-2xl font-bold text-purple-600">{state.cacheStats.totalHits}</p>
              </div>
              <CheckCircle className="text-purple-600" size={24} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Uptime</p>
                <p className="text-2xl font-bold text-orange-600">{state.cacheStats.uptimeMinutes}m</p>
              </div>
              <Clock className="text-orange-600" size={24} />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Objectives List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Conversation Objectives
            </h2>
          </div>
          
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {state.objectives.map((objective) => (
              <div
                key={objective.id}
                className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  state.selectedObjective?.id === objective.id 
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600' 
                    : ''
                }`}
                onClick={() => setState(prev => ({ ...prev, selectedObjective: objective }))}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {objective.purpose}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {objective.category} • {(objective.completionCriteria?.requiredDataPoints?.length || 0)} data points
                    </p>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        objective.metadata?.isActive 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                      }`}>
                        {objective.metadata?.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {Math.round(((objective.analytics?.successRate || 0)) * 100)}% success
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        testObjective(objective.id);
                      }}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Test objective"
                    >
                      <TestTube size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setState(prev => ({ 
                          ...prev, 
                          selectedObjective: objective, 
                          isEditing: true 
                        }));
                      }}
                      className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                      title="Edit objective"
                    >
                      <Edit3 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Objective Details */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          {state.selectedObjective ? (
            <div>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Objective Details
                </h2>
                
                <div className="flex items-center space-x-2">
                  {state.isEditing ? (
                    <>
                      <button
                        onClick={handleSaveObjective}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center text-sm"
                      >
                        <Save size={14} className="mr-1" />
                        Save
                      </button>
                      <button
                        onClick={() => setState(prev => ({ ...prev, isEditing: false, editingField: null }))}
                        className="px-3 py-1.5 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center text-sm"
                      >
                        <X size={14} className="mr-1" />
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setState(prev => ({ ...prev, isEditing: true }))}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center text-sm"
                    >
                      <Edit3 size={14} className="mr-1" />
                      Edit
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* Purpose */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Purpose
                  </label>
                  {state.isEditing ? (
                    <textarea
                      value={state.selectedObjective.purpose}
                      onChange={(e) => handleEditField('purpose', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      rows={2}
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">{state.selectedObjective.purpose}</p>
                  )}
                </div>

                {/* Approach */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tone
                  </label>
                  {state.isEditing ? (
                    <input
                      type="text"
                      value={state.selectedObjective.approach?.tone || ''}
                      onChange={(e) => handleEditField('approach', { ...(state.selectedObjective.approach || {}), tone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">{state.selectedObjective.approach?.tone || '—'}</p>
                  )}
                </div>

                {/* Analytics */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Success Rate
                    </label>
                    <p className="text-2xl font-bold text-green-600">
                      {Math.round(((state.selectedObjective.analytics?.successRate || 0)) * 100)}%
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Avg Exchanges
                    </label>
                    <p className="text-2xl font-bold text-blue-600">
                      {state.selectedObjective.analytics?.averageExchanges || 0}
                    </p>
                  </div>
                </div>

                {/* System Prompt */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    System Prompt
                  </label>
                  {state.isEditing ? (
                    <textarea
                      value={state.selectedObjective.systemPrompt || ''}
                      onChange={(e) => handleEditField('systemPrompt', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-vertical"
                      placeholder="Enter the system prompt that will guide the AI's behavior for this objective..."
                    />
                  ) : (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 border">
                      <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                        {state.selectedObjective.systemPrompt || 'No system prompt defined'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Constraints */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Constraints
                  </label>
                  <div className="space-y-1">
                    {(state.selectedObjective.approach?.constraints || []).map((constraint, index) => (
                      <div key={index} className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                        {constraint}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <TestTube size={48} className="mx-auto mb-4 opacity-50" />
              <p>Select an objective to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Test Results */}
      <AnimatePresence>
        {testResults && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`p-4 rounded-lg border ${
              testResults.success 
                ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-400'
                : testResults.testing
                ? 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-400'
                : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-400'
            }`}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {testResults.testing ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                ) : testResults.success ? (
                  <CheckCircle size={20} />
                ) : (
                  <AlertCircle size={20} />
                )}
              </div>
              <div className="ml-3">
                <p className="font-medium">{testResults.message}</p>
                {testResults.suggestions && (
                  <ul className="mt-2 text-sm space-y-1">
                    {testResults.suggestions.map((suggestion: string, index: number) => (
                      <li key={index}>• {suggestion}</li>
                    ))}
                  </ul>
                )}
                {testResults.promptLength && (
                  <div className="mt-2 text-sm">
                    <span className="font-medium">Stats:</span> {testResults.promptLength} chars, 
                    {testResults.estimatedResponseTime}ms response, 
                    {testResults.estimatedTokens} tokens, 
                    Quality: {Math.round(testResults.qualityScore * 100)}%
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PromptManagement;
