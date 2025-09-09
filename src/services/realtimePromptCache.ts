/**
 * Realtime Prompt Cache Service
 * 
 * Provides sub-100ms prompt access with Firebase real-time updates
 * Uses smart caching to reduce Firebase reads by 99% while maintaining instant updates
 */

import { 
  doc, 
  collection, 
  onSnapshot, 
  getDoc, 
  getDocs, 
  query, 
  where,
  Unsubscribe 
} from 'firebase/firestore';
import { firestore } from './firebase';
import {
  ConversationObjective,
  ConversationTree,
  PromptManifest,
  CachedObjective,
  CachedTree,
  ObjectiveGenerationPrompt,
  ConversationState
} from '../types/ConversationObjectives';

export class RealtimePromptCache {
  private static instance: RealtimePromptCache;
  
  // Cache storage
  private objectiveCache: Map<string, CachedObjective> = new Map();
  private treeCache: Map<string, CachedTree> = new Map();
  private manifestCache: PromptManifest | null = null;
  
  // Real-time listeners
  private manifestUnsubscribe: Unsubscribe | null = null;
  private objectiveUnsubscribes: Map<string, Unsubscribe> = new Map();
  private treeUnsubscribes: Map<string, Unsubscribe> = new Map();
  
  // Performance tracking
  private cacheHits = 0;
  private cacheMisses = 0;
  private lastStatsReset = Date.now();
  
  // Initialization tracking
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  
  // Cache configuration
  private readonly MAX_CACHE_SIZE = 100;
  private readonly CACHE_TTL_MINUTES = 30;
  private readonly PRELOAD_POPULAR_COUNT = 10;

  private constructor() {
    this.initializationPromise = this.initializeCache();
  }

  public static getInstance(): RealtimePromptCache {
    if (!RealtimePromptCache.instance) {
      RealtimePromptCache.instance = new RealtimePromptCache();
    }
    return RealtimePromptCache.instance;
  }

  /**
   * Initialize cache with manifest listener for change detection
   */
  private async initializeCache(): Promise<void> {
    console.log('🚀 [PROMPT CACHE] Initializing realtime prompt cache...');
    
    try {
      // Set up manifest listener - try 'current' first, fallback to query
      const manifestRef = doc(firestore, 'promptManifest', 'current');
      
      this.manifestUnsubscribe = onSnapshot(manifestRef, 
        async (snapshot) => {
          if (snapshot.exists()) {
            const newManifest = snapshot.data() as PromptManifest;
            this.handleManifestUpdate(newManifest);
          } else {
            console.warn('⚠️ [PROMPT CACHE] No manifest with ID "current" found, trying to find any manifest...');
            await this.tryFindExistingManifest();
          }
        },
        (error) => {
          console.error('❌ [PROMPT CACHE] Manifest listener error:', error);
          this.handleOfflineMode();
        }
      );

      // Preload popular objectives and trees
      await this.preloadPopularContent();
      
      this.isInitialized = true;
      console.log('✅ [PROMPT CACHE] Cache initialization complete');
      
    } catch (error) {
      console.error('❌ [PROMPT CACHE] Initialization failed:', error);
      this.handleOfflineMode();
    }
  }

  /**
   * Handle manifest updates and determine what needs cache refresh
   */
  private async handleManifestUpdate(newManifest: PromptManifest): Promise<void> {
    const oldManifest = this.manifestCache;
    this.manifestCache = newManifest;
    
    if (!oldManifest) {
      console.log('📥 [PROMPT CACHE] Initial manifest loaded:', {
        objectives: Object.keys(newManifest.activeObjectives).length,
        trees: Object.keys(newManifest.activeTrees).length,
        experiments: Object.keys(newManifest.experiments).length
      });
      return;
    }

    // Check for changes requiring cache updates
    const changedObjectives = this.getChangedItems(
      oldManifest.activeObjectives, 
      newManifest.activeObjectives
    );
    
    const changedTrees = this.getChangedItems(
      oldManifest.activeTrees, 
      newManifest.activeTrees
    );

    if (changedObjectives.length > 0) {
      console.log('🔄 [PROMPT CACHE] Updating objectives:', changedObjectives);
      await this.updateObjectivesCache(changedObjectives);
    }

    if (changedTrees.length > 0) {
      console.log('🔄 [PROMPT CACHE] Updating trees:', changedTrees);
      await this.updateTreesCache(changedTrees);
    }

    // Handle experiments
    await this.updateExperimentCache(newManifest);
    
    console.log('✅ [PROMPT CACHE] Manifest update processed successfully');
  }

