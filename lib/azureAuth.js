import { exec } from 'child_process';
import { promisify } from 'util';
import { AuthenticationError } from './errorHandler.js';
import { logAzureCommand } from './logger.js';

const execAsync = promisify(exec);

/**
 * Azure CLI authentication and configuration manager
 */
export class AzureAuthManager {
  constructor(logger) {
    this.logger = logger;
    this.isAuthenticated = false;
    this.credentials = {
      clientId: process.env.AZURE_CLIENT_ID,
      clientSecret: process.env.AZURE_CLIENT_SECRET,
      tenantId: process.env.AZURE_TENANT_ID
    };
    this.devopsConfig = {
      organization: process.env.AZURE_DEVOPS_ORG,
      project: process.env.AZURE_DEVOPS_PROJECT
    };
  }

  /**
   * Validate that all required Azure credentials are present
   * @throws {AuthenticationError} If credentials are missing
   */
  validateCredentials() {
    const missing = [];
    
    if (!this.credentials.clientId) missing.push('AZURE_CLIENT_ID');
    if (!this.credentials.clientSecret) missing.push('AZURE_CLIENT_SECRET');
    if (!this.credentials.tenantId) missing.push('AZURE_TENANT_ID');
    
    if (missing.length > 0) {
      throw new AuthenticationError(
        `Missing required Azure credentials: ${missing.join(', ')}. ` +
        `Please set these environment variables in your .env file. ` +
        `See .env.example for reference.`,
        { missingCredentials: missing }
      );
    }
  }

  /**
   * Authenticate with Azure using service principal
   * @returns {Promise<void>}
   * @throws {AuthenticationError} If authentication fails
   */
  async login() {
    try {
      // Validate credentials first
      this.validateCredentials();
      
      this.logger.info('Authenticating with Azure using service principal');
      
      // Login using service principal
      const loginCommand = `az login --service-principal ` +
        `-u ${this.credentials.clientId} ` +
        `-p ${this.credentials.clientSecret} ` +
        `--tenant ${this.credentials.tenantId}`;
      
      logAzureCommand(this.logger, loginCommand);
      
      const { stderr } = await execAsync(loginCommand);
      
      if (stderr && !stderr.includes('WARNING')) {
        this.logger.warn('Azure login stderr', { stderr });
      }
      
      this.logger.info('Azure authentication successful');
      this.isAuthenticated = true;
      
      // Configure Azure DevOps defaults if provided
      await this.configureDevOpsDefaults();
      
    } catch (error) {
      this.isAuthenticated = false;
      
      // Provide clear error messages
      let errorMessage = 'Azure authentication failed: ';
      
      if (error.message.includes('az: command not found') || 
          error.message.includes('is not recognized')) {
        errorMessage += 'Azure CLI is not installed. Please install it from https://docs.microsoft.com/en-us/cli/azure/install-azure-cli';
      } else if (error.message.includes('AADSTS')) {
        errorMessage += 'Invalid credentials. Please verify your AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, and AZURE_TENANT_ID.';
      } else {
        errorMessage += error.message;
      }
      
      this.logger.error(errorMessage, { 
        error: error.message,
        stack: error.stack,
        clientId: this.credentials.clientId ? '***' : 'missing',
        tenantId: this.credentials.tenantId || 'missing'
      });
      
      throw new AuthenticationError(errorMessage, {
        clientId: this.credentials.clientId ? 'present' : 'missing',
        tenantId: this.credentials.tenantId || 'missing'
      });
    }
  }

  /**
   * Configure Azure DevOps defaults (organization and project)
   * @returns {Promise<void>}
   */
  async configureDevOpsDefaults() {
    try {
      if (!this.devopsConfig.organization || !this.devopsConfig.project) {
        this.logger.info('Azure DevOps configuration not provided, skipping defaults setup');
        return;
      }
      
      this.logger.info('Configuring Azure DevOps defaults', {
        organization: this.devopsConfig.organization,
        project: this.devopsConfig.project
      });
      
      const configCommand = `az devops configure --defaults ` +
        `organization=https://dev.azure.com/${this.devopsConfig.organization} ` +
        `project=${this.devopsConfig.project}`;
      
      await execAsync(configCommand);
      
      this.logger.info('Azure DevOps defaults configured successfully');
      
    } catch (error) {
      // Don't fail if DevOps configuration fails, just log warning
      this.logger.warn('Failed to configure Azure DevOps defaults', {
        error: error.message,
        organization: this.devopsConfig.organization,
        project: this.devopsConfig.project
      });
    }
  }

  /**
   * Check if Azure CLI is authenticated
   * @returns {Promise<boolean>}
   */
  async checkAuthentication() {
    try {
      await execAsync('az account show');
      this.isAuthenticated = true;
      return true;
    } catch (error) {
      this.isAuthenticated = false;
      return false;
    }
  }

  /**
   * Get authentication status for health checks
   * @returns {Promise<object>}
   */
  async getStatus() {
    try {
      const isAuth = await this.checkAuthentication();
      
      if (!isAuth) {
        return {
          authenticated: false,
          message: 'Not authenticated with Azure'
        };
      }
      
      const { stdout } = await execAsync('az account show');
      const account = JSON.parse(stdout);
      
      return {
        authenticated: true,
        tenantId: account.tenantId,
        subscriptionId: account.id,
        subscriptionName: account.name,
        devopsOrg: this.devopsConfig.organization || 'not configured',
        devopsProject: this.devopsConfig.project || 'not configured'
      };
    } catch (error) {
      return {
        authenticated: false,
        error: error.message
      };
    }
  }
}
