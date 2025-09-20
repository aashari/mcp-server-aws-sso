import { execSync } from 'child_process';

/**
 * Gets the default AWS region from environment variables or AWS CLI configuration
 * @returns The AWS region string
 */
export function getDefaultAwsRegion(): string {
	// First check environment variables (AWS SDKs check these first)
	const envRegion = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
	if (envRegion) {
		return envRegion;
	}

	// If environment variables aren't set, try to get from AWS CLI config
	try {
		// Use the working AWS CLI binary path to avoid "cannot execute binary file" errors
		const cliRegion = execSync(
			'/usr/local/aws-cli/aws configure get region',
			{
				encoding: 'utf8',
			},
		).trim();
		if (cliRegion) {
			return cliRegion;
		}
	} catch {
		// Silently continue to fallback - this is expected in many environments
		// where AWS CLI isn't configured or the binary path is different
	}

	// Fallback to a default region
	return 'ap-southeast-1';
}
