# Connect AI to Your AWS Resources

Transform how you manage and access your AWS infrastructure by connecting Claude, Cursor AI, and other AI assistants directly to your AWS accounts through Single Sign-On. Get instant access to your cloud resources, execute commands, and manage EC2 instances using natural language.

[![NPM Version](https://img.shields.io/npm/v/@aashari/mcp-server-aws-sso)](https://www.npmjs.com/package/@aashari/mcp-server-aws-sso)

## What You Can Do

✅ **Ask AI about your AWS accounts**: *"Show me all my AWS accounts and available roles"*  
✅ **Execute AWS commands**: *"List all S3 buckets in my production account"*  
✅ **Manage EC2 instances**: *"Check the disk usage on server i-123456789"*  
✅ **Access multi-account setups**: *"Switch to the staging account and describe the VPCs"*  
✅ **Monitor resources**: *"Get the status of all running EC2 instances"*  
✅ **Run shell commands**: *"Execute 'df -h' on my web server via SSM"*

## Perfect For

- **DevOps Engineers** managing multi-account AWS environments and infrastructure automation
- **Cloud Architects** needing quick access to resource information across AWS accounts  
- **Developers** who want to check deployments and run AWS CLI commands through AI
- **SRE Teams** monitoring and troubleshooting AWS resources using natural language
- **IT Administrators** managing EC2 instances and executing remote commands securely
- **Anyone** who wants to interact with AWS using conversational AI

## Quick Start

Get up and running in 2 minutes:

### 1. Get Your AWS SSO Setup

Set up AWS IAM Identity Center:
1. **Enable AWS IAM Identity Center** in your AWS account
2. **Configure your identity source** (AWS directory, Active Directory, or external IdP)  
3. **Set up permission sets** and assign users to AWS accounts
4. **Note your AWS SSO Start URL** (e.g., `https://your-company.awsapps.com/start`)

### 2. Try It Instantly

```bash
# Set your AWS SSO configuration
export AWS_SSO_START_URL="https://your-company.awsapps.com/start"
export AWS_REGION="us-east-1"

# Start the authentication flow
npx -y @aashari/mcp-server-aws-sso login

# List your accessible accounts and roles
npx -y @aashari/mcp-server-aws-sso ls-accounts

# Execute an AWS command
npx -y @aashari/mcp-server-aws-sso exec-command \
  --account-id 123456789012 \
  --role-name ReadOnly \
  --command "aws s3 ls"
```

## Connect to AI Assistants

### For Claude Desktop Users

Add this to your Claude configuration file (`~/.claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "aws-sso": {
      "command": "npx",
      "args": ["-y", "@aashari/mcp-server-aws-sso"],
      "env": {
        "AWS_SSO_START_URL": "https://your-company.awsapps.com/start",
        "AWS_REGION": "us-east-1"
      }
    }
  }
}
```

Restart Claude Desktop, and you'll see "🔗 aws-sso" in the status bar.

### For Other AI Assistants

Most AI assistants support MCP. Install the server globally:

```bash
npm install -g @aashari/mcp-server-aws-sso
```

Then configure your AI assistant to use the MCP server with STDIO transport.

### Alternative: Configuration File

Create `~/.mcp/configs.json` for system-wide configuration:

```json
{
  "aws-sso": {
    "environments": {
      "AWS_SSO_START_URL": "https://your-company.awsapps.com/start",
      "AWS_REGION": "us-east-1",
      "DEBUG": "false"
    }
  }
}
```

**Alternative config keys:** The system also accepts `"@aashari/mcp-server-aws-sso"` or `"mcp-server-aws-sso"` instead of `"aws-sso"`.

## Real-World Examples

### 🔐 Authenticate and Explore

Ask your AI assistant:
- *"Log into AWS SSO and show me my authentication status"*
- *"List all my AWS accounts and the roles I can assume"*
- *"Check if I'm still authenticated to AWS"*
- *"Show me which AWS accounts I have access to"*

### 🛠️ Execute AWS Commands

Ask your AI assistant:
- *"List all S3 buckets in my production account using the ReadOnly role"*
- *"Show me all running EC2 instances in the us-west-2 region"*
- *"Describe the VPCs in my staging AWS account"*
- *"Get the status of my RDS databases in account 123456789012"*

### 🖥️ Manage EC2 Instances

Ask your AI assistant:
- *"Check the disk usage on EC2 instance i-1234567890abcdef0"*
- *"Run 'uptime' on my web server via Systems Manager"*
- *"Execute 'systemctl status nginx' on instance i-abc123 in production"*
- *"Get memory usage from all my application servers"*

### 🔍 Infrastructure Monitoring

Ask your AI assistant:
- *"List all Lambda functions in my development account"*
- *"Show me the CloudFormation stacks in us-east-1"*
- *"Check the health of my load balancers"*
- *"Get the latest CloudWatch alarms that are in ALARM state"*

### 🔄 Multi-Account Operations

Ask your AI assistant:
- *"Switch to account 987654321098 with AdminRole and list all security groups"*
- *"Compare the running instances between staging and production accounts"*
- *"Check backup policies across all my AWS accounts"*
- *"Audit IAM users in the security account"*

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
  "launchBrowser": false
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

- **login**: Authenticates via AWS SSO (`--no-launch-browser`). Ex: `mcp-aws-sso login`.
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

## Troubleshooting

### "Authentication failed" or "Token expired"

1. **Re-authenticate with AWS SSO**:
   ```bash
   # Test your SSO configuration
   npx -y @aashari/mcp-server-aws-sso login
   ```

2. **Check your AWS SSO configuration**:
   - Verify your `AWS_SSO_START_URL` is correct (should be your organization's SSO portal)
   - Ensure your `AWS_REGION` matches your SSO region configuration

3. **Verify your SSO setup**:
   - Make sure you can access the SSO portal in your browser
   - Check that your AWS account assignments are active

### "Account not found" or "Role not found"

1. **Check available accounts and roles**:
   ```bash
   # List all accessible accounts
   npx -y @aashari/mcp-server-aws-sso ls-accounts
   ```

2. **Verify account ID format**:
   - Account ID should be exactly 12 digits
   - Use the exact account ID from the `ls-accounts` output

3. **Check role permissions**:
   - Make sure you have permission to assume the specified role
   - Use the exact role name from your permission sets

### "AWS CLI not found" or Command execution errors

1. **Install AWS CLI v2**:
   - Download from [AWS CLI Installation Guide](https://aws.amazon.com/cli/)
   - Ensure `aws` command is in your system PATH

2. **Test AWS CLI independently**:
   ```bash
   aws --version
   aws sts get-caller-identity
   ```

### "EC2 command failed" or "SSM connection issues"

1. **Verify EC2 instance setup**:
   - Instance must have SSM Agent installed and running
   - Instance needs an IAM role with `AmazonSSMManagedInstanceCore` policy

2. **Check your role permissions**:
   - Your assumed role needs `ssm:SendCommand` and `ssm:GetCommandInvocation` permissions
   - Verify the instance is in a running state

3. **Test SSM connectivity**:
   ```bash
   # Test if instance is reachable via SSM
   npx -y @aashari/mcp-server-aws-sso exec-command \
     --account-id YOUR_ACCOUNT \
     --role-name YOUR_ROLE \
     --command "aws ssm describe-instance-information"
   ```

### Claude Desktop Integration Issues

1. **Restart Claude Desktop** after updating the config file
2. **Check the status bar** for the "🔗 aws-sso" indicator
3. **Verify config file location**:
   - macOS: `~/.claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

### Getting Help

If you're still having issues:
1. Run a simple test command to verify everything works
2. Check the [GitHub Issues](https://github.com/aashari/mcp-server-aws-sso/issues) for similar problems
3. Create a new issue with your error message and setup details

## Frequently Asked Questions

### What permissions do I need?

**For AWS SSO Setup:**
- You need an AWS SSO account with access to IAM Identity Center
- Permission sets configured by your AWS administrator
- Access to the specific AWS accounts you want to manage

**For EC2 Commands via SSM:**
- Your assumed role needs `ssm:SendCommand` and `ssm:GetCommandInvocation` permissions
- EC2 instances need an IAM role with `AmazonSSMManagedInstanceCore` policy
- SSM Agent must be installed and running on target instances

### Can I use this with multiple AWS organizations?

Currently, each installation supports one AWS SSO start URL. For multiple organizations, you'd need separate configurations or manually switch the `AWS_SSO_START_URL` environment variable.

### How long do the SSO credentials last?

AWS SSO tokens typically last 8-12 hours. Temporary credentials for specific accounts/roles last about 1 hour. The tool automatically handles token refresh and credential caching for you.

### What AI assistants does this work with?

Any AI assistant that supports the Model Context Protocol (MCP):
- Claude Desktop (most popular)
- Cursor AI  
- Continue.dev
- Many others

### Is my data secure?

Yes! This tool:
- Runs entirely on your local machine
- Uses your own AWS SSO credentials
- Never sends your data to third parties
- Only accesses what you give it permission to access
- Uses temporary credentials that automatically expire

### Do I need AWS CLI installed?

Yes, AWS CLI v2 is required for the `aws_sso_exec_command` tool. However, the authentication and account listing features work without it.

### Can I use this with AWS CLI profiles?

This tool uses AWS SSO directly and doesn't rely on AWS CLI profiles. It manages its own credential cache independently of the AWS CLI configuration.

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

## Support

Need help? Here's how to get assistance:

1. **Check the troubleshooting section above** - most common issues are covered there
2. **Visit our GitHub repository** for documentation and examples: [github.com/aashari/mcp-server-aws-sso](https://github.com/aashari/mcp-server-aws-sso)
3. **Report issues** at [GitHub Issues](https://github.com/aashari/mcp-server-aws-sso/issues)
4. **Start a discussion** for feature requests or general questions

---

*Made with ❤️ for DevOps teams who want to bring AI into their AWS workflow.*

