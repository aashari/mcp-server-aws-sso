import { execSync } from 'child_process';
import { Logger } from './logger.util.js';

const logger = Logger.forContext('utils/aws.sso.util.ts');

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
		const cliRegion = execSync('aws configure get region', {
			encoding: 'utf8',
		}).trim();
		if (cliRegion) {
			return cliRegion;
		}
	} catch (error) {
		logger.debug('Failed to get region from AWS CLI config', error);
		// Continue to fallback if AWS CLI command fails
	}

	// Fallback to a default region
	return 'ap-southeast-1';
}