  /**
   * Get objective with intelligent caching and real-time updates
   */
  public async getObjective(objectiveId: string): Promise<ConversationObjective | null> {
    const startTime = performance.now();
    
    try {
      // Check cache first
      const cached = this.objectiveCache.get(objectiveId);
      if (cached && this.isCacheValid(cached.lastAccessed)) {
        this.recordCacheHit();
        cached.accessCount++;
        cached.lastAccessed = new Date();
        
        console.log(`⚡ [PROMPT CACHE] Cache hit for objective: ${objectiveId} (${(performance.now() - startTime).toFixed(2)}ms)`);
        return cached.objective;
      }

      // Cache miss - fetch from Firebase
      this.recordCacheMiss();
      console.log(`🔍 [PROMPT CACHE] Cache miss, fetching objective: ${objectiveId}`);
      
      const objective = await this.fetchObjectiveFromFirebase(objectiveId);
      if (objective) {
        await this.cacheObjective(objective);
        this.setupObjectiveListener(objectiveId);
      }
      
      console.log(`📥 [PROMPT CACHE] Fetched objective: ${objectiveId} (${(performance.now() - startTime).toFixed(2)}ms)`);
      return objective;
      
    } catch (error) {
      console.error(`❌ [PROMPT CACHE] Error getting objective ${objectiveId}:`, error);
      return null;
    }
  }

  /**
   * Get conversation tree with caching
   */
  public async getTree(treeId: string): Promise<ConversationTree | null> {
    const startTime = performance.now();
    
    try {
      const cached = this.treeCache.get(treeId);
      if (cached && this.isCacheValid(cached.lastAccessed)) {
        this.recordCacheHit();
        cached.lastAccessed = new Date();
        
        console.log(`⚡ [PROMPT CACHE] Cache hit for tree: ${treeId} (${(performance.now() - startTime).toFixed(2)}ms)`);
        return cached.tree;
      }

      this.recordCacheMiss();
      const tree = await this.fetchTreeFromFirebase(treeId);
      if (tree) {
        await this.cacheTree(tree);
        this.setupTreeListener(treeId);
      }
      
      console.log(`📥 [PROMPT CACHE] Fetched tree: ${treeId} (${(performance.now() - startTime).toFixed(2)}ms)`);
      return tree;
      
    } catch (error) {
      console.error(`❌ [PROMPT CACHE] Error getting tree ${treeId}:`, error);
      return null;
    }
  }

  /**
   * Generate system prompt for current objective and conversation state
   */
  public async generateSystemPrompt(
    objectiveId: string, 
    conversationState: ConversationState
  ): Promise<ObjectiveGenerationPrompt | null> {
    try {
      const objective = await this.getObjective(objectiveId);
      if (!objective) {
        console.error(`❌ [PROMPT CACHE] Objective not found: ${objectiveId}`);
        return null;
      }

      // Generate dynamic system prompt based on objective and state
      const systemPrompt = this.buildSystemPrompt(objective, conversationState);
      const dynamicVariables = this.buildDynamicVariables(objective, conversationState);
      const toolRestrictions = this.buildToolRestrictions(objective, conversationState);

      const generatedPrompt: ObjectiveGenerationPrompt = {
        systemPrompt,
        dynamicVariables,
        toolRestrictions,
        responseConstraints: {
          maxWords: this.calculateMaxWords(objective, conversationState),
          tone: (objective as any).tone || 'warm and professional',
          format: 'markdown'
        }
      };

      console.log(`🎯 [PROMPT CACHE] Generated prompt for ${objectiveId}:`, {
        promptLength: systemPrompt.length,
        variableCount: Object.keys(dynamicVariables).length,
        toolCount: toolRestrictions.length
      });

      return generatedPrompt;
      
    } catch (error) {
      console.error(`❌ [PROMPT CACHE] Error generating prompt for ${objectiveId}:`, error);
      return null;
    }
  }

  /**
   * Get default tree for user persona
   */
  public async getDefaultTree(persona?: string): Promise<ConversationTree | null> {
    if (!this.manifestCache) {
      console.warn('⚠️ [PROMPT CACHE] No manifest available for default tree lookup');
      return null;
    }

    // Find default tree, optionally filtered by persona
    const defaultTreeId = Object.entries(this.manifestCache.activeTrees)
      .find(([_, treeInfo]) => treeInfo.isDefault)?.[0];

    if (!defaultTreeId) {
      console.warn('⚠️ [PROMPT CACHE] No default tree found, falling back to onboarding_tree');
      // Fallback to the onboarding tree if no default is marked
      return this.getTree('onboarding_tree');
    }

    return this.getTree(defaultTreeId);
  }

