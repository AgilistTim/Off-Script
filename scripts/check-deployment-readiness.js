#!/usr/bin/env node

// Deployment readiness check script
// Run with: node scripts/check-deployment-readiness.js

import fs from 'fs';
import path from 'path';

console.log('🔍 Checking deployment readiness...\n');

// Required environment variables for production
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

// Optional but recommended environment variables
const optionalEnvVars = [
  'VITE_FIREBASE_MEASUREMENT_ID',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD'
];

// Files that should exist
const requiredFiles = [
  'Dockerfile',
  'docker-compose.yml',
  'docker-entrypoint.sh',
  'nginx.conf',
  'public/environment.template.js',
  '.dockerignore',
  'env.example'
];

// Files that should NOT exist in production
const forbiddenFiles = [
  '.env',
  '.env.local',
  'public/environment.js'
];

let hasErrors = false;
let hasWarnings = false;

// Check required files
console.log('📁 Checking required files...');
for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    hasErrors = true;
  }
}

// Check forbidden files (should not be in repo)
console.log('\n🚫 Checking for files that should not be in repository...');
for (const file of forbiddenFiles) {
  if (fs.existsSync(file)) {
    console.log(`⚠️  ${file} - Should not be in repository (contains secrets)`);
    hasWarnings = true;
  } else {
    console.log(`✅ ${file} - Correctly excluded`);
  }
}

// Check .gitignore
console.log('\n📝 Checking .gitignore...');
if (fs.existsSync('.gitignore')) {
  const gitignore = fs.readFileSync('.gitignore', 'utf8');
  const requiredIgnores = ['.env', '.env.local', 'public/environment.js'];
  
  for (const ignore of requiredIgnores) {
    if (gitignore.includes(ignore)) {
      console.log(`✅ .gitignore includes ${ignore}`);
    } else {
      console.log(`❌ .gitignore missing ${ignore}`);
      hasErrors = true;
    }
  }
} else {
  console.log('❌ .gitignore file not found');
  hasErrors = true;
}

// Check Docker setup
console.log('\n🐳 Checking Docker configuration...');
if (fs.existsSync('Dockerfile')) {
  const dockerfile = fs.readFileSync('Dockerfile', 'utf8');
  
  if (dockerfile.includes('NODE_ENV=production')) {
    console.log('✅ Dockerfile sets NODE_ENV=production');
  } else {
    console.log('⚠️  Dockerfile should set NODE_ENV=production');
    hasWarnings = true;
  }
  
  if (dockerfile.includes('HEALTHCHECK')) {
    console.log('✅ Dockerfile includes health check');
  } else {
    console.log('⚠️  Dockerfile should include health check');
    hasWarnings = true;
  }
}

// Check template file
console.log('\n📋 Checking environment template...');
if (fs.existsSync('public/environment.template.js')) {
  const template = fs.readFileSync('public/environment.template.js', 'utf8');
  
  let templateValid = true;
  for (const envVar of requiredEnvVars) {
    const placeholder = `__${envVar.replace('VITE_', '')}__`;
    if (template.includes(placeholder)) {
      console.log(`✅ Template includes ${placeholder}`);
    } else {
      console.log(`❌ Template missing ${placeholder}`);
      hasErrors = true;
      templateValid = false;
    }
  }
  
  if (templateValid) {
    console.log('✅ Environment template is properly configured');
  }
} else {
  console.log('❌ Environment template not found');
  hasErrors = true;
}

// Check script configuration
console.log('\n🔧 Checking script configuration...');
const scriptFiles = [
  'scripts/populateFirestore.js',
  'scripts/ensureAdminUser.js',
  'scripts/checkUserRole.js'
];

for (const scriptFile of scriptFiles) {
  if (fs.existsSync(scriptFile)) {
    const script = fs.readFileSync(scriptFile, 'utf8');
    
    if (script.includes('process.env.VITE_FIREBASE_API_KEY') || script.includes('from \'./firebaseConfig.js\'')) {
      console.log(`✅ ${scriptFile} uses environment variables`);
    } else if (script.includes('AIzaSy') || script.includes('firebase.com')) {
      console.log(`❌ ${scriptFile} contains hardcoded credentials`);
      hasErrors = true;
    } else {
      console.log(`⚠️  ${scriptFile} configuration unclear`);
      hasWarnings = true;
    }
  }
}

// Environment variables guidance
console.log('\n🌍 Environment Variables for Render Deployment:');
console.log('Set these in your Render service environment variables:');
console.log('');

for (const envVar of requiredEnvVars) {
  console.log(`${envVar}=your_actual_value_here`);
}

console.log('\nOptional but recommended:');
for (const envVar of optionalEnvVars) {
  console.log(`${envVar}=your_actual_value_here`);
}

// Summary
console.log('\n📊 Summary:');
if (hasErrors) {
  console.log('❌ DEPLOYMENT BLOCKED: Critical issues found that must be fixed before deployment');
  console.log('Please resolve the errors above before deploying to production.');
  process.exit(1);
} else if (hasWarnings) {
  console.log('⚠️  DEPLOYMENT READY WITH WARNINGS: Consider addressing the warnings above');
  console.log('Deployment can proceed, but resolving warnings will improve security/reliability.');
  process.exit(0);
} else {
  console.log('✅ DEPLOYMENT READY: All checks passed');
  console.log('Your application is ready for secure deployment to Render.');
  process.exit(0);
} 