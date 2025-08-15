#!/usr/bin/env node

/**
 * Manual script to merge existing enhanced career data from enhancedCareerCards 
 * back to threadCareerGuidance collection for user-facing display
 */

import { dashboardCareerEnhancer } from '../src/services/dashboardCareerEnhancer.js';

async function main() {
  try {
    console.log('🚀 Starting enhanced career data merge process...');
    console.log('');
    
    // Run the manual merge
    const result = await dashboardCareerEnhancer.mergeExistingEnhancedData();
    
    console.log('');
    console.log('📊 Merge Results:');
    console.log(`✅ Successfully merged: ${result.merged} career cards`);
    console.log(`❌ Errors encountered: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.log('');
      console.log('🔍 Error Details:');
      result.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    console.log('');
    console.log('🎉 Enhanced career data merge process completed!');
    console.log('');
    console.log('ℹ️  What this does:');
    console.log('   - Finds enhanced data stored in enhancedCareerCards collection');
    console.log('   - Merges it back to threadCareerGuidance for user-facing display');  
    console.log('   - Fixes the issue where users see incomplete enhanced data');
    console.log('');
    
    process.exit(result.errors.length > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

main();
