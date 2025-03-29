import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Logger } from './logger.util.js';
import { AwsCredentials, SsoToken } from '../services/vendor.aws.sso.types.js';
import { AwsSsoAccount, AwsSsoAccountRole } from '../services/aws.sso.types.js';

// Define the cache directory for MCP server
const HOME_DIR = os.homedir();
const CACHE_DIR = path.join(HOME_DIR, '.mcp-server', 'aws-sso');
const TOKEN_FILE = path.join(CACHE_DIR, 'token.json');

// Constants for the MCP cache location
const MCP_DATA_DIR = path.join(HOME_DIR, '.mcp', 'data');
const MCP_AWS_SSO_CACHE_FILE = path.join(MCP_DATA_DIR, 'aws-sso.json');

/**
 * Ensure the cache directory exists
 */
async function ensureCacheDir(): Promise<void> {
	const methodLogger = Logger.forContext(
		'utils/aws.sso.cache.util.ts',
		'ensureCacheDir',
	);
	methodLogger.debug('Ensuring cache directory exists');

	try {
		// Make sure the cache directory exists
		if (!fsSync.existsSync(CACHE_DIR)) {
			methodLogger.debug(
				`Cache directory ${CACHE_DIR} does not exist, creating...`,
			);
			fsSync.mkdirSync(CACHE_DIR, { recursive: true });
		}
	} catch (error) {
		methodLogger.error('Error ensuring cache directory exists', error);
		throw error;
	}
}

/**
 * Check if a file exists
 * @param filePath File path
 * @returns True if the file exists, false otherwise
 */
async function fileExists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath, fsSync.constants.F_OK);
		return true;
	} catch {
		return false;
	}
}

/**
 * Device authorization information
 */
interface DeviceAuthorizationInfo {
	/**
	 * The client ID for SSO
	 */
	clientId: string;

	/**
	 * The client secret for SSO
	 */
	clientSecret: string;

	/**
	 * The device code for SSO
	 */
	deviceCode: string;

	/**
	 * The expiration time in seconds
	 */
	expiresIn: number;

	/**
	 * The polling interval in seconds
	 */
	interval?: number;

	/**
	 * The AWS region for SSO
	 */
	region: string;
}

/**
 * Interface for AWS SSO cache file structure
 */
interface AwsSsoCacheFile {
	ssoToken?: {
		accessToken: string;
		expiresAt: number;
		region: string;
		startUrl: string;
	};
	lastAuth?: number;
	credentials?: Record<string, unknown>;
	accountRoles?: Array<{
		account: {
			accountId: string;
			accountName: string;
			emailAddress: string;
		};
		roles: Array<{
			accountId: string;
			roleName: string;
			roleArn: string;
		}>;
	}>;
}

/**
 * Get cached SSO token
 * @returns Cached SSO token or undefined if not found or expired
 */
export async function getCachedSsoToken(): Promise<SsoToken | undefined> {
	const methodLogger = Logger.forContext(
		'utils/aws.sso.cache.util.ts',
		'getCachedSsoToken',
	);
	methodLogger.debug('Getting cached SSO token');

	try {
		// Check if token file exists
		if (!(await fileExists(TOKEN_FILE))) {
			methodLogger.debug('No token file found');
			return undefined;
		}

		// Read token from file
		const tokenContent = await fs.readFile(TOKEN_FILE, 'utf8');
		const token = JSON.parse(tokenContent) as SsoToken;

		// Check if token is expired
		const now = Math.floor(Date.now() / 1000);
		if (token.expiresAt <= now) {
			methodLogger.debug('Token is expired');
			return undefined;
		}

		// Token is valid
		methodLogger.debug('Found valid token, expires in', {
			expiresIn: token.expiresAt - now,
			expiresAt: new Date(token.expiresAt * 1000).toISOString(),
		});

		return token;
	} catch (error) {
		methodLogger.error('Error getting token from cache', error);
		return undefined;
	}
}

/**
 * Save SSO token to cache
 * @param token SSO token to save
 */
