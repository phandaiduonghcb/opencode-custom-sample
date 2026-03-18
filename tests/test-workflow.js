import { createOpencodeClient } from '@opencode-ai/sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * End-to-end test for the vulnerability fix workflow
 * This script tests the complete workflow execution
 */

const BASE_URL = `http://localhost:${process.env.PORT || 3000}`;

async function testHealthEndpoint() {
  console.log('\n=== Testing Health Endpoint ===');
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    const data = await response.json();
    console.log('✓ Health check passed');
    console.log('  Status:', data.status);
    console.log('  Version:', data.version);
    console.log('  OpenCode:', JSON.stringify(data.opencode));
    console.log('  Azure:', JSON.stringify(data.azure));
    return true;
  } catch (error) {
    console.error('✗ Health check failed:', error.message);
    return false;
  }
}

async function testListWorkflows() {
  console.log('\n=== Testing List Workflows Endpoint ===');
  try {
    const response = await fetch(`${BASE_URL}/api/workflows`);
    const data = await response.json();
    console.log('✓ List workflows passed');
    console.log('  Available workflows:', data.workflows.length);
    data.workflows.forEach(w => {
      console.log(`    - ${w.name} (${w.endpoint})`);
    });
    return true;
  } catch (error) {
    console.error('✗ List workflows failed:', error.message);
    return false;
  }
}

