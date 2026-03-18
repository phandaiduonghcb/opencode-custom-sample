# Use Node.js 18 Alpine as base image
FROM node:18-alpine

# Install system dependencies
# Git for repository operations
# Python3 and pip for Azure CLI
# curl for downloading tools
# bash for shell scripts
# kubectl for Kubernetes operations
# wget for healthcheck
RUN apk add --no-cache \
    git \
    python3 \
    py3-pip \
    curl \
    bash \
    ca-certificates \
    wget

# Install Azure CLI
RUN pip3 install --no-cache-dir azure-cli

# Install kubectl
RUN curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" \
    && chmod +x kubectl \
    && mv kubectl /usr/local/bin/

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install npm dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create workspace directory for workflow executions
RUN mkdir -p /tmp/workflows && chown node:node /tmp/workflows

# Switch to non-root user for security
USER node

# Expose port 3000
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]