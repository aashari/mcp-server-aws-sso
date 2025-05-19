# AWS SSO MCP Server

This project provides a Model Context Protocol (MCP) server that connects AI assistants (like Anthropic's Claude, Cursor AI, or other MCP-compatible clients) to AWS services using Single Sign-On (SSO) authentication. It enables AI models to interact with and manage your AWS resources through structured tools with simplified authentication.

---

# Overview

## What is MCP?

Model Context Protocol (MCP) is an open standard that allows AI systems to securely and contextually connect with external tools and data sources.

This server implements MCP specifically for AWS SSO, bridging your AI assistants with AWS services using secure, temporary credentials.

## Why Use This Server?

- **Seamless AWS SSO Integration**: Connect to AWS with secure single sign-on, avoiding the need to manage or expose long-term credentials in your AI interactions.

- **Secure Credential Management**: Uses temporary credentials acquired through AWS SSO, following AWS security best practices with automatic credential rotation.

- **Multi-Account Access**: Easily discover and work with all AWS accounts and roles you have access to through your SSO configuration.

- **Full AWS CLI Support**: Execute any AWS CLI command directly through your AI assistant with proper authentication and credential management.

- **Automated Authentication Flow**: Handles browser launch and token polling automatically, making the authentication process simple and intuitive.

---

# Getting Started

## Prerequisites

- **Node.js** (>=18.x): [Download](https://nodejs.org/)
- **AWS Account with SSO Configured**: You need an AWS account with SSO enabled and appropriate permissions
- **AWS CLI v2**: For local SSO authentication setup

---

## Step 1: Configure AWS SSO

If you haven't already, set up AWS SSO in your AWS organization:

1. Enable AWS IAM Identity Center (successor to AWS SSO) in your AWS account
2. Configure your identity source (AWS SSO directory, Active Directory, or external IdP)
3. Set up permission sets and assign users to AWS accounts
4. Note your AWS SSO start URL - you'll need this for configuration

---

## Step 2: Configure Credentials

### Method A: MCP Config File (Recommended)

Create or edit `~/.mcp/configs.json`:

```json
{
	"aws-sso": {
		"environments": {
			"DEBUG": "true",
			"AWS_REGION": "us-east-1",
			"AWS_SSO_START_URL": "https://your-sso-portal.awsapps.com/start"
		}
	}
}
```

- `AWS_REGION`: Your primary AWS region (e.g., `us-east-1`)
- `AWS_SSO_START_URL`: Your AWS SSO portal URL

**Note:** For backward compatibility, the server will also recognize configurations under the full package name (`@aashari/mcp-server-aws-sso`) or the unscoped package name (`mcp-server-aws-sso`) if the `aws-sso` key is not found. However, using the short `aws-sso` key is recommended for new configurations.

### Method B: Environment Variables

Pass credentials directly when running the server:

```bash
DEBUG=true \
AWS_REGION=us-east-1 \
AWS_SSO_START_URL=https://your-sso-portal.awsapps.com/start \
npx -y @aashari/mcp-server-aws-sso
```

---

## Step 3: Connect Your AI Assistant

Configure your MCP-compatible client to launch this server.

**Claude / Cursor Configuration:**

```json
{
	"mcpServers": {
		"aws-sso": {
			"command": "npx",
			"args": ["-y", "@aashari/mcp-server-aws-sso"]
		}
	}
}
```

This configuration launches the server automatically at runtime.

---

# Tools

This section covers the MCP tools available when using this server with an AI assistant. Note that MCP tools use `snake_case` for tool names and `camelCase` for parameters.

## `aws_sso_login`

Initiates the AWS SSO device authorization flow to authenticate the user via browser interaction.

**Parameters:**

- `launchBrowser` (boolean, optional): Whether to launch the browser automatically. Default: `true`
- `autoPoll` (boolean, optional): Whether to automatically poll for authentication completion. Default: `true`

**Example:**

```json
{}
```

_or:_

```json
{
	"launchBrowser": false,
	"autoPoll": true
}
```

> "Login to AWS SSO so I can access my resources."

---

## `aws_sso_status`

Checks the current AWS SSO authentication status by verifying if a valid cached token exists and its expiration time.

**Parameters:**

- No parameters required. The tool checks the authentication status of the current session.

**Example:**

```json
{}
```

> "Check if I'm currently authenticated to AWS SSO."

---

## `aws_sso_ls_accounts`

Lists ALL AWS accounts and associated roles accessible via AWS SSO. Requires prior authentication via `aws_sso_login`.

**Parameters:**

- No parameters required. The tool fetches all accounts and roles accessible to the authenticated user.

**Example:**

```json
{}
```

> "Show me all AWS accounts I have access to through SSO."

---

## `aws_sso_exec_command`

Executes AWS CLI commands using temporary credentials from AWS SSO for a specific account and role.

**Parameters:**

- `accountId` (string, required): AWS account ID (12-digit number)
- `roleName` (string, required): AWS role name to assume via SSO
- `command` (string, required): AWS CLI command to execute (e.g., "aws s3 ls")
- `region` (string, optional): AWS region to use

**Example:**

```json
{
	"accountId": "123456789012",
	"roleName": "ReadOnly",
	"command": "aws s3 ls"
}
```

_or:_

```json
{
	"accountId": "123456789012",
	"roleName": "AdminRole",
	"command": "aws ec2 describe-instances",
	"region": "us-west-2"
}
```

> "List my S3 buckets in account 123456789012 using the ReadOnly role."

---

# Tool Response Format

All AWS SSO MCP tools return their responses as formatted Markdown text within the tool's content field. This ensures a consistent and comprehensive user experience. Each tool's response includes all necessary information in the text itself:

## `aws_sso_login` Responses

The response includes:
- Authentication status (already logged in, authentication started, or success)
- Session details (expiration time and duration if authenticated)
- Verification code and URL (if authentication is started)
- Browser launch status (if authentication is started)
- Instructions for next steps

## `aws_sso_status` Responses

The response includes:
- Current authentication status (authenticated or not)
- Session details (expiration time and duration if authenticated)
- Instructions for next steps based on the status

## `aws_sso_ls_accounts` Responses

The response includes:
- Authentication session status and expiration
- Complete list of available accounts with their IDs, names, and emails
- Available roles for each account
- Usage instructions for executing commands with these accounts/roles
- Message if no accounts are found, with troubleshooting guidance

## `aws_sso_exec_command` Responses

**Success Example:**
```markdown
# AWS SSO: Command Result

**Account/Role:** 123456789012/ReadOnly
**Region:** us-east-1 (Default: ap-southeast-1)

## Command
```bash
aws s3 ls
```

## Output
```
2023-01-15 08:42:53 my-bucket-1
2023-05-22 14:18:19 my-bucket-2
2024-02-10 11:05:37 my-logs-bucket
```

*Executed: 2025-05-19 06:21:49 UTC*
```

**Error Example:**
```markdown
# ❌ AWS SSO: Command Error

**Account/Role:** 123456789012/ReadOnly
**Region:** us-east-1 (Default: ap-southeast-1)

## Command
```bash
aws s3api get-object --bucket restricted-bucket --key secret.txt output.txt
```

## Error: Permission Denied
The role `ReadOnly` does not have permission to execute this command.

## Error Details
```
An error occurred (AccessDenied) when calling the GetObject operation: Access Denied
```

### Troubleshooting
#### Available Roles
- AdminAccess
- PowerUserAccess
- S3FullAccess

Try executing the command again using one of the roles listed above that has appropriate permissions.

*Executed: 2025-05-19 06:17:49 UTC*
```

## `aws_sso_ec2_exec_command` Responses

**Success Example:**
```markdown
# AWS SSO: EC2 Command Result

**Instance:** i-0a69e80761897dcce (elasticsearch-warm-03)
**Account/Role:** 719802944938/InfraOps@ALL 
**Region:** ap-southeast-1 (Default: ap-southeast-3)

## Command
```bash
uptime && df -h
```

## Output
```
06:21:47 up 37 days, 18:07,  0 users,  load average: 0.86, 0.78, 0.79
Filesystem       Size  Used Avail Use% Mounted on
/dev/root         97G   11G   87G  11% /
/dev/nvme1n1      16T   12T  3.6T  77% /data
```

*Command ID: 6db5b4d5-afa7-46e4-a4d6-d950246b7e1a*
*Executed: 2025-05-19 06:21:49 UTC*
```

**Error Example:**
```markdown
# ❌ AWS SSO: EC2 Command Error

**Instance:** i-0a69e80761897dcce
**Account/Role:** 719802944938/InfraOps@ALL 
**Region:** ap-southeast-3 (Default: ap-southeast-3)

## Command
```bash
hostname
```

## Error: Instance not found
Instance i-0a69e80761897dcce not found or not connected to SSM. Ensure the instance is running and has the SSM Agent installed.

### Troubleshooting
- Check if the instance exists in the specified region
- Verify the instance is in a running state
- Confirm SSM Agent is installed and running
- Ensure your role has permission to use SSM

*Command ID: b15f9c64-8a13-4d03-9a15-78c26d481bfc*
*Executed: 2025-05-19 06:17:49 UTC*
```

The AI assistant can parse this formatted text to extract the specific information needed for subsequent interactions.

---

# Command-Line Interface (CLI)

The CLI uses kebab-case for commands (e.g., `login`) and options (e.g., `--account-id`).

## Quick Use with `npx`

```bash
# Set required environment variables (replace with your values)
export AWS_SSO_START_URL=https://your-sso-portal.awsapps.com/start
export AWS_REGION=us-east-1

# Login to AWS SSO
npx -y @aashari/mcp-server-aws-sso login

# Check authentication status
npx -y @aashari/mcp-server-aws-sso status

# List available accounts and roles
npx -y @aashari/mcp-server-aws-sso ls-accounts

# Execute AWS CLI command with SSO credentials
npx -y @aashari/mcp-server-aws-sso exec-command \
  --account-id 123456789012 \
  --role-name ReadOnly \
  --command "aws s3 ls"
```

## Install Globally

```bash
npm install -g @aashari/mcp-server-aws-sso
```

Then run directly:

```bash
mcp-aws-sso login
mcp-aws-sso ls-accounts
mcp-aws-sso exec-command --account-id 123456789012 --role-name ReadOnly --command "aws s3 ls"
```

## Available Commands

The following CLI commands are available:

### `login`

Authenticate with AWS SSO via browser, automatically polling for completion.

```bash
mcp-aws-sso login [options]

Options:
  --no-launch-browser   Disable automatic browser launch for authentication (default: browser launch enabled)
  --no-auto-poll        Disable automatic polling for token completion (default: polling enabled)
```

### `status`

Check the current AWS SSO authentication status.

```bash
mcp-aws-sso status
```

### `ls-accounts`

List all AWS accounts and associated roles accessible via AWS SSO.

```bash
mcp-aws-sso ls-accounts
```

### `exec-command`

Execute an AWS CLI command using temporary credentials from AWS SSO for a specific account/role.

```bash
mcp-aws-sso exec-command [options]

Options:
  --account-id <id>    AWS account ID (12-digit number) (required)
  --role-name <role>   AWS role name to assume via SSO (required)
  --region <region>    AWS region to use (optional)
  --command <command>  AWS CLI command to execute (e.g., "aws s3 ls") (required)
```

## Discover More CLI Options

Use `--help` to see flags and usage for all available commands:

```bash
mcp-aws-sso --help
```

Or get detailed help for a specific command:

```bash
mcp-aws-sso login --help
mcp-aws-sso status --help
mcp-aws-sso ls-accounts --help
mcp-aws-sso exec-command --help
```

---

# License

[ISC License](https://opensource.org/licenses/ISC)