export async function saveSsoToken(token: SsoToken): Promise<void> {
	const methodLogger = Logger.forContext(
		'utils/aws.sso.cache.util.ts',
		'saveSsoToken',
	);
	methodLogger.debug('Saving SSO token to cache');

	try {
		// Ensure cache directory exists
		await ensureCacheDir();

		// Debug log - only log part of token for security
		methodLogger.debug('Token details before saving:', {
			accessTokenLength: token.accessToken?.length || 0,
			accessTokenFirst10Chars:
				token.accessToken?.substring(0, 10) || 'none',
			expiresAt: token.expiresAt,
			region: token.region,
		});

		// Save token to file
		await fs.writeFile(TOKEN_FILE, JSON.stringify(token, null, 2), 'utf8');
		methodLogger.debug('Token saved to cache');
	} catch (error) {
		methodLogger.error('Error saving token to cache', error);
		throw error;
	}
}

/**
 * Get cached AWS credentials for account and role
 * @param accountId AWS account ID
 * @param roleName AWS role name
 * @returns AWS credentials or undefined if not found
 */
export async function getCachedCredentials(
	accountId: string,
	roleName: string,
): Promise<AwsCredentials | undefined> {
	const methodLogger = Logger.forContext(
		'utils/aws.sso.cache.util.ts',
		'getCachedCredentials',
	);
	methodLogger.debug('Getting cached credentials', { accountId, roleName });

	try {
		// Generate credentials file path
		const key = `${accountId}_${roleName}`;
		const credentialsFile = path.join(CACHE_DIR, `${key}.json`);

		// Check if credentials file exists
		if (!(await fileExists(credentialsFile))) {
			methodLogger.debug('No credentials file found');
			return undefined;
		}

		// Read credentials file
		const data = await fs.readFile(credentialsFile, 'utf8');
		const credentials = JSON.parse(data) as AwsCredentials;

		// Ensure expiration is a Date
		if (typeof credentials.expiration === 'string') {
			credentials.expiration = new Date(credentials.expiration);
		}

		methodLogger.debug('Retrieved credentials from cache', {
			accountId,
			roleName,
			expiration: credentials.expiration,
		});

		return credentials;
	} catch (error) {
		methodLogger.error('Error getting cached credentials', error);
		return undefined;
	}
}

/**
 * Save AWS credentials to cache
 * @param accountId AWS account ID
 * @param roleName AWS role name
 * @param credentials AWS credentials to save
 */
export async function saveCachedCredentials(
	accountId: string,
	roleName: string,
	credentials: AwsCredentials,
): Promise<void> {
	const methodLogger = Logger.forContext(
		'utils/aws.sso.cache.util.ts',
		'saveCachedCredentials',
	);
	methodLogger.debug('Saving credentials to cache', { accountId, roleName });

	try {
		// Ensure cache directory exists
		await ensureCacheDir();

		// Generate credentials file path
		const key = `${accountId}_${roleName}`;
		const credentialsFile = path.join(CACHE_DIR, `${key}.json`);

		// Save credentials to file
		await fs.writeFile(
			credentialsFile,
			JSON.stringify(credentials, null, 2),
			'utf8',
		);
		methodLogger.debug('Credentials saved to cache');
	} catch (error) {
		methodLogger.error('Error saving credentials to cache', error);
		throw error;
	}
}

/**
 * Cache device authorization info
 * @param info Device authorization info to cache
 */
export async function cacheDeviceAuthorizationInfo(
	info: DeviceAuthorizationInfo,
): Promise<void> {
	const methodLogger = Logger.forContext(
		'utils/aws.sso.cache.util.ts',
		'cacheDeviceAuthorizationInfo',
	);
	methodLogger.debug('Caching device authorization info');

	try {
		// Ensure cache directory exists
		await ensureCacheDir();

		// Save device authorization info to file
		const deviceAuthFile = path.join(CACHE_DIR, 'device-auth.json');
		await fs.writeFile(
			deviceAuthFile,
			JSON.stringify(info, null, 2),
			'utf8',
		);
		methodLogger.debug('Device authorization info cached');
	} catch (error) {
		methodLogger.error('Error caching device authorization info', error);
		throw error;
	}
}

/**
 * Get cached device authorization info
 * @returns Device authorization info from cache or undefined if not found
 */
export async function getCachedDeviceAuthorizationInfo(): Promise<
	DeviceAuthorizationInfo | undefined