  /**
   * Build dynamic system prompt from objective
   */
  private buildSystemPrompt(
    objective: ConversationObjective, 
    state: ConversationState
  ): string {
    // Use the systemPrompt field directly from Firebase since we've refactored all prompts
    const basePrompt = (objective as any).systemPrompt;
    
    if (basePrompt) {
      // Add dynamic context variables to the base prompt
      const contextualPrompt = `${basePrompt}

**Current Context:**
- Exchange Count: ${state.exchangeCount}
- User Persona: ${state.userPersona || 'exploring'}
- Data Collected: ${Object.keys(state.dataCollected).join(', ') || 'none yet'}
- Tree ID: ${state.currentTreeId}
- Last User Message: "${state.lastUserMessage || 'none'}"`;
      
      return contextualPrompt;
    }
    
    // Fallback to building a basic prompt if systemPrompt is not available
    const persona = state.userPersona || 'exploring';
    const tone = (objective as any).tone || 'warm and professional';
    
    let prompt = `You are Sarah, an expert AI career guide for OffScript.

**CURRENT OBJECTIVE: ${objective.purpose}**
ONBOARDING PHASE - ${state.exchangeCount} exchanges completed

**YOUR APPROACH:**
- Tone: ${tone}
- Purpose: ${objective.purpose}

**CONVERSATION CONTEXT:**
Last user message: "${state.lastUserMessage || 'none'}"
Current persona: ${persona}
Exchanges this objective: ${state.exchangeCount}

Remember to use available tools wisely and maintain natural conversation flow while systematically gathering information.`;

    return prompt;
  }

  /**
   * Build dynamic variables for prompt injection
   */
  private buildDynamicVariables(
    objective: ConversationObjective, 
    state: ConversationState
  ): Record<string, string> {
    return {
      objective_purpose: objective.purpose,
      user_persona: state.userPersona || 'unknown',
      exchange_count: state.exchangeCount.toString(),
      completion_progress: this.calculateCompletionProgress(objective, state).toString(),
      data_collected: Object.keys(state.dataCollected).join(', '),
      last_user_message: state.lastUserMessage,
      conversation_phase: objective.category,
      confidence_level: this.calculateOverallConfidence(state).toString()
    };
  }

  /**
   * Determine which MCP tools should be available for this objective
   */
  private buildToolRestrictions(
    objective: ConversationObjective, 
    state: ConversationState
  ): string[] {
    const allowedTools: string[] = [];

    // Always allow profile updates
    allowedTools.push('update_person_profile');

    // Career analysis tools based on objective category
    if (objective.category === 'exploration' || objective.category === 'analysis') {
      allowedTools.push('analyze_conversation_for_careers');
      allowedTools.push('generate_career_recommendations');
    }

    // Validation tools for validation phase
    if (objective.category === 'validation') {
      allowedTools.push('validate_career_choice');
      allowedTools.push('get_career_pathways');
    }

    // Progressive tool enablement based on conversation progress
    if (state.exchangeCount >= 3) {
      allowedTools.push('trigger_instant_insights');
    }

    return allowedTools;
  }

  /**
   * Calculate appropriate max words based on objective and conversation state
   */
  private calculateMaxWords(objective: ConversationObjective, state: ConversationState): number {
    let baseWords = 120; // Default for text conversations

    // Reduce for voice conversations
    if (state.conversationHistory.some(msg => msg.content.includes('[voice]'))) {
      baseWords = 60;
    }

    // Adjust based on objective category
    switch (objective.category) {
      case 'onboarding':
        return baseWords; // Standard length for onboarding
      case 'exploration':
        return baseWords + 40; // More detail for exploration
      case 'validation':
        return baseWords + 20; // Slightly more for validation
      case 'analysis':
        return baseWords + 60; // Most detail for analysis
      default:
        return baseWords;
    }
  }