async function testFixVulnerabilitiesWorkflow() {
  console.log('\n=== Testing Fix Vulnerabilities Workflow ===');
  
  // Test payload
  const payload = {
    prompt: 'Fix vulnerability in log4j package. Update log4j-core from version 2.14.0 to 2.17.1 to address CVE-2021-44228.',
    repositoryUrl: 'https://github.com/example/test-repo.git',
    targetBranch: 'develop'
  };
  
  try {
    console.log('Sending workflow request...');
    console.log('  Repository:', payload.repositoryUrl);
    console.log('  Target Branch:', payload.targetBranch);
    console.log('  Prompt:', payload.prompt.substring(0, 80) + '...');
    
    const response = await fetch(`${BASE_URL}/api/workflows/fix-vulnerabilities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('✗ Workflow request failed:', error);
      return false;
    }
    
    const data = await response.json();
    console.log('✓ Workflow started successfully');
    console.log('  Execution ID:', data.executionId);
    console.log('  Status:', data.status);
    console.log('  Message:', data.message);
    
    // Poll for status updates
    return await pollWorkflowStatus(data.executionId);
    
  } catch (error) {
    console.error('✗ Workflow execution failed:', error.message);
    return false;
  }
}

async function pollWorkflowStatus(executionId, maxAttempts = 20, intervalMs = 3000) {
  console.log('\n=== Polling Workflow Status ===');
  console.log(`  Execution ID: ${executionId}`);
  console.log(`  Max attempts: ${maxAttempts}`);
  console.log(`  Interval: ${intervalMs}ms`);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await new Promise(resolve => setTimeout(resolve, intervalMs));
      
      const response = await fetch(`${BASE_URL}/api/workflows/${executionId}/status`);
      
      if (!response.ok) {
        console.error(`✗ Status check failed (attempt ${attempt}/${maxAttempts})`);
        continue;
      }
      
      const data = await response.json();
      console.log(`\n[Attempt ${attempt}/${maxAttempts}] Status: ${data.status}`);
      
      if (data.logs && data.logs.length > 0) {
        const recentLogs = data.logs.slice(-3);
        console.log('  Recent logs:');
        recentLogs.forEach(log => {
          console.log(`    - ${log.message}`);
        });
      }
      
      // Check if workflow completed
      if (data.status === 'success') {
        console.log('\n✓ Workflow completed successfully!');
        if (data.result) {
          console.log('  Summary:', data.result.summary);
          if (data.result.changes && data.result.changes.length > 0) {
            console.log('  Changes:');
            data.result.changes.forEach(change => {
              console.log(`    - ${change}`);
            });
          }
        }
        console.log('  Duration:', Math.round(data.duration / 1000), 'seconds');
        console.log('  Iterations:', data.iterations);
        return true;
      }
      
      if (data.status === 'failed') {
        console.error('\n✗ Workflow failed!');
        if (data.result && data.result.errors) {
          console.error('  Errors:');
          data.result.errors.forEach(error => {
            console.error(`    - ${error}`);
          });
        }
        return false;
      }
      
      // Continue polling if still running
      if (data.status === 'running' || data.status === 'pending') {
        console.log('  Workflow still in progress...');
        continue;
      }
      
    } catch (error) {
      console.error(`✗ Error checking status (attempt ${attempt}/${maxAttempts}):`, error.message);
    }
  }
  
  console.error('\n✗ Workflow status polling timed out');
  return false;
}

async function testValidationErrors() {
  console.log('\n=== Testing Validation Errors ===');
  
  // Test missing required fields
  try {
    console.log('Testing missing required fields...');
    const response = await fetch(`${BASE_URL}/api/workflows/fix-vulnerabilities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    if (response.status === 400) {
      const error = await response.json();
      console.log('✓ Validation error handled correctly');
      console.log('  Error code:', error.error.code);
      console.log('  Error message:', error.error.message);
    } else {
      console.error('✗ Expected 400 status code, got:', response.status);
      return false;
    }
  } catch (error) {
    console.error('✗ Validation test failed:', error.message);
    return false;
  }
  
  // Test invalid URL
  try {
    console.log('\nTesting invalid repository URL...');
    const response = await fetch(`${BASE_URL}/api/workflows/fix-vulnerabilities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: 'Test',
        repositoryUrl: 'not-a-valid-url'
      })
    });
    
    if (response.status === 400) {
      const error = await response.json();
      console.log('✓ Invalid URL error handled correctly');
      console.log('  Error code:', error.error.code);
      console.log('  Error message:', error.error.message);
    } else {
      console.error('✗ Expected 400 status code, got:', response.status);
      return false;
    }
  } catch (error) {
    console.error('✗ Invalid URL test failed:', error.message);
    return false;
  }
  
  return true;
}

async function testNonExistentExecution() {
  console.log('\n=== Testing Non-Existent Execution ===');
  try {
    const response = await fetch(`${BASE_URL}/api/workflows/non-existent-id/status`);
    
    if (response.status === 400) {
      const error = await response.json();
      console.log('✓ Non-existent execution handled correctly');
      console.log('  Error code:', error.error.code);
      console.log('  Error message:', error.error.message);
      return true;
    } else {
      console.error('✗ Expected 400 status code, got:', response.status);
      return false;
    }
  } catch (error) {
    console.error('✗ Non-existent execution test failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  DevOps Automation System - End-to-End Test Suite        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nTesting server at: ${BASE_URL}`);
  
  const results = {
    health: false,
    listWorkflows: false,
    validation: false,
    nonExistent: false,
    workflow: false
  };
  
  // Run tests
  results.health = await testHealthEndpoint();
  results.listWorkflows = await testListWorkflows();
  results.validation = await testValidationErrors();
  results.nonExistent = await testNonExistentExecution();
  
  // Only run workflow test if basic tests pass
  if (results.health && results.listWorkflows) {
    console.log('\n⚠️  Note: The workflow test will execute a real workflow.');
    console.log('   This may take several minutes and requires proper Azure configuration.');
    console.log('   Set SKIP_WORKFLOW_TEST=true to skip this test.\n');
    
    if (process.env.SKIP_WORKFLOW_TEST !== 'true') {
      results.workflow = await testFixVulnerabilitiesWorkflow();
    } else {
      console.log('⊘ Skipping workflow test (SKIP_WORKFLOW_TEST=true)');
    }
  }
  
  // Print summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Test Summary                                             ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`  Health Check:           ${results.health ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`  List Workflows:         ${results.listWorkflows ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`  Validation Errors:      ${results.validation ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`  Non-Existent Execution: ${results.nonExistent ? '✓ PASS' : '✗ FAIL'}`);
  
  if (process.env.SKIP_WORKFLOW_TEST !== 'true') {
    console.log(`  Workflow Execution:     ${results.workflow ? '✓ PASS' : '✗ FAIL'}`);
  } else {
    console.log(`  Workflow Execution:     ⊘ SKIPPED`);
  }
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(r => r === true).length;
  const skippedTests = process.env.SKIP_WORKFLOW_TEST === 'true' ? 1 : 0;
  
  console.log('\n' + '─'.repeat(60));
  console.log(`  Total: ${totalTests} | Passed: ${passedTests} | Failed: ${totalTests - passedTests - skippedTests} | Skipped: ${skippedTests}`);
  console.log('─'.repeat(60) + '\n');
  
  // Exit with appropriate code
  const allPassed = passedTests === totalTests - skippedTests;
  process.exit(allPassed ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  console.error('\n✗ Test suite failed with error:', error);
  process.exit(1);
});
