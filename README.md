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

Authenticate with AWS SSO via browser.

```json
{}
```

_or:_

```json
{ "launchBrowser": false }
```

> "Login to AWS SSO so I can access my resources."

---

## `aws_ls_accounts`

List all AWS accounts and roles available via SSO.

```json
{}
```

> "Show me all AWS accounts I have access to through SSO."

---

## `aws_exec_cmd`

Execute AWS CLI commands using temporary credentials from AWS SSO.

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

# Command-Line Interface (CLI)

The CLI uses kebab-case for commands (e.g., `aws-sso-login`) and options (e.g., `--account-id`).

## Quick Use with `npx`

```bash
# Set required environment variables (replace with your values)
export AWS_SSO_START_URL=https://your-sso-portal.awsapps.com/start
export AWS_REGION=us-east-1

# Login to AWS SSO
npx -y @aashari/mcp-server-aws-sso aws-sso-login

# List available accounts and roles
npx -y @aashari/mcp-server-aws-sso aws-sso-list-accounts

# Execute AWS CLI command with SSO credentials
npx -y @aashari/mcp-server-aws-sso aws-sso-exec-command \
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
mcp-aws-sso aws-sso-login
```

## Discover More CLI Options

Use `--help` to see flags and usage for all available commands:

```bash
mcp-aws-sso --help
```

Or get detailed help for a specific command:

```bash
mcp-aws-sso aws-sso-login --help
mcp-aws-sso aws-sso-exec-command --help
mcp-aws-sso aws-sso-list-accounts --help
```

---

# License

[ISC License](https://opensource.org/licenses/ISC)