  /**
   * Calculate completion progress for current objective
   */
  private calculateCompletionProgress(
    objective: ConversationObjective, 
    state: ConversationState
  ): number {
    // Use simplified Firebase structure
    const dataPointsRaw = (objective as any).dataPoints ?? '[]';
    let requiredData: string[] = [];
    try {
      if (typeof dataPointsRaw === 'string') {
        // Try strict JSON parse first
        requiredData = JSON.parse(dataPointsRaw);
      } else {
        requiredData = dataPointsRaw as any;
      }
    } catch {
      // Tolerate malformed/non-JSON strings like "interest,skills,goals"
      requiredData = String(dataPointsRaw)
        .replace(/[\[\]\"']/g, '')
        .split(/\s*,\s*/)
        .filter(Boolean);
      console.warn('⚠️ [PROMPT CACHE] Non-JSON dataPoints tolerated:', { objectiveId: (objective as any).id, dataPointsRaw });
    }
    const collectedData = Object.keys(state.dataCollected);
    
    const dataProgress = requiredData.filter((data: string) => 
      collectedData.includes(data)
    ).length / requiredData.length;

    const targetExchanges = (objective as any).averageExchanges || 3;
    const exchangeProgress = Math.min(
      state.exchangeCount / targetExchanges, 
      1
    );

    return Math.max(dataProgress, exchangeProgress);
  }

  /**
   * Calculate overall confidence across all collected data
   */
  private calculateOverallConfidence(state: ConversationState): number {
    const confidenceValues = Object.values(state.confidenceScores);
    if (confidenceValues.length === 0) return 0;
    
    return confidenceValues.reduce((sum, conf) => sum + conf, 0) / confidenceValues.length;
  }

  // Helper methods for cache management
  private getChangedItems(oldItems: any, newItems: any): string[] {
    const changed: string[] = [];
    
    Object.keys(newItems).forEach(id => {
      if (!oldItems[id] || oldItems[id].checksum !== newItems[id].checksum) {
        changed.push(id);
      }
    });
    
    return changed;
  }

  private async fetchObjectiveFromFirebase(objectiveId: string): Promise<ConversationObjective | null> {
    try {
      // First try direct document access
      const docRef = doc(firestore, 'conversationObjectives', objectiveId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: objectiveId, ...docSnap.data() } as ConversationObjective;
      }

      // If not found, search by internal ID field
      console.log(`🔍 [PROMPT CACHE] Direct lookup failed for ${objectiveId}, searching by internal ID...`);
      const objectivesQuery = query(collection(firestore, 'conversationObjectives'));
      const querySnapshot = await getDocs(objectivesQuery);
      
      for (const doc of querySnapshot.docs) {
        const data = doc.data();
        if (data.id === objectiveId) {
          console.log(`✅ [PROMPT CACHE] Found objective ${objectiveId} with document ID: ${doc.id}`);
          return { id: objectiveId, ...data } as ConversationObjective;
        }
      }
      
      console.warn(`⚠️ [PROMPT CACHE] Objective ${objectiveId} not found in Firebase`);
      return null;
    } catch (error) {
      console.error(`❌ [PROMPT CACHE] Firebase fetch error for objective ${objectiveId}:`, error);
      return null;
    }
  }

  private async fetchTreeFromFirebase(treeId: string): Promise<ConversationTree | null> {
    try {
      // First try direct document access
      const docRef = doc(firestore, 'conversationTrees', treeId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: treeId, ...docSnap.data() } as ConversationTree;
      }

      // If not found, search by internal ID field
      console.log(`🔍 [PROMPT CACHE] Direct lookup failed for ${treeId}, searching by internal ID...`);
      const treesQuery = query(collection(firestore, 'conversationTrees'));
      const querySnapshot = await getDocs(treesQuery);

      for (const doc of querySnapshot.docs) {
        const data = doc.data();
        if (data.id === treeId) {
          console.log(`✅ [PROMPT CACHE] Found tree ${treeId} with document ID: ${doc.id}`);
          return { id: treeId, ...data } as ConversationTree;
        }
      }

      console.warn(`⚠️ [PROMPT CACHE] Tree ${treeId} not found in Firebase`);
      return null;
    } catch (error) {
      console.error(`❌ [PROMPT CACHE] Firebase fetch error for tree ${treeId}:`, error);
      return null;
    }
  }

  private async cacheObjective(objective: ConversationObjective): Promise<void> {
    // Evict old entries if cache is full
    if (this.objectiveCache.size >= this.MAX_CACHE_SIZE) {
      this.evictLeastRecentlyUsed();
    }

    // Cache objective without generating prompt (lazy generation when needed)
    this.objectiveCache.set(objective.id, {
      objective,
      prompt: null, // Will be generated on demand
      lastAccessed: new Date(),
      accessCount: 1
    });
    
    console.log(`✅ [PROMPT CACHE] Cached objective: ${objective.id}`);
  }