> {
	const methodLogger = Logger.forContext(
		'utils/aws.sso.cache.util.ts',
		'getCachedDeviceAuthorizationInfo',
	);
	methodLogger.debug('Getting cached device authorization info');

	try {
		const deviceAuthFile = path.join(CACHE_DIR, 'device-auth.json');

		// Check if device auth file exists
		if (!(await fileExists(deviceAuthFile))) {
			methodLogger.debug('No device authorization info found in cache');
			return undefined;
		}

		// Read device auth file
		const data = await fs.readFile(deviceAuthFile, 'utf8');
		const deviceInfo = JSON.parse(data) as DeviceAuthorizationInfo;

		methodLogger.debug('Retrieved device authorization info from cache');
		return deviceInfo;
	} catch (error) {
		methodLogger.error(
			'Error getting cached device authorization info',
			error,
		);
		return undefined;
	}
}

/**
 * Clear device authorization info from cache
 * @returns Promise that resolves when the operation completes
 */
export async function clearDeviceAuthorizationInfo(): Promise<void> {
	const methodLogger = Logger.forContext(
		'utils/aws.sso.cache.util.ts',
		'clearDeviceAuthorizationInfo',
	);
	methodLogger.debug('Clearing device authorization info');

	try {
		const deviceAuthFile = path.join(CACHE_DIR, 'device-auth.json');

		// Check if device auth file exists
		if (await fileExists(deviceAuthFile)) {
			// Delete device auth file
			await fs.unlink(deviceAuthFile);
			methodLogger.debug('Device authorization info cleared from cache');
		} else {
			methodLogger.debug('No device authorization info found to clear');
		}
	} catch (error) {
		methodLogger.error('Error clearing device authorization info', error);
		// Don't throw error to ensure other operations can continue
	}
}

/**
 * Clear all cached data (tokens, credentials, etc.)
 * @returns Promise that resolves when the operation completes
 */
export async function clearAllCachedData(): Promise<void> {
	const methodLogger = Logger.forContext(
		'utils/aws.sso.cache.util.ts',
		'clearAllCachedData',
	);
	methodLogger.debug('Clearing all cached data');

	try {
		// Ensure cache directory exists
		await ensureCacheDir();

		// Get all files in cache directory
		const files = await fs.readdir(CACHE_DIR);

		// Delete each file
		for (const file of files) {
			const filePath = path.join(CACHE_DIR, file);
			await fs.unlink(filePath);
		}

		methodLogger.debug('All cached data cleared successfully');
	} catch (error) {
		methodLogger.error('Error clearing all cached data', error);
		// Don't throw error to ensure other operations can continue
	}
}

/**
 * Get cached AWS accounts
 * @returns List of AWS accounts or empty array if none found
 */
export async function getCachedAccounts(): Promise<AwsSsoAccount[]> {
	const methodLogger = Logger.forContext(
		'utils/aws.sso.cache.util.ts',
		'getCachedAccounts',
	);
	methodLogger.debug('Getting cached AWS accounts');

	try {
		// Generate accounts file path
		const accountsFile = path.join(CACHE_DIR, 'accounts.json');

		// Check if accounts file exists
		if (!(await fileExists(accountsFile))) {
			methodLogger.debug('No accounts file found');
			return [];
		}

		// Read accounts file
		const data = await fs.readFile(accountsFile, 'utf8');
		const accounts = JSON.parse(data) as AwsSsoAccount[];
		methodLogger.debug(`Retrieved ${accounts.length} accounts from cache`);
		return accounts;
	} catch (error) {
		methodLogger.error('Error getting cached accounts', error);
		return [];
	}
}

/**
 * Save AWS accounts to cache
 * @param accounts List of AWS accounts to save
 */
export async function saveAccounts(accounts: AwsSsoAccount[]): Promise<void> {
	const methodLogger = Logger.forContext(
		'utils/aws.sso.cache.util.ts',
		'saveAccounts',
	);
	methodLogger.debug(`Saving ${accounts.length} accounts to cache`);

	try {
		// Ensure cache directory exists
		await ensureCacheDir();

		// Save accounts to file
		const accountsFile = path.join(CACHE_DIR, 'accounts.json');
		await fs.writeFile(
			accountsFile,
			JSON.stringify(accounts, null, 2),
			'utf8',
		);
		methodLogger.debug('Accounts saved to cache');
	} catch (error) {
		methodLogger.error('Error saving accounts to cache', error);
		throw error;
	}
}

/**
 * Get cached roles for an AWS account
 * @param accountId AWS account ID
 * @returns List of roles or empty array if none found
 */
