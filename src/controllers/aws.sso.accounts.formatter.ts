import {
	AwsSsoAccountWithRoles,
	RoleInfo,
} from '../services/vendor.aws.sso.types.js';
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
 * Format accounts and roles information
 * @param expiresDate Formatted expiration date
 * @param accountsWithRoles List of accounts with roles
 * @returns Formatted markdown content
 */
export function formatAccountsAndRoles(
	expiresDate: string,
	accountsWithRoles: AwsSsoAccountWithRoles[],
): string {
	// Parse the expiration date to calculate the duration
	let durationText = 'unknown duration';
	try {
		const expirationDate = new Date(expiresDate);
		durationText = calculateDuration(expirationDate);
	} catch {
		// Keep the default text if parsing fails
	}

	const headerLines = [
		formatHeading('AWS SSO: Accounts and Roles', 1),
		'',
		`**Session Status**: Valid until ${expiresDate} (${durationText} remaining)`,
	];

	if (accountsWithRoles.length === 0) {
		return formatNoAccounts(true);
	}

	const accountLines: string[] = [];
	accountLines.push(formatHeading('Available Accounts', 2));

	accountsWithRoles.forEach((account) => {
		accountLines.push('');
		accountLines.push(
			formatHeading(
				`Account: ${account.accountName || 'Unnamed Account'} (${account.accountId})`,
				3,
			),
		);

		const accountDetails: Record<string, unknown> = {};
		if (account.accountEmail) {
			accountDetails['Email'] = account.accountEmail;
		}
		// Add other potential details here if needed

		accountLines.push(formatBulletList(accountDetails));

		if (account.roles.length === 0) {
			accountLines.push('- **Roles**: No roles available');
		} else {
			accountLines.push('- **Roles**:');
			account.roles.forEach((role) => {
				accountLines.push(`  - ${role.roleName}`);
			});
		}
	});

	const usageLines = [
		'',
		formatHeading('Next Steps', 2),
		'To execute a command in an account, run:',
		formatCodeBlock(
			'mcp-aws-sso exec-command --account-id <ACCOUNT_ID> --role-name <ROLE_NAME> --command "aws s3 ls"',
			'bash',
		),
		'',
		'**Tip**: Use `mcp-aws-sso login` if you need to re-authenticate.',
	];

	const footerLines = [
		'',
		formatSeparator(),
		`*Information retrieved at: ${formatDate(new Date())}*`,
	];

	return [
		...headerLines,
		...accountLines,
		...usageLines,
		...footerLines,
	].join('\n');
}

/**
 * Format no accounts message
 * @param addFooter Flag to indicate if the standard footer should be added
 * @returns Formatted markdown content
 */
export function formatNoAccounts(addFooter: boolean = true): string {
	const lines = [
		formatHeading('AWS SSO: Accounts and Roles', 1),
		'',
		formatHeading('No Accounts Found', 2),
		'',
		'Your AWS SSO user has no assigned accounts.',
		'',
		formatHeading('Possible Causes', 3),
		'* Your user lacks account assignments in AWS IAM Identity Center.',
		'* Your SSO permissions are restricted.',
		'* There may be a configuration issue with your AWS SSO setup.',
		'',
		formatHeading('Suggested Actions', 3),
		'1. Contact your AWS administrator to verify account assignments.',
		'2. Re-authenticate to refresh your session:',
		formatCodeBlock('mcp-aws-sso login', 'bash'),
	];

	if (addFooter) {
		lines.push('');
		lines.push(formatSeparator());
		lines.push(`*Information retrieved at: ${formatDate(new Date())}*`);
	}

	return lines.join('\n');
}

/**
 * Format auth required message
 * @returns Formatted markdown content
 */
export function formatAuthRequired(): string {
	const lines = [
		formatHeading('AWS SSO Authentication Required', 1),
		'',
		'You need to authenticate with AWS SSO to view accounts and roles.',
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

/**
 * Format roles listing for an account
 * @param accountId AWS account ID
 * @param roles List of roles for the account
 * @returns Formatted markdown content
 */
export function formatAccountRoles(
	accountId: string,
	roles: RoleInfo[],
): string {
	const rolesList =
		roles.length === 0
			? 'No roles are available for this account with your SSO credentials.'
			: roles
					.map(
						(role) =>
							`- **${role.roleName || 'Unnamed Role'}**${role.roleArn ? ` (${role.roleArn})` : ''}`,
					)
					.join('\n');

	const lines = [
		formatHeading(`AWS SSO: Roles for Account ${accountId}`, 1),
		'',
		formatHeading('Available Roles', 2),
		rolesList,
		'',
		formatHeading('Usage Example', 2),
		'To use a role for executing AWS CLI commands:',
		formatCodeBlock(
			`mcp-aws-sso exec-command --account-id ${accountId} --role-name <ROLE_NAME> --command "aws s3 ls"`,
			'bash',
		),
		'',
		formatSeparator(),
		`*Information retrieved at: ${formatDate(new Date())}*`,
	];
	return lines.join('\n');
}