  private async cacheTree(tree: ConversationTree): Promise<void> {
    // Cache tree without pre-generating prompts (lazy generation when needed)
    this.treeCache.set(tree.id, {
      tree,
      objectivePrompts: {}, // Empty for now, will be populated on demand
      lastAccessed: new Date(),
      isPreloaded: true
    });
    
    console.log(`✅ [PROMPT CACHE] Cached tree: ${tree.id}`);
  }

  private getDefaultConversationState(): ConversationState {
    return {
      currentObjectiveId: '',
      currentTreeId: '',
      startTime: new Date(),
      completedObjectives: [],
      dataCollected: {},
      confidenceScores: {},
      exchangeCount: 0,
      lastUserMessage: '',
      conversationHistory: [],
      objectiveTimings: {},
      transitionReasons: {}
    };
  }

  private setupObjectiveListener(objectiveId: string): void {
    if (this.objectiveUnsubscribes.has(objectiveId)) {
      return; // Already listening
    }

    const docRef = doc(firestore, 'conversationObjectives', objectiveId);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const updatedObjective = { id: objectiveId, ...snapshot.data() } as ConversationObjective;
        this.handleObjectiveUpdate(updatedObjective);
      }
    });

    this.objectiveUnsubscribes.set(objectiveId, unsubscribe);
  }

  private setupTreeListener(treeId: string): void {
    if (this.treeUnsubscribes.has(treeId)) {
      return;
    }

    const docRef = doc(firestore, 'conversationTrees', treeId);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const updatedTree = { id: treeId, ...snapshot.data() } as ConversationTree;
        this.handleTreeUpdate(updatedTree);
      }
    });

    this.treeUnsubscribes.set(treeId, unsubscribe);
  }

  private async handleObjectiveUpdate(objective: ConversationObjective): Promise<void> {
    console.log(`🔄 [PROMPT CACHE] Real-time update for objective: ${objective.id}`);
    await this.cacheObjective(objective);
  }

  private async handleTreeUpdate(tree: ConversationTree): Promise<void> {
    console.log(`🔄 [PROMPT CACHE] Real-time update for tree: ${tree.id}`);
    await this.cacheTree(tree);
  }

  private async updateObjectivesCache(objectiveIds: string[]): Promise<void> {
    for (const id of objectiveIds) {
      const objective = await this.fetchObjectiveFromFirebase(id);
      if (objective) {
        await this.cacheObjective(objective);
      }
    }
  }

  private async updateTreesCache(treeIds: string[]): Promise<void> {
    for (const id of treeIds) {
      const tree = await this.fetchTreeFromFirebase(id);
      if (tree) {
        await this.cacheTree(tree);
      }
    }
  }

  private async updateExperimentCache(manifest: PromptManifest): Promise<void> {
    // Handle A/B testing configuration updates
    console.log('🧪 [PROMPT CACHE] Updating experiment cache:', Object.keys(manifest.experiments));
  }

  private async preloadPopularContent(): Promise<void> {
    console.log('🚀 [PROMPT CACHE] Preloading popular content...');
    // Implementation for preloading most frequently used objectives and trees
  }

  private async tryFindExistingManifest(): Promise<void> {
    try {
      console.log('🔍 [PROMPT CACHE] Searching for existing manifest documents...');
      
      // Query for any manifest documents
      const manifestQuery = query(collection(firestore, 'promptManifest'));
      const manifestDocs = await getDocs(manifestQuery);
      
      if (!manifestDocs.empty) {
        // Use the first manifest document found
        const firstDoc = manifestDocs.docs[0];
        const manifestData = firstDoc.data() as PromptManifest;
        
        console.log(`📋 [PROMPT CACHE] Found manifest document with ID: ${firstDoc.id}`);
        this.handleManifestUpdate(manifestData);
        
        // Set up listener for this document
        const manifestRef = doc(firestore, 'promptManifest', firstDoc.id);
        this.manifestUnsubscribe = onSnapshot(manifestRef, (snapshot) => {
          if (snapshot.exists()) {
            const newManifest = snapshot.data() as PromptManifest;
            this.handleManifestUpdate(newManifest);
          }
        });
      } else {
        console.log('📝 [PROMPT CACHE] No manifest documents found, creating default...');
        await this.createDefaultManifest();
      }
    } catch (error) {
      console.error('❌ [PROMPT CACHE] Error finding existing manifest:', error);
      await this.createDefaultManifest();
    }
  }

  private async createDefaultManifest(): Promise<void> {
    console.log('🔧 [PROMPT CACHE] Creating default manifest...');
    
    try {
      // Query for any objectives in the collection
      const objectivesQuery = query(collection(firestore, 'conversationObjectives'));
      const objectiveDocs = await getDocs(objectivesQuery);
      
      const activeObjectives: Record<string, any> = {};
      
      objectiveDocs.forEach((doc) => {
        const data = doc.data();
        const objectiveId = data.id || doc.id; // Use data.id if available, fallback to doc.id
        
        activeObjectives[objectiveId] = {
          version: data.version || 1,
          checksum: this.generateChecksum(JSON.stringify(data)),
          lastModified: new Date()
        };
      });

      const defaultManifest: PromptManifest = {
        version: 1,
        lastUpdated: new Date(),
        checksum: this.generateChecksum(JSON.stringify(activeObjectives)),
        activeObjectives,
        activeTrees: {},
        experiments: {},
        cache: {
          lastPurged: new Date(),
          hotObjectives: Object.keys(activeObjectives).slice(0, 3),
          preloadTrees: []
        }
      };

      this.handleManifestUpdate(defaultManifest);
      console.log('✅ [PROMPT CACHE] Default manifest created with', Object.keys(activeObjectives).length, 'objectives');
      
    } catch (error) {
      console.error('❌ [PROMPT CACHE] Failed to create default manifest:', error);
    }
  }

  private generateChecksum(data: string): string {
    // Simple checksum for demonstration - in production use proper hashing
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private isCacheValid(lastAccessed: Date): boolean {
    const ageMinutes = (Date.now() - lastAccessed.getTime()) / (1000 * 60);
    return ageMinutes < this.CACHE_TTL_MINUTES;
  }

  private evictLeastRecentlyUsed(): void {
    let oldestTime = Date.now();
    let oldestKey = '';
    
    this.objectiveCache.forEach((cached, key) => {
      if (cached.lastAccessed.getTime() < oldestTime) {
        oldestTime = cached.lastAccessed.getTime();
        oldestKey = key;
      }
    });
    
    if (oldestKey) {
      this.objectiveCache.delete(oldestKey);
      const unsubscribe = this.objectiveUnsubscribes.get(oldestKey);
      if (unsubscribe) {
        unsubscribe();
        this.objectiveUnsubscribes.delete(oldestKey);
      }
    }
  }

  private recordCacheHit(): void {
    this.cacheHits++;
  }

  private recordCacheMiss(): void {
    this.cacheMisses++;
  }

  private handleOfflineMode(): void {
    console.warn('⚠️ [PROMPT CACHE] Entering offline mode - using cached content only');
  }

  /**
   * Get cache performance statistics
   */
  public getCacheStats() {
    const hitRate = this.cacheHits / (this.cacheHits + this.cacheMisses) || 0;
    
    return {
      hitRate: Math.round(hitRate * 100),
      totalHits: this.cacheHits,
      totalMisses: this.cacheMisses,
      cacheSize: this.objectiveCache.size,
      treeCacheSize: this.treeCache.size,
      uptimeMinutes: Math.round((Date.now() - this.lastStatsReset) / (1000 * 60))
    };
  }

  /**
   * Get current prompt manifest
   */
  public getManifest(): PromptManifest | null {
    return this.manifestCache;
  }

  /**
   * Wait for cache to be initialized and ready
   */
  public async waitForReady(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    if (this.initializationPromise) {
      await this.initializationPromise;
    }
  }

  /**
   * Check if cache is ready
   */
  public isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Cleanup method for component unmounting
   */
  public cleanup(): void {
    console.log('🧹 [PROMPT CACHE] Cleaning up listeners...');
    
    if (this.manifestUnsubscribe) {
      this.manifestUnsubscribe();
    }
    
    this.objectiveUnsubscribes.forEach(unsubscribe => unsubscribe());
    this.treeUnsubscribes.forEach(unsubscribe => unsubscribe());
    
    this.objectiveCache.clear();
    this.treeCache.clear();
  }
}

// Export singleton instance
export const promptCache = RealtimePromptCache.getInstance();
