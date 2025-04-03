# AWS SSO MCP Server

This project provides a Model Context Protocol (MCP) server that connects AI assistants (like Anthropic's Claude, Cursor AI, or other MCP-compatible clients) to AWS services using Single Sign-On (SSO) authentication. It enables AI models to interact with and manage your AWS resources through structured tools with simplified authentication.

### What is MCP and Why Use This Server?

Model Context Protocol (MCP) is an open standard enabling AI models to connect securely to external tools and data sources. This server implements the MCP standard with dedicated tools for AWS service management using SSO authentication.

**Benefits:**

- **AWS SSO Integration:** Connect your AI assistant to AWS services with seamless single sign-on, avoiding credential management.
- **Secure Execution:** Run AWS CLI commands using temporary credentials acquired through SSO, maintaining security best practices.
- **CLI Support:** Use the same tools as a command-line interface for scripting and testing.
- **Automatic Browser Authentication:** Handles browser launch and token polling automatically.

### Interface Philosophy: Simple Input, Rich Output

This server follows a "Minimal Interface, Maximal Detail" approach:

1. **Simple Tools:** Ask for only essential identifiers or parameters.
2. **Rich Details:** Provides comprehensive information in a well-formatted Markdown response.

## Available Tools

This MCP server provides the following tools for your AI assistant:

### Login (`login`)

**Purpose:** Initiates AWS SSO authentication, launches a browser for login, and automatically polls for token completion.

**Use When:** You need to authenticate with AWS SSO before accessing AWS resources, when credentials have expired, or as the first step in any AWS workflow.

**Conversational Example:** "Login to AWS SSO so I can access my resources."

**Parameter Example:** `{}` (no parameters needed) or `{ launchBrowser: false }` (to disable automatic browser launch).

### List Accounts (`list_accounts`)

**Purpose:** Lists all available AWS accounts and their roles accessible via AWS SSO.

**Use When:** After authenticating with SSO, when you need to see all available accounts and roles in one view, or to get an overview of your AWS SSO access permissions.

**Conversational Example:** "Show me all AWS accounts I have access to through SSO."

**Parameter Example:** `{}` (no parameters needed, requires prior login).

### Execute Command (`exec`)

**Purpose:** Executes AWS CLI commands with temporary credentials obtained via SSO, enabling secure AWS resource management.

**Use When:** You need to run AWS CLI commands with SSO credentials, access AWS resources without managing long-term credentials, or execute AWS operations from within the AI assistant.

**Conversational Example:** "List my S3 buckets in account 123456789012 using the ReadOnly role."

**Parameter Example:** `{ accountId: "123456789012", roleName: "ReadOnly", command: "aws s3 ls", region: "us-west-2" }`

**Complex Command Example:** `{ accountId: "123456789012", roleName: "ReadOnly", command: "aws ec2 describe-instances --filters \"Name=instance-state-name,Values=running\"", region: "us-west-2" }`

## Prerequisites

- **Node.js and npm:** Ensure you have Node.js (which includes npm) installed. Download from [nodejs.org](https://nodejs.org/).
- **AWS Account with SSO Configured:** You'll need an AWS account with SSO enabled and appropriate permissions.
- **AWS CLI v2:** For local SSO authentication setup.

## Quick Start Guide

Follow these steps to connect your AI assistant to this AWS SSO MCP server:

### Step 1: Configure AWS SSO

If you haven't already, set up AWS SSO in your AWS organization:

1. Enable AWS IAM Identity Center (successor to AWS SSO) in your AWS account
2. Configure your identity source (AWS SSO directory, Active Directory, or external IdP)
3. Set up permission sets and assign users to AWS accounts
4. Note your AWS SSO start URL - you'll need this for configuration

### Step 2: Configure the Server

#### Method A: Global MCP Config File (Recommended)

This keeps configurations separate and organized.

1. **Create the directory** (if needed): `~/.mcp/`
2. **Create/Edit the file:** `~/.mcp/configs.json`
3. **Add the configuration:** Paste the following JSON structure, replacing the placeholders:

    ```json
    {
    	"@aashari/mcp-server-aws-sso": {
    		"environments": {
    			"DEBUG": "true",
    			"AWS_REGION": "us-east-1",
    			"AWS_SSO_START_URL": "https://your-sso-portal.awsapps.com/start"
    		}
    	}
    }
    ```

#### Method B: Environment Variables (Alternative)

Set environment variables when running the server.

```bash
DEBUG=true AWS_REGION=us-east-1 AWS_SSO_START_URL=https://your-sso-portal.awsapps.com/start npx -y @aashari/mcp-server-aws-sso
```

### Step 3: Connect Your AI Assistant

Configure your MCP client (Claude Desktop, Cursor, etc.) to run this server.

#### Claude Desktop

1. Open Settings (gear icon) > Edit Config.
2. Add or merge into `mcpServers`:

    ```json
    {
    	"mcpServers": {
    		"aashari/mcp-server-aws-sso": {
    			"command": "npx",
    			"args": ["-y", "@aashari/mcp-server-aws-sso"]
    		}
    	}
    }
    ```

3. Save and **Restart Claude Desktop**.
4. **Verify:** Click the "Tools" (hammer) icon; the AWS SSO tools should be listed.

#### Cursor AI

1. Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) > **Cursor Settings > MCP**.
2. Click **+ Add new MCP server**.
3. Enter:
    - Name: `aashari/mcp-server-aws-sso`
    - Type: `command`
    - Command: `npx -y @aashari/mcp-server-aws-sso`
4. Click **Add**.
5. **Verify:** Wait for the indicator next to the server name to turn green.

### Step 4: Using the Tools

You can now ask your AI assistant AWS-related questions using AWS SSO authentication:

- "Login to AWS SSO."
- "Show me all AWS accounts I have access to."
- "Execute the 'aws s3 ls' command in my account 123456789012 with the ReadOnly role."
- "List EC2 instances in my dev account using the AdminRole."

#### Authentication with AWS SSO

```
// Start login with automatic browser launch
login()

// Start login without browser launch
login({ launchBrowser: false })

// After authenticating
list_accounts()  // Lists all available AWS accounts and their roles
```

#### Executing AWS CLI Commands

```
// Basic usage
exec({
  accountId: "123456789012",  // Your AWS account ID
  roleName: "ReadOnly",       // Role to assume
  command: "aws s3 ls"        // AWS CLI command to execute
})

// With region specification
exec({
  accountId: "123456789012",
  roleName: "AdminRole",
  command: "aws ec2 describe-instances",
  region: "us-west-2"  // Optional: specify region
})
```

## Using as a Command-Line Tool (CLI)

You can also use this package directly from your terminal:

### Quick Use with `npx`

No installation required - run directly using npx:

```bash
# Set required environment variables (replace with your values)
export AWS_SSO_START_URL=https://your-sso-portal.awsapps.com/start
export AWS_REGION=us-east-1

# Login to AWS SSO
npx -y @aashari/mcp-server-aws-sso login

# List available accounts and roles
npx -y @aashari/mcp-server-aws-sso list-accounts

# Execute AWS CLI command with SSO credentials
npx -y @aashari/mcp-server-aws-sso exec --account-id 123456789012 --role-name ReadOnly --command "aws s3 ls"
```

### Global Installation

For frequent use, you can install the package globally on your system:

1. **Install globally** using npm:

    ```bash
    npm install -g @aashari/mcp-server-aws-sso
    ```

2. **Verify installation** by checking the version:

    ```bash
    mcp-aws-sso --version
    ```

3. **Set required environment variables**:

    ```bash
    export AWS_SSO_START_URL=https://your-sso-portal.awsapps.com/start
    export AWS_REGION=us-east-1
    ```

4. **Use the commands** without npx prefix:

    ```bash
    # Login to AWS SSO
    mcp-aws-sso login

    # List available accounts and roles
    mcp-aws-sso list-accounts

    # Execute AWS CLI commands with SSO credentials
    mcp-aws-sso exec --account-id 123456789012 --role-name ReadOnly --command "aws s3 ls"

    # With region specification
    mcp-aws-sso exec --account-id 123456789012 --role-name AdminRole --command "aws lambda list-functions" --region us-east-1
    ```

### Configuration with Global Installation

When installed globally, you can still use the same configuration methods:

1. **Using environment variables** as shown above.

2. **Using global MCP config file** (recommended):
   Set up the `~/.mcp/configs.json` file as described in the Quick Start Guide.

## License

[ISC](https://opensource.org/licenses/ISC)