export async function getCachedAccountRoles(
	accountId: string,
): Promise<AwsSsoAccountRole[]> {
	const methodLogger = Logger.forContext(
		'utils/aws.sso.cache.util.ts',
		'getCachedAccountRoles',
	);
	methodLogger.debug('Getting cached account roles', { accountId });

	try {
		// Generate roles file path
		const rolesFile = path.join(CACHE_DIR, `roles_${accountId}.json`);

		// Check if roles file exists
		if (!(await fileExists(rolesFile))) {
			methodLogger.debug('No roles file found for account', {
				accountId,
			});
			return [];
		}

		// Read roles file
		const data = await fs.readFile(rolesFile, 'utf8');
		const roles = JSON.parse(data) as AwsSsoAccountRole[];
		methodLogger.debug(`Retrieved ${roles.length} roles for account`, {
			accountId,
		});
		return roles;
	} catch (error) {
		methodLogger.error('Error getting cached account roles', error);
		return [];
	}
}

/**
 * Save roles for an AWS account to cache
 * @param account AWS account
 * @param roles List of roles to save
 */
export async function saveAccountRoles(
	account: AwsSsoAccount,
	roles: AwsSsoAccountRole[],
): Promise<void> {
	const methodLogger = Logger.forContext(
		'utils/aws.sso.cache.util.ts',
		'saveAccountRoles',
	);
	methodLogger.debug(`Saving ${roles.length} roles for account`, {
		accountId: account.accountId,
	});

	try {
		// Ensure cache directory exists
		await ensureCacheDir();

		// Save roles to file
		const rolesFile = path.join(
			CACHE_DIR,
			`roles_${account.accountId}.json`,
		);
		await fs.writeFile(rolesFile, JSON.stringify(roles, null, 2), 'utf8');
		methodLogger.debug('Account roles saved to cache');
	} catch (error) {
		methodLogger.error('Error saving account roles to cache', error);
		throw error;
	}
}

/**
 * Alias for saveCachedCredentials to maintain backward compatibility
 */
export const saveCredentials = saveCachedCredentials;

/**
 * Clear the cached SSO token
 */
export async function clearSsoToken(): Promise<void> {
	const methodLogger = Logger.forContext(
		'utils/aws.sso.cache.util.ts',
		'clearSsoToken',
	);
	methodLogger.debug('Clearing cached SSO token');

	try {
		// Check if token file exists
		if (await fileExists(TOKEN_FILE)) {
			// Delete the token file
			await fs.unlink(TOKEN_FILE);
			methodLogger.debug('SSO token cleared from cache');
		} else {
			methodLogger.debug('No token file found to clear');
		}
	} catch (error) {
		methodLogger.error('Error clearing SSO token', error);
		throw error;
	}
}

/**
 * Read the MCP AWS SSO cache file
 * @returns Cache data object or empty object if not found
 */
async function readMcpAwsSsoCache(): Promise<AwsSsoCacheFile> {
	const logger = Logger.forContext(
		'utils/aws.sso.cache.util.ts',
		'readMcpAwsSsoCache',
	);
	logger.debug('Reading MCP AWS SSO cache file from', {
		path: MCP_AWS_SSO_CACHE_FILE,
	});

	try {
		if (await fileExists(MCP_AWS_SSO_CACHE_FILE)) {
			const content = await fs.readFile(MCP_AWS_SSO_CACHE_FILE, 'utf8');
			const data = JSON.parse(content) as AwsSsoCacheFile;
			logger.debug('Successfully read MCP AWS SSO cache file');
			return data;
		} else {
			logger.debug('MCP AWS SSO cache file not found');
			return {};
		}
	} catch (error) {
		logger.error('Error reading MCP AWS SSO cache file', error);
		return {};
	}
}

/**
 * Gets account roles from the cache file
 * @returns Array of account roles data
 */
export async function getAccountRolesFromCache(): Promise<
	AwsSsoCacheFile['accountRoles']
> {
	const logger = Logger.forContext(
		'utils/aws.sso.cache.util.ts',
		'getAccountRolesFromCache',
	);
	logger.debug('Getting account roles from cache');

	try {
		const cacheData = await readMcpAwsSsoCache();
		if (!cacheData.accountRoles) {
			logger.debug('No account roles found in cache');
			return [];
		}

		logger.debug(
			`Found ${cacheData.accountRoles.length} accounts in cache`,
		);
		return cacheData.accountRoles;
	} catch (error) {
		logger.error('Error getting account roles from cache', error);
		return [];
	}
}
