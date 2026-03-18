/**
 * Integration Verification Script
 * Checks that all components are properly wired together
 */

import { readdir, access } from 'fs/promises';
import { join } from 'path';
import { constants } from 'fs';

const checks = [];
let passed = 0;
let failed = 0;

function check(name, condition, details = '') {
  checks.push({ name, passed: condition, details });
  if (condition) {
    console.log(`✓ ${name}`);
    passed++;
  } else {
    console.log(`✗ ${name}`);
    if (details) console.log(`  ${details}`);
    failed++;
  }
}

async function fileExists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function verifyIntegration() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  DevOps Automation System - Integration Verification     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Check core files
  console.log('Core Application Files:');
  check('server.js exists', await fileExists('server.js'));
  check('package.json exists', await fileExists('package.json'));
  check('.env.example exists', await fileExists('.env.example'));
  check('Dockerfile exists', await fileExists('Dockerfile'));
  check('docker-compose.yml exists', await fileExists('docker-compose.yml'));
  
  console.log('\nLibrary Files:');
  check('OpenCodeExecutor exists', await fileExists('lib/OpenCodeExecutor.js'));
  check('WorkflowExecution exists', await fileExists('lib/WorkflowExecution.js'));
  check('azureAuth exists', await fileExists('lib/azureAuth.js'));
  check('errorHandler exists', await fileExists('lib/errorHandler.js'));
  check('logger exists', await fileExists('lib/logger.js'));
  check('instructionLoader exists', await fileExists('lib/instructionLoader.js'));
  
  console.log('\nWorkflow Files:');
  const workflowsExist = await fileExists('workflows');
  check('workflows directory exists', workflowsExist);
  
  if (workflowsExist) {
    try {
      const files = await readdir('workflows');
      const instructionFiles = files.filter(f => f.endsWith('-instructions.md'));
      check(`Found ${instructionFiles.length} instruction file(s)`, instructionFiles.length > 0);
      instructionFiles.forEach(file => {
        console.log(`  - ${file}`);
      });
    } catch (error) {
      check('Read workflows directory', false, error.message);
    }
  }
  
  console.log('\nHelper Scripts:');
  check('parse-vulnerability-prompt.sh exists', await fileExists('scripts/parse-vulnerability-prompt.sh'));
  check('check-deployment-health.sh exists', await fileExists('scripts/check-deployment-health.sh'));
  
  console.log('\nTest Files:');
  check('test-workflow.js exists', await fileExists('test-workflow.js'));
  check('test-docker.ps1 exists', await fileExists('test-docker.ps1'));
  check('test-docker.sh exists', await fileExists('test-docker.sh'));
  
  console.log('\nDocumentation:');
  check('README.md exists', await fileExists('README.md'));
  check('TESTING.md exists', await fileExists('TESTING.md'));
  check('AGENTS.md exists', await fileExists('AGENTS.md'));
  check('API_DOCUMENTATION.md exists', await fileExists('API_DOCUMENTATION.md'));
  check('swagger.js exists', await fileExists('swagger.js'));
  
  console.log('\nEnvironment Configuration:');
  const envExists = await fileExists('.env');
  check('.env file exists', envExists, envExists ? '' : 'Run: cp .env.example .env');
  
  // Check package.json scripts
  console.log('\nPackage Scripts:');
  try {
    const { readFile } = await import('fs/promises');
    const pkgContent = await readFile('package.json', 'utf-8');
    const pkg = JSON.parse(pkgContent);
    check('start script defined', !!pkg.scripts.start);
    check('test script defined', !!pkg.scripts.test);
    check('test:docker script defined', !!pkg.scripts['test:docker']);
  } catch (error) {
    check('Read package.json', false, error.message);
  }
  
  // Check dependencies
  console.log('\nDependencies:');
  try {
    await import('@opencode-ai/sdk');
    check('@opencode-ai/sdk installed', true);
  } catch {
    check('@opencode-ai/sdk installed', false, 'Run: npm install');
  }
  
  try {
    await import('express');
    check('express installed', true);
  } catch {
    check('express installed', false, 'Run: npm install');
  }
  
  try {
    await import('dotenv');
    check('dotenv installed', true);
  } catch {
    check('dotenv installed', false, 'Run: npm install');
  }
  
  try {
    await import('winston');
    check('winston installed', true);
  } catch {
    check('winston installed', false, 'Run: npm install');
  }
  
  try {
    await import('swagger-ui-express');
    check('swagger-ui-express installed', true);
  } catch {
    check('swagger-ui-express installed', false, 'Run: npm install');
  }
  
  try {
    await import('swagger-jsdoc');
    check('swagger-jsdoc installed', true);
  } catch {
    check('swagger-jsdoc installed', false, 'Run: npm install');
  }
  
  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log(`Total Checks: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log('═'.repeat(60));
  
  if (failed === 0) {
    console.log('\n✓ All integration checks passed!');
    console.log('\nNext steps:');
    console.log('  1. Configure .env with your credentials');
    console.log('  2. Start the server: npm start');
    console.log('  3. Run tests: npm test');
    console.log('  4. Build Docker: npm run test:docker');
    return 0;
  } else {
    console.log('\n✗ Some integration checks failed.');
    console.log('Please fix the issues above before proceeding.');
    return 1;
  }
}

verifyIntegration()
  .then(code => process.exit(code))
  .catch(error => {
    console.error('\n✗ Verification failed with error:', error);
    process.exit(1);
  });
