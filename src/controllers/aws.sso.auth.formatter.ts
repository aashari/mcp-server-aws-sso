import { AwsSsoCredentials } from '../services/aws.sso.types.js';
import {
	formatDate,
	formatHeading,
	formatCodeBlock,
	formatBulletList,
	formatSeparator,
} from '../utils/formatter.util.js';

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

	const lines = [
		formatHeading('AWS SSO: Authentication Successful', 1),
		'',
		'You have successfully authenticated with AWS SSO.',
		'',
		formatHeading('Session Details', 2),
		formatBulletList({
			Expiration: expiresDate,
			Duration: `Valid for ${durationText}`,
		}),
		'',
		formatHeading('Next Steps', 2),
		'To explore your AWS accounts and roles, run:',
		formatCodeBlock('mcp-aws-sso ls-accounts', 'bash'),
		'',
		'To execute an AWS CLI command, use:',
		formatCodeBlock(
			'mcp-aws-sso exec-command --account-id <ACCOUNT_ID> --role-name <ROLE_NAME> --command "aws s3 ls"',
			'bash',
		),
		'',
		formatSeparator(),
		`*Information retrieved at: ${formatDate(new Date())}*`,
	];
	return lines.join('\n');
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

	const lines = [
		formatHeading('AWS SSO: Session Active', 1),
		'',
		'You are already authenticated with AWS SSO.',
		'',
		formatHeading('Session Details', 2),
		formatBulletList({
			Expiration: expiresDate,
			Duration: `Valid for ${durationText}`,
		}),
		'',
		formatHeading('Available Actions', 2),
		'To explore your AWS accounts and roles, run:',
		formatCodeBlock('mcp-aws-sso ls-accounts', 'bash'),
		'',
		'To execute an AWS CLI command, use:',
		formatCodeBlock(
			'mcp-aws-sso exec-command --account-id <ACCOUNT_ID> --role-name <ROLE_NAME> --command "aws s3 ls"',
			'bash',
		),
		'',
		'**Note**: If you want to force a new login session, you need to clear your AWS SSO token cache first.',
		'',
		formatSeparator(),
		`*Information retrieved at: ${formatDate(new Date())}*`,
	];
	return lines.join('\n');
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
	const lines = [
		formatHeading('AWS SSO: Authentication Started', 1),
		'',
		'A browser window should have opened automatically to complete authentication.',
		'',
		formatHeading('Important for AI Assistants', 2),
		'**Please check the following:**',
		'1. **First**, ask the user if a browser window opened automatically',
		'2. **If browser opened**: Guide them to complete the login in that window',
		'3. **If no browser opened**: Instruct them to manually open the URL below',
		'4. **Always provide**: The verification code and URL as backup',
		'',
		formatHeading('Browser Authentication Steps', 2),
		'1. Complete the login process in the browser window',
		`2. Enter the verification code: **${userCode}** (if not pre-filled)`,
		'3. Approve the requested permissions',
		'',
		formatHeading('Manual Browser URL (if needed)', 2),
		formatCodeBlock(verificationUri, ''),
		'',
		formatSeparator(),
		`*Information retrieved at: ${formatDate(new Date())}*`,
	];
	return lines.join('\n');
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
	const lines = [
		formatHeading('AWS SSO: Manual Authentication Required', 1),
		'',
		"If the browser didn't open automatically, please follow these steps:",
		'',
		formatHeading('Authentication Steps', 2),
		'1. Open this URL in your browser:',
		formatCodeBlock(verificationUri, ''),
		`2. Enter this verification code when prompted: **${userCode}**`,
		'3. Complete the AWS SSO login process',
		'4. Return here after authentication is complete',
		'',
		formatSeparator(),
		`*Information retrieved at: ${formatDate(new Date())}*`,
		formatHeading('Authentication Details', 2),
		formatBulletList({
			'Verification Code': `**${userCode}**`,
			'Browser Not Launched': 'No',
			'Verification URL': verificationUri,
			'Code Expires In': '10 minutes',
			'Background Polling':
				'**Active** (credentials will be collected automatically)',
		}),
		'',
		"Complete the authentication in your browser. Use 'aws_sso_status' to check completion status, or proceed with other AWS commands once authenticated.",
	];
	return lines.join('\n');
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
			expirationFormatted = formatDate(expirationDate);
			durationText = calculateDuration(expirationDate);
		}
	} catch {
		// Keep the default
	}

	// Build the response
	const sourceText = fromCache ? 'Retrieved from cache' : 'Freshly obtained';

	const lines = [
		formatHeading('AWS SSO: Credentials', 1),
		'',
		`Temporary credentials have been ${sourceText.toLowerCase()} for:`,
		`- **Account**: ${accountId}`,
		`- **Role**: ${roleName}`,
		'',
		formatHeading('Credential Details', 2),
		formatBulletList({
			Source: sourceText,
			Expiration: expirationFormatted,
			'Valid for': durationText,
		}),
		'',
		formatHeading('Usage Example', 2),
		'To use these credentials for an AWS CLI command:',
		formatCodeBlock(
			`mcp-aws-sso exec-command --account-id ${accountId} --role-name ${roleName} --command "aws s3 ls"`,
			'bash',
		),
		'',
		'**Note**: For security reasons, the actual credential values are not displayed.',
		'',
		formatSeparator(),
		`*Information retrieved at: ${formatDate(new Date())}*`,
	];

	return lines.join('\n');
}

/**
 * Format auth required message
 * @returns Formatted markdown content
 */
export function formatAuthRequired(): string {
	const lines = [
		formatHeading('AWS SSO: Authentication Required', 1),
		'',
		'You need to authenticate with AWS SSO before using this command.',
		'',
		formatHeading('How to Authenticate', 2),
		'Run the following command to start the login process:',
		formatCodeBlock('mcp-aws-sso login', 'bash'),
		'',
		'This will open a browser window for AWS SSO authentication. Follow the prompts to complete the process.',
		'',
		formatSeparator(),
		`*Information retrieved at: ${formatDate(new Date())}*`,
	];
	return lines.join('\n');
}
