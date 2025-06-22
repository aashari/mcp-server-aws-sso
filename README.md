# AWS SSO MCP Server

A Node.js/TypeScript Model Context Protocol (MCP) server for AWS Single Sign-On (SSO). Enables AI systems (e.g., LLMs like Claude or Cursor AI) to securely interact with AWS resources by initiating SSO login, listing accounts/roles, and executing AWS CLI commands using temporary credentials.

[![NPM Version](https://img.shields.io/npm/v/@aashari/mcp-server-aws-sso)](https://www.npmjs.com/package/@aashari/mcp-server-aws-sso)
[![Build Status](https://img.shields.io/github/workflow/status/aashari/mcp-server-aws-sso/CI)](https://github.com/aashari/mcp-server-aws-sso/actions)

## Why Use This Server?

- **Seamless SSO Integration**: Authenticate via AWS SSO device flow, avoiding long-term credential exposure.
- **Secure Credential Management**: Uses temporary credentials with automatic rotation.
- **Multi-Account Support**: Discover and manage all AWS accounts/roles accessible via SSO.
- **AWS CLI Compatibility**: Execute any AWS CLI command securely through AI or CLI interfaces.
- **Automated Authentication**: Simplifies login with browser launch and token polling.

## What is MCP?

Model Context Protocol (MCP) is an open standard for securely connecting AI systems to external tools and data sources. This server implements MCP for AWS SSO, enabling AI assistants to manage AWS resources programmatically.

## Prerequisites

- **Node.js** (>=18.x): [Download](https://nodejs.org/)
- **AWS CLI v2**: [Install](https://aws.amazon.com/cli/)
- **AWS Account with SSO Configured**: Ensure AWS IAM Identity Center is enabled with permission sets and user assignments.

## Setup

### Step 1: Configure AWS SSO

1. Enable AWS IAM Identity Center in your AWS account.
2. Set up your identity source (e.g., AWS SSO directory, Active Directory, or external IdP).
3. Configure permission sets and assign users to AWS accounts.
4. Note your **AWS SSO Start URL** (e.g., `https://your-sso-portal.awsapps.com/start`).

### Step 2: Configure Credentials

#### Option A: MCP Config File (Recommended)

Edit or create `~/.mcp/configs.json`:

```json
{
	"aws-sso": {
		"environments": {
			"AWS_REGION": "us-east-1",
			"AWS_SSO_START_URL": "https://your-sso-portal.awsapps.com/start",
			"DEBUG": "true"
		}
	}
}
```

#### Option B: Environment Variables

```bash
export AWS_REGION=us-east-1
export AWS_SSO_START_URL=https://your-sso-portal.awsapps.com/start
export DEBUG=true
```

### Step 3: Install and Run

#### Quick Start with `npx`

```bash
npx -y @aashari/mcp-server-aws-sso login
```

#### Global Installation

```bash
npm install -g @aashari/mcp-server-aws-sso
mcp-aws-sso login
```

### Step 4: Connect to AI Assistant

Configure your MCP-compatible client (e.g., Claude, Cursor AI):

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

## MCP Tools

MCP tools use `snake_case` names, `camelCase` parameters, and return Markdown-formatted responses.

- **aws_sso_login**: Initiates AWS SSO device authorization (`launchBrowser`: bool opt, `autoPoll`: bool opt). Use: Log in to AWS SSO.
- **aws_sso_status**: Checks SSO authentication status (no params). Use: Verify authentication.
- **aws_sso_ls_accounts**: Lists accessible AWS accounts/roles (no params). Use: Discover accounts.
- **aws_sso_exec_command**: Executes AWS CLI command with temporary credentials (`accountId`: str req, `roleName`: str req, `command`: str req, `region`: str opt). Use: Run `aws s3 ls`.
- **aws_sso_ec2_exec_command**: Runs shell commands on EC2 via SSM (`instanceId`: str req, `accountId`: str req, `roleName`: str req, `command`: str req, `region`: str opt). Use: Check EC2 disk space.

<details>
<summary><b>MCP Tool Examples (Click to expand)</b></summary>

### `aws_sso_login`

**Basic Login:**
```json
{}
```

**Custom Login Options:**
```json
{
  "launchBrowser": false,
  "autoPoll": true
}
```

### `aws_sso_status`

**Check Authentication Status:**
```json
{}
```

### `aws_sso_ls_accounts`

**List All Accounts and Roles:**
```json
{}
```

### `aws_sso_exec_command`

**List S3 Buckets:**
```json
{
  "accountId": "123456789012", 
  "roleName": "ReadOnly",
  "command": "aws s3 ls"
}
```

**Describe EC2 Instances in a Specific Region:**
```json
{
  "accountId": "123456789012",
  "roleName": "AdminRole",
  "command": "aws ec2 describe-instances --query 'Reservations[*].Instances[*].[InstanceId,State.Name,InstanceType]' --output table",
  "region": "us-west-2"
}
```

### `aws_sso_ec2_exec_command`

**Check System Resources:**
```json
{
  "instanceId": "i-0a69e80761897dcce",
  "accountId": "123456789012",
  "roleName": "InfraOps",
  "command": "uptime && df -h && free -m"
}
```

</details>

## Transport Modes

This server supports two transport modes for different integration scenarios:

### STDIO Transport (Default for MCP Clients)
- Traditional subprocess communication via stdin/stdout
- Ideal for local AI assistant integrations (Claude Desktop, Cursor AI)
- Uses pipe-based communication for direct MCP protocol exchange

```bash
# Run with STDIO transport (default for AI assistants)
TRANSPORT_MODE=stdio npx @aashari/mcp-server-aws-sso

# Using npm scripts (after installation)
npm run mcp:stdio
```

### HTTP Transport (Default for Server Mode)
- Modern HTTP-based transport with Server-Sent Events (SSE)
- Supports multiple concurrent connections
- Better for web-based integrations and development
- Runs on port 3000 by default (configurable via PORT env var)
- Endpoint: http://localhost:3000/mcp
- Health check: http://localhost:3000/

```bash
# Run with HTTP transport (default when no CLI args)
TRANSPORT_MODE=http npx @aashari/mcp-server-aws-sso

# Using npm scripts (after installation)
npm run mcp:http

# Test with MCP Inspector
npm run mcp:inspect
```

### Environment Variables

**Transport Configuration:**
- `TRANSPORT_MODE`: Set to `stdio` or `http` (default: `http` for server mode, `stdio` for MCP clients)
- `PORT`: HTTP server port (default: 3000)
- `DEBUG`: Enable debug logging (default: false)

**Authentication:**
- `AWS_SSO_START_URL`: Your AWS SSO start URL
- `AWS_SSO_REGION`: Your AWS SSO region
- `AWS_PROFILE`: Your AWS profile name (optional)
- `AWS_REGION`: Your AWS region (optional)

## CLI Commands

CLI commands use `kebab-case`. Run `--help` for details (e.g., `mcp-aws-sso login --help`).

- **login**: Authenticates via AWS SSO (`--no-launch-browser`, `--no-auto-poll`). Ex: `mcp-aws-sso login`.
- **status**: Checks authentication status (no options). Ex: `mcp-aws-sso status`.
- **ls-accounts**: Lists accounts/roles (no options). Ex: `mcp-aws-sso ls-accounts`.
- **exec-command**: Runs AWS CLI command (`--account-id`, `--role-name`, `--command`, `--region`). Ex: `mcp-aws-sso exec-command --account-id 123456789012 --role-name ReadOnly --command "aws s3 ls"`.
- **ec2-exec-command**: Runs shell command on EC2 (`--instance-id`, `--account-id`, `--role-name`, `--command`, `--region`). Ex: `mcp-aws-sso ec2-exec-command --instance-id i-0a69e80761897dcce --account-id 123456789012 --role-name InfraOps --command "uptime"`.

<details>
<summary><b>CLI Command Examples (Click to expand)</b></summary>

### Login

**Standard Login (launches browser and polls automatically):**
```bash
mcp-aws-sso login
```

**Login without Browser Launch:**
```bash
mcp-aws-sso login --no-launch-browser
```

### Execute AWS Commands

**List S3 Buckets:**
```bash
mcp-aws-sso exec-command \
  --account-id 123456789012 \
  --role-name ReadOnly \
  --command "aws s3 ls"
```

**List EC2 Instances with Specific Region:**
```bash
mcp-aws-sso exec-command \
  --account-id 123456789012 \
  --role-name AdminRole \
  --region us-west-2 \
  --command "aws ec2 describe-instances --output table"
```

### Execute EC2 Commands

**Check System Resources:**
```bash
mcp-aws-sso ec2-exec-command \
  --instance-id i-0a69e80761897dcce \
  --account-id 123456789012 \
  --role-name InfraOps \
  --command "uptime && df -h && free -m"
```

</details>

## Response Format

All responses are Markdown-formatted, including:

- **Status**: Success or error details.
- **Context**: Account, role, region, and execution time.
- **Output**: Command results or troubleshooting steps.

<details>
<summary><b>Response Format Examples (Click to expand)</b></summary>

### MCP Tool Response Example (`aws_sso_exec_command`)

```markdown
# AWS SSO: Command Result

**Account/Role:** 123456789012/ReadOnly
**Region:** us-east-1 (Default: ap-southeast-1)

## Command

	aws s3 ls

## Output

	2023-01-15 08:42:53 my-bucket-1
	2023-05-22 14:18:19 my-bucket-2
	2024-02-10 11:05:37 my-logs-bucket

*Executed: 2025-05-19 06:21:49 UTC*
```

### Error Response Example

```markdown
# ❌ AWS SSO: Command Error

**Account/Role:** 123456789012/ReadOnly
**Region:** us-east-1 (Default: ap-southeast-1)

## Command
	
	aws s3api get-object --bucket restricted-bucket --key secret.txt output.txt

## Error: Permission Denied
The role `ReadOnly` does not have permission to execute this command.

## Error Details

	An error occurred (AccessDenied) when calling the GetObject operation: Access Denied

### Troubleshooting

#### Available Roles
- AdminAccess
- PowerUserAccess
- S3FullAccess

Try executing the command again using one of the roles listed above that has appropriate permissions.

*Executed: 2025-05-19 06:17:49 UTC*
```

</details>

## Development

```bash
# Clone repository
git clone https://github.com/aashari/mcp-server-aws-sso.git
cd mcp-server-aws-sso

# Install dependencies
npm install

# Run in development mode
npm run dev:server

# Run tests
npm test
```

## Contributing

Contributions are welcome! Please:

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/xyz`).
3. Commit changes (`git commit -m "Add xyz feature"`).
4. Push to the branch (`git push origin feature/xyz`).
5. Open a pull request.

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

[ISC License](LICENSE)

