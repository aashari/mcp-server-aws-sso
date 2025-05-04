import {
	AwsSsoAccountWithRoles,
	RoleInfo,
} from '../services/vendor.aws.sso.types.js';

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
 * @param pagination Optional pagination info for footer hints (total, limit, startAt)
 * @returns Formatted markdown content
 */
export function formatAccountsAndRoles(
	expiresDate: string,
	accountsWithRoles: AwsSsoAccountWithRoles[],
	pagination?: {
		total?: number;
		limit?: number;
		startAt?: number;
		hasMore?: boolean;
	},
): string {
	// Parse the expiration date to calculate the duration
	let durationText = 'unknown duration';
	try {
		const expirationDate = new Date(expiresDate);
		durationText = calculateDuration(expirationDate);
	} catch {
		// Keep the default text if parsing fails
	}

	const header = `# AWS SSO Accounts and Roles\n\n**Session Status**: Valid until ${expiresDate} (${durationText} remaining)`;

	if (accountsWithRoles.length === 0) {
		return formatNoAccounts(true);
	}

	let content = header + '\n\n## Available Accounts\n';

	// Simplified account list with roles
	accountsWithRoles.forEach((account) => {
		// Account information with ID and name
		content += `\n### Account: ${account.accountName || 'Unnamed Account'} (${account.accountId})`;
		if (account.accountEmail) {
			content += `\n- **Email**: ${account.accountEmail}`;
		}

		// List roles in a bullet format
		if (account.roles.length === 0) {
			content += '\n- **Roles**: No roles available';
		} else {
			content += '\n- **Roles**:';
			account.roles.forEach((role) => {
				content += `\n  - ${role.roleName}`;
			});
		}

		content += '\n';
	});

	// Add a usage example at the end
	content += `\n## Next Steps
To execute a command in an account, run:
\`\`\`bash
mcp-aws-sso exec-command --account-id <ACCOUNT_ID> --role-name <ROLE_NAME> --command "aws s3 ls"
\`\`\`

**Tip**: Use \`mcp-aws-sso login\` if you need to re-authenticate.`;

	// --- Footer ---
	const footerLines: string[] = [];
	footerLines.push('---');

	const displayedCount = accountsWithRoles.length;
	if (pagination?.total !== undefined) {
		footerLines.push(
			`*Showing ${displayedCount} of ${pagination.total} accounts*`,
		);
	}
	// Check hasMore using limit and startAt if total isn't precise or available
	const potentiallyMore =
		pagination?.hasMore ??
		(pagination?.limit &&
			pagination?.startAt !== undefined &&
			displayedCount >= pagination.limit);

	if (potentiallyMore) {
		const nextStartAt =
			(pagination?.startAt ?? 0) + (pagination?.limit ?? displayedCount);
		footerLines.push(`*Use --start-at ${nextStartAt} to view more.*`); // Assuming start-at for AWS accounts, adjust if needed
	}

	footerLines.push(
		`*Information retrieved at: ${new Date().toLocaleString()}*`,
	);

	return content + '\n\n' + footerLines.join('\n');
}

/**
 * Format no accounts message
 * @param addFooter Flag to indicate if the standard footer should be added
 * @returns Formatted markdown content
 */
export function formatNoAccounts(addFooter: boolean = false): string {
	const baseContent = `# AWS SSO Accounts and Roles

## No Accounts Found

Your AWS SSO user has no assigned accounts.

### Possible Causes
- Your user lacks account assignments in AWS IAM Identity Center.
- Your SSO permissions are restricted.
- There may be a configuration issue with your AWS SSO setup.

### Suggested Actions
1. Contact your AWS administrator to verify account assignments.
2. Re-authenticate to refresh your session:
   \`\`\`bash
   mcp-aws-sso login
   \`\`\`

---\n*Information retrieved at: ${new Date().toLocaleString()}*`;
	return addFooter ? baseContent : baseContent;
}

/**
 * Format auth required message
 * @returns Formatted markdown content
 */
export function formatAuthRequired(): string {
	return `# AWS SSO Authentication Required

You need to authenticate with AWS SSO to view accounts and roles.

## How to Authenticate
Run the following command to start the login process:
\`\`\`bash
mcp-aws-sso login
\`\`\`

This will open a browser window for AWS SSO authentication. Follow the prompts to complete the process.

---\n*Information retrieved at: ${new Date().toLocaleString()}*`;
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

	const content = `# Roles for Account ${accountId}

## Available Roles
${rolesList}

## Usage Example
To use a role for executing AWS CLI commands:
\`\`\`bash
mcp-aws-sso exec-command --account-id ${accountId} --role-name <ROLE_NAME> --command "aws s3 ls"
\`\`\`

---\n*Information retrieved at: ${new Date().toLocaleString()}*`;
	return content;
}
