import { AwsSsoCredentials } from '../services/aws.sso.types.js';

/**
 * Format login success message
 * @param expiresDate Formatted expiration date
 * @returns Formatted markdown content
 */
export function formatLoginSuccess(expiresDate: string): string {
	return `# Authentication Successful

You've successfully authenticated with AWS SSO.
Your session is valid until: ${expiresDate}.

To view your available AWS accounts and roles, run:
\`\`\`
list_accounts
\`\`\`

Then you can execute AWS CLI commands using:
\`\`\`
exec --account-id <ACCOUNT_ID> --role-name <ROLE_NAME> --command "aws <command>"
\`\`\``;
}

/**
 * Format already logged in message
 * @param expiresDate Formatted expiration date
 * @returns Formatted markdown content
 */
export function formatAlreadyLoggedIn(expiresDate: string): string {
	return `# Already Authenticated

You are already authenticated with AWS SSO.
Your session is valid until: ${expiresDate}.

To view your available AWS accounts and roles, run:
\`\`\`
list_accounts
\`\`\`

To execute AWS CLI commands:
\`\`\`
exec --account-id <ACCOUNT_ID> --role-name <ROLE_NAME> --command "aws <command>"
\`\`\`

If you want to force a new login session, first clear your AWS SSO token cache.`;
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

A browser window should have opened automatically to: ${verificationUri}

If the browser opened successfully:
1. Complete the login process in your browser window
2. Enter the verification code: **${userCode}** (if not pre-filled)
3. Authorize the requested permissions`;
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
	return `# Manual Login Instructions

If the browser didn't open automatically, please:

1. Open this URL in your browser: ${verificationUri}
2. Enter this code when prompted: **${userCode}**
3. Complete the AWS SSO login process
4. Return here after successful authentication`;
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
	try {
		if (credentials.expiration) {
			const expirationDate = new Date(credentials.expiration * 1000);
			expirationFormatted = expirationDate.toLocaleString();
		}
	} catch {
		// Keep the default
	}

	// Build the response
	const sourceText = fromCache ? 'from cache' : 'freshly retrieved';
	const header = `# AWS Credentials ${sourceText.toUpperCase()}`;
	const message = `

Temporary credentials for account **${accountId}** with role **${roleName}** have been ${sourceText}.
These credentials will expire at: **${expirationFormatted}**

The credentials are used automatically with the \`exec\` command:
\`\`\`
exec --account-id ${accountId} --role-name ${roleName} --command "aws s3 ls"
\`\`\`

For security reasons, the actual credential values are not displayed.`;

	return header + message;
}
