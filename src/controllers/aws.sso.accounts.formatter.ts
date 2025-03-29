import {
	AwsSsoAccountRole,
	AwsSsoAccountWithRoles,
} from '../services/aws.sso.types.js';

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
	const header = `# AWS SSO Accounts and Roles\nSession valid until: ${expiresDate}`;

	if (accountsWithRoles.length === 0) {
		return `${header}\n\nNo accounts found.`;
	}

	let content = header + '\n';

	// Simplified account list with roles
	accountsWithRoles.forEach(({ account, roles }) => {
		// Account information - just ID and name
		content += `\n### ${account.accountName || 'Unnamed Account'} (${account.accountId})`;

		// List roles in a simple bullet format
		if (roles.length === 0) {
			content += '\nNo roles available';
		} else {
			content += '\nAvailable Roles:';
			roles.forEach((role) => {
				content += `\n• ${role.roleName}`;
			});
		}

		content += '\n';
	});

	// Add a simple usage hint at the end
	content += `\nTo use a role: exec --account-id <ACCOUNT_ID> --role-name <ROLE_NAME>`;

	return content;
}

/**
 * Format no accounts message
 * @returns Formatted markdown content
 */
export function formatNoAccounts(): string {
	return `# No AWS Accounts Found

You are authenticated to AWS SSO, but no accounts were found that you have access to.

Possible reasons:
- Your AWS SSO user doesn't have any account assignments
- Your AWS SSO permissions are limited to specific services but not account access
- There might be an issue with your AWS SSO configuration

Please contact your AWS administrator if you believe you should have access to AWS accounts.

If you think this is an authentication issue, try running:
\`\`\`
login
\`\`\`
to re-authenticate and try again.`;
}

/**
 * Format auth required message
 * @returns Formatted markdown content
 */
export function formatAuthRequired(): string {
	return `# Authentication Required

You need to authenticate with AWS SSO before accessing accounts and roles.

Please run the following command to log in:
\`\`\`
login
\`\`\`

This will open a browser window where you can complete the AWS SSO authentication process.
After successful authentication, you can run \`list_accounts\` to view your accounts and roles.`;
}

/**
 * Format roles listing for an account
 * @param accountId AWS account ID
 * @param roles List of roles for the account
 * @returns Formatted markdown content
 */
export function formatAccountRoles(
	accountId: string,
	roles: AwsSsoAccountRole[],
): string {
	let rolesList: string;

	if (roles.length === 0) {
		rolesList =
			'No roles are available for this account with your SSO credentials.';
	} else {
		rolesList = roles
			.map(
				(role) =>
					`- **${role.roleName}**${role.roleArn ? ` (${role.roleArn})` : ''}`,
			)
			.join('\n');
	}

	return `# Roles for Account ${accountId}

The following roles are available for this account:

${rolesList}

To get credentials for a specific role, use the \`exec\` command with the account ID and role name.`;
}
