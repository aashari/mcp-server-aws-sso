import { AwsSsoCredentials } from '../services/aws.sso.types.js';

/**
 * Calculate the approximate duration from now until the expiration time
 * @param expirationDate The date when the session expires
 * @returns Formatted duration string like "approximately 12 hours"
 */
function calculateDuration(expirationDate: Date): string {
	try {
		const now = new Date();
		const diffMs = expirationDate.getTime() - now.getTime();

		// Convert to hours
		const diffHours = Math.round(diffMs / (1000 * 60 * 60));

		if (diffHours < 1) {
			return 'less than an hour';
		} else if (diffHours === 1) {
			return 'approximately 1 hour';
		} else {
			return `approximately ${diffHours} hours`;
		}
	} catch {
		return 'unknown duration';
	}
}

/**
 * Format login success message
 * @param expiresDate Formatted expiration date
 * @returns Formatted markdown content
 */
export function formatLoginSuccess(expiresDate: string): string {
	// Parse the expiration date to calculate the duration
	let durationText = 'unknown duration';
	try {
		const expirationDate = new Date(expiresDate);
		durationText = calculateDuration(expirationDate);
	} catch {
		// Keep the default text if parsing fails
	}

	return `# AWS SSO Authentication Successful

You have successfully authenticated with AWS SSO.

## Session Details
- **Expiration**: ${expiresDate}
- **Duration**: Valid for ${durationText}

## Next Steps
To explore your AWS accounts and roles, run:
\`\`\`bash
mcp-aws-sso ls-accounts
\`\`\`

To execute an AWS CLI command, use:
\`\`\`bash
mcp-aws-sso exec-command --account-id <ACCOUNT_ID> --role-name <ROLE_NAME> --command "aws s3 ls"
\`\`\``;
}

/**
 * Format already logged in message
 * @param expiresDate Formatted expiration date
 * @returns Formatted markdown content
 */
export function formatAlreadyLoggedIn(expiresDate: string): string {
	// Parse the expiration date to calculate the duration
	let durationText = 'unknown duration';
	try {
		const expirationDate = new Date(expiresDate);
		durationText = calculateDuration(expirationDate);
	} catch {
		// Keep the default text if parsing fails
	}

	return `# AWS SSO Session Active

You are already authenticated with AWS SSO.

## Session Details
- **Expiration**: ${expiresDate}
- **Duration**: Valid for ${durationText}

## Available Actions
To explore your AWS accounts and roles, run:
\`\`\`bash
mcp-aws-sso ls-accounts
\`\`\`

To execute an AWS CLI command, use:
\`\`\`bash
mcp-aws-sso exec-command --account-id <ACCOUNT_ID> --role-name <ROLE_NAME> --command "aws s3 ls"
\`\`\`

**Note**: If you want to force a new login session, you need to clear your AWS SSO token cache first.`;
}

/**
 * Format login with browser launch message
 * @param verificationUri Verification URI
 * @param userCode User code
 * @returns Formatted markdown content
 */
export function formatLoginWithBrowserLaunch(
	verificationUri: string,
	userCode: string,
): string {
	return `# AWS SSO Authentication Started

A browser window should have opened automatically to complete authentication.

## Browser Authentication Steps
1. Complete the login process in the browser window
2. Enter the verification code: **${userCode}** (if not pre-filled)
3. Approve the requested permissions

## Browser URL
${verificationUri}`;
}

/**
 * Format manual login message
 * @param verificationUri Verification URI
 * @param userCode User code
 * @returns Formatted markdown content
 */
export function formatLoginManual(
	verificationUri: string,
	userCode: string,
): string {
	return `# AWS SSO Manual Authentication Required

If the browser didn't open automatically, please follow these steps:

## Authentication Steps
1. Open this URL in your browser: 
   \`\`\`
   ${verificationUri}
   \`\`\`
2. Enter this verification code when prompted: **${userCode}**
3. Complete the AWS SSO login process
4. Return here after authentication is complete`;
}

/**
 * Format credentials message
 * @param fromCache Whether credentials were from cache
 * @param accountId AWS account ID
 * @param roleName IAM role name
 * @param credentials AWS credentials
 * @returns Formatted markdown content
 */
export function formatCredentials(
	fromCache: boolean,
	accountId: string,
	roleName: string,
	credentials: AwsSsoCredentials,
): string {
	// Format expiration timestamp
	let expirationFormatted = 'Unknown';
	let durationText = 'unknown duration';
	try {
		if (credentials.expiration) {
			const expirationDate = new Date(credentials.expiration * 1000);
			expirationFormatted = expirationDate.toLocaleString();
			durationText = calculateDuration(expirationDate);
		}
	} catch {
		// Keep the default
	}

	// Build the response
	const sourceText = fromCache ? 'Retrieved from cache' : 'Freshly obtained';

	return `# AWS Credentials

Temporary credentials have been ${sourceText.toLowerCase()} for:
- **Account**: ${accountId}
- **Role**: ${roleName}

## Credential Details
- **Source**: ${sourceText}
- **Expiration**: ${expirationFormatted}
- **Valid for**: ${durationText}

## Usage Example
To use these credentials for an AWS CLI command:
\`\`\`bash
mcp-aws-sso exec-command --account-id ${accountId} --role-name ${roleName} --command "aws s3 ls"
\`\`\`

**Note**: For security reasons, the actual credential values are not displayed.`;
}

/**
 * Format auth required message
 * @returns Formatted markdown content
 */
export function formatAuthRequired(): string {
	return `# AWS SSO Authentication Required

You need to authenticate with AWS SSO before using this command.

## How to Authenticate
Run the following command to start the login process:
\`\`\`bash
mcp-aws-sso login
\`\`\`

This will open a browser window for AWS SSO authentication. Follow the prompts to complete the process.`;
}
