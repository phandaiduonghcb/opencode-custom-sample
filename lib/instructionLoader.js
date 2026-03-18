import { readFile, readdir } from 'fs/promises';
import { join, basename } from 'path';

/**
 * Load instruction file content from workflows directory
 * @param {string} workflowName - Name of the workflow (e.g., 'fix-vulnerabilities')
 * @param {string} workflowsDir - Path to workflows directory
 * @returns {Promise<string>} - Instruction file content
 */
export async function loadInstructionFile(workflowName, workflowsDir = './workflows') {
  const instructionFileName = `${workflowName}-instructions.md`;
  const instructionFilePath = join(workflowsDir, instructionFileName);
  
  try {
    const content = await readFile(instructionFilePath, 'utf-8');
    return content;
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Instruction file not found: ${instructionFileName}`);
    }
    throw error;
  }
}

/**
 * Get the full path to an instruction file
 * @param {string} workflowName - Name of the workflow
 * @param {string} workflowsDir - Path to workflows directory
 * @returns {string} - Full path to instruction file
 */
export function getInstructionFilePath(workflowName, workflowsDir = './workflows') {
  return join(workflowsDir, `${workflowName}-instructions.md`);
}

/**
 * List all available workflows by scanning the workflows directory
 * @param {string} workflowsDir - Path to workflows directory
 * @returns {Promise<Array>} - Array of workflow names
 */
export async function listAvailableWorkflows(workflowsDir = './workflows') {
  try {
    const files = await readdir(workflowsDir);
    
    // Filter for instruction files and extract workflow names
    const workflows = files
      .filter(file => file.endsWith('-instructions.md'))
      .map(file => {
        // Remove '-instructions.md' suffix to get workflow name
        return basename(file, '-instructions.md');
      });
    
    return workflows;
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Workflows directory doesn't exist yet
      return [];
    }
    throw error;
  }
}

/**
 * Validate that an instruction file exists and is readable
 * @param {string} workflowName - Name of the workflow
 * @param {string} workflowsDir - Path to workflows directory
 * @returns {Promise<boolean>} - True if valid, false otherwise
 */
export async function validateInstructionFile(workflowName, workflowsDir = './workflows') {
  try {
    await loadInstructionFile(workflowName, workflowsDir);
    return true;
  } catch (error) {
    return false;
  }
}
