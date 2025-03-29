# AWS SSO MCP Server

This project provides a Model Context Protocol (MCP) server that connects AI assistants (like Anthropic's Claude, Cursor AI, or other MCP-compatible clients) to AWS services using Single Sign-On (SSO) authentication. It enables AI models to interact with and manage your AWS resources through structured tools with simplified authentication.

## What is MCP and Why Use This Server?

Model Context Protocol (MCP) is an open standard enabling AI models to connect securely to external tools and data sources. This server implements the MCP standard with dedicated tools for AWS service management using SSO authentication.

**Benefits:**

- **AWS SSO Integration:** Connect your AI assistant to AWS services with seamless single sign-on, avoiding credential management.
- **Secure Execution:** Run AWS CLI commands using temporary credentials acquired through SSO, maintaining security best practices.
- **Modern Architecture:** Built with TypeScript and following AWS SSO best practices.
- **CLI Support:** Use the same tools as a command-line interface for scripting and testing.
- **Automatic Browser Authentication:** Handles browser launch and token polling automatically.

## Available Tools

This MCP server provides the following tools for your AI assistant:

- **Login (`login`)**

    - **Purpose:** Initiates AWS SSO authentication, launches a browser for login, and automatically polls for token completion.
    - **Use When:** You need to authenticate with AWS SSO before accessing AWS resources, when credentials have expired, or as the first step in any AWS workflow.
    - **Conversational Example:** "Login to AWS SSO so I can access my resources."
    - **Parameter Example:** `{}` (no parameters needed) or `{ launchBrowser: false }` (to disable automatic browser launch).

- **List Accounts (`list_accounts`)**

    - **Purpose:** Lists all available AWS accounts and their roles accessible via AWS SSO.
    - **Use When:** After authenticating with SSO, when you need to see all available accounts and roles in one view, or to get an overview of your AWS SSO access permissions.
    - **Conversational Example:** "Show me all AWS accounts I have access to through SSO."
    - **Parameter Example:** `{}` (no parameters needed, requires prior login).

- **Execute Command (`exec`)**
    - **Purpose:** Executes AWS CLI commands with temporary credentials obtained via SSO, enabling secure AWS resource management.
    - **Use When:** You need to run AWS CLI commands with SSO credentials, access AWS resources without managing long-term credentials, or execute AWS operations from within the AI assistant.
    - **Conversational Example:** "List my S3 buckets in account 123456789012 using the ReadOnly role."
    - **Parameter Example:** `{ accountId: "123456789012", roleName: "ReadOnly", command: "aws s3 ls", region: "us-west-2" }`
    - **Complex Command Example:** `{ accountId: "123456789012", roleName: "ReadOnly", command: "aws ec2 describe-instances --filters \"Name=instance-state-name,Values=running\"", region: "us-west-2" }`

## Interface Philosophy: Simple Input, Rich Output

This server follows a "Minimal Interface, Maximal Detail" approach:

1. **Simple Tools:** Ask for only essential identifiers or parameters.
2. **Rich Details:** Provides comprehensive information in a well-formatted Markdown response.

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
    	// Add other servers here if needed
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
    		// ... other servers
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

// Complex commands with quoted arguments
exec({
  accountId: "123456789012",
  roleName: "PowerUser",
  command: "aws dynamodb scan --table-name Users --filter \"attribute_exists(active)\" --limit 10",
  region: "us-east-1"
})

// Commands with single quotes are also supported
exec({
  accountId: "123456789012",
  roleName: "ReadOnly",
  command: "aws ec2 describe-tags --filters 'Name=resource-id,Values=i-1234567890abcdef0'",
  region: "us-east-1"
})
```

## Using as a Command-Line Tool (CLI)

You can also use this package directly from your terminal:

#### Quick Use with `npx`

```bash
# Set required environment variables (replace with your values)
export AWS_SSO_START_URL=https://your-sso-portal.awsapps.com/start
export AWS_REGION=us-east-1

# Login to AWS SSO (with browser launch)
npx -y @aashari/mcp-server-aws-sso login

# Login to AWS SSO (without browser launch)
npx -y @aashari/mcp-server-aws-sso login --no-browser

# List available accounts and roles
npx -y @aashari/mcp-server-aws-sso list-accounts

# Execute AWS CLI command with SSO credentials
npx -y @aashari/mcp-server-aws-sso exec --account-id 123456789012 --role-name ReadOnly --command "aws s3 ls"

# With region specification
npx -y @aashari/mcp-server-aws-sso exec --account-id 123456789012 --role-name PowerUser --command "aws ec2 describe-instances" --region us-west-2

# Complex commands with quotes - quotes are properly parsed
npx -y @aashari/mcp-server-aws-sso exec --account-id 123456789012 --role-name ReadOnly --command "aws ec2 describe-instances --filters \"Name=instance-state-name,Values=running\"" --region us-west-2

# Show help
npx -y @aashari/mcp-server-aws-sso --help
```

#### Global Installation (Optional)

1. `npm install -g @aashari/mcp-server-aws-sso`
2. Use the `mcp-aws-sso` command:

```bash
# Set required environment variables first
export AWS_SSO_START_URL=https://your-sso-portal.awsapps.com/start
export AWS_REGION=us-east-1

mcp-aws-sso login
mcp-aws-sso login --no-browser   # Login without browser launch
mcp-aws-sso list-accounts
mcp-aws-sso exec --account-id 123456789012 --role-name ReadOnly --command "aws s3 ls"
mcp-aws-sso exec --account-id 123456789012 --role-name AdminRole --command "aws lambda list-functions" --region us-east-1
mcp-aws-sso --help # See all commands
```

## Project Architecture

The project follows a clean layered architecture:

- **CLI / Tool Layer** (`src/cli/*.cli.ts`, `src/tools/*.tool.ts`): Define user interfaces and MCP tools
- **Controller Layer** (`src/controllers/*.controller.ts`): Implement business logic and centralize error handling
- **Service Layer** (`src/services/*.service.ts`): Handle AWS API interactions via AWS SDK
- **Utils** (`src/utils/*.util.ts`): Provide shared functionality like logging, error handling, and formatting
    - **Command Parsing** (`src/utils/command.util.ts`): Advanced parsing of AWS CLI commands with proper handling of quoted arguments

### Key Components

- **AWS SSO Authentication**: Handles the device authorization flow, browser launch, and token polling
- **Command Execution**: Runs AWS CLI commands with temporary credentials from SSO, with proper handling of complex commands including quoted arguments
- **Rich Markdown Formatting**: Formats responses with detailed information for AI consumption
- **Error Handling**: Comprehensive error handling with informative messages
- **Command Parsing**: Sophisticated parsing of command strings that preserves quoted arguments, enabling complex AWS CLI commands

## Required Configuration

The server requires the following environment variables:

- **`AWS_SSO_START_URL`**: Your AWS SSO portal URL (required). Example: `https://my-sso-portal.awsapps.com/start`
- **`AWS_REGION`**: AWS region to use for API calls. Defaults to `us-east-1` if not specified.
- **`DEBUG`**: Enable debug logging. Set to `true` to see detailed logs.

These can be set via environment variables, `.env` file, or in the `~/.mcp/configs.json` file.

## Feature: Automatic Browser Authentication

The `login` tool streamlines the AWS SSO authentication process:

- **Browser Launch**: Automatically opens your default browser to the AWS SSO login page (can be disabled with `launchBrowser: false`)
- **Verification Code**: Displays the verification code that needs to be confirmed in the browser
- **Automatic Polling**: Continuously checks for authentication completion
- **Session Management**: Caches and reuses valid sessions when possible
- **Account Discovery**: Automatically lists available accounts upon successful authentication

This removes the typical friction of multi-step AWS SSO authentication, making it seamless for AI assistants to authenticate and then perform AWS operations.

## Developer Guide

### Development Scripts

```bash
# Start server in development mode (with Inspector & debug logs)
npm run dev:server

# Run CLI in development mode
npm run dev:cli -- login

# Production mode (server with Inspector)
npm run start:server

# Production mode (CLI command)
npm run start:cli -- list-accounts
```

### Testing and Quality Tools

```bash
# Run all tests
npm test

# Run specific tests
npm test -- src/services/aws.sso.service.test.ts

# Generate test coverage report
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format
```

### MCP Inspector

The MCP Inspector provides a visual interface for debugging and testing your MCP server:

1. Run `npm run dev:server` or `npm run start:server`
2. The Inspector launches a web UI (typically at `http://localhost:5173`)
3. Use the UI to test tools, view requests/responses, and check errors

## Extending the Project

To add support for additional AWS services with SSO integration:

1. Create service files in `src/services/` for interacting with specific AWS APIs
2. Add controllers in `src/controllers/` with business logic and formatters
3. Implement tools in `src/tools/` defining the MCP tool interfaces
4. Add CLI commands in `src/cli/` for command-line support
5. Register new tools in `src/index.ts`

## Troubleshooting

- **Authentication Errors:**
    - Ensure `AWS_SSO_START_URL` is correctly set to your SSO portal URL
    - Run `aws sso login` to refresh your SSO session
    - Verify your SSO session is active with `aws sts get-caller-identity --profile your-sso-profile`
    - Check role permissions in AWS SSO configuration
    - Ensure browser can open and handle AWS SSO login page
- **Browser Launch Issues:**
    - If browser doesn't launch automatically, try using `login({ launchBrowser: false })` and open the URL manually
    - Check system permissions for opening URLs
    - Check if the correct browser is set as your default browser
- **Command Execution Errors:**
    - Verify the account ID and role name are correct
    - Check that the account has the role specified in the SSO assignment
    - Ensure the role has permissions for the AWS CLI commands being executed
    - Verify AWS CLI is properly installed (run `aws --version`)
    - For complex commands with quotes, ensure quotes are properly escaped in your JSON or command-line input
- **Server Not Connecting (in AI Client):**
    - Confirm the command (`npx ...`) in your client's config is correct
    - Check Node.js/npm installation and PATH
    - Run the `npx` command directly in your terminal for errors
- **Enable Debug Logs:** Set `DEBUG=true` environment variable for verbose logging

## For Developers: Contributing

Contributions are welcome! If you'd like to contribute:

- **Architecture:** The server uses a layered approach (CLI/Tool -> Controller -> Service) following the MCP server pattern.
- **Setup:** Clone repo, `npm install`. Use `npm run dev:server` or `npm run dev:cli -- <command>`.
- **Code Style:** Use `npm run lint` and `npm run format`.
- **Tests:** Add tests via `npm test`.
- **Consistency:** Follow existing patterns and the "Minimal Interface, Maximal Detail" philosophy.

## Versioning Note

This project (`@aashari/mcp-server-aws-sso`) follows Semantic Versioning and is versioned independently from other `@aashari/mcp-server-*` packages.

## License

[ISC](https://opensource.org/licenses/ISC)
