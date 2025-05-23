import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Logger } from './logger.util.js';
import { CLI_NAME } from './constants.util.js';
import {
	AwsCredentials,
	SsoToken,
	SsoTokenSchema,
	AwsCredentialsSchema,
	DeviceAuthorizationInfo,
	DeviceAuthorizationInfoSchema,
} from '../services/vendor.aws.sso.types.js';
import { AwsSsoAccount, AwsSsoAccountRole } from '../services/aws.sso.types.js';
import { z } from 'zod';

// Define the cache directory for MCP server
const HOME_DIR = os.homedir();
const CACHE_DIR = path.join(HOME_DIR, '.mcp-server', CLI_NAME);
const TOKEN_FILE = path.join(CACHE_DIR, 'token.json');

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
			methodLogger.debug(`Cache directory created: ${CACHE_DIR}`);
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
		try {
			// Parse and validate the token with Zod
			const token = SsoTokenSchema.parse(JSON.parse(tokenContent));

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
			if (error instanceof z.ZodError) {
				methodLogger.error('Token validation failed', error);
			} else {
				methodLogger.error('Error parsing token from cache', error);
			}
			return undefined;
		}
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

		// Validate token with Zod schema before saving
		const validatedToken = SsoTokenSchema.parse(token);

		// Save token to file
		await fs.writeFile(
			TOKEN_FILE,
			JSON.stringify(validatedToken, null, 2),
			'utf8',
		);
		methodLogger.debug('Token saved to cache');
	} catch (error) {
		if (error instanceof z.ZodError) {
			methodLogger.error('Token validation failed', error);
		} else {
			methodLogger.error('Error saving token to cache', error);
		}
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
		try {
			// Parse and validate with Zod schema
			const credentials = AwsCredentialsSchema.parse(JSON.parse(data));

			methodLogger.debug('Retrieved credentials from cache', {
				accountId,
				roleName,
				expiration: credentials.expiration,
			});

			return credentials;
		} catch (error) {
			if (error instanceof z.ZodError) {
				methodLogger.error('Credentials validation failed', error);
			} else {
				methodLogger.error(
					'Error parsing credentials from cache',
					error,
				);
			}
			return undefined;
		}
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

		// Validate credentials with Zod schema
		const validatedCredentials = AwsCredentialsSchema.parse(credentials);

		// Generate credentials file path
		const key = `${accountId}_${roleName}`;
		const credentialsFile = path.join(CACHE_DIR, `${key}.json`);

		// Save credentials to file
		await fs.writeFile(
			credentialsFile,
			JSON.stringify(validatedCredentials, null, 2),
			'utf8',
		);
		methodLogger.debug('Credentials saved to cache');
	} catch (error) {
		if (error instanceof z.ZodError) {
			methodLogger.error('Credentials validation failed', error);
		} else {
			methodLogger.error('Error saving credentials to cache', error);
		}
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

		// Validate device authorization info with Zod schema
		const validatedInfo = DeviceAuthorizationInfoSchema.parse(info);

		// Save device authorization info to file
		const deviceAuthFile = path.join(CACHE_DIR, 'device-auth.json');
		await fs.writeFile(
			deviceAuthFile,
			JSON.stringify(validatedInfo, null, 2),
			'utf8',
		);
		methodLogger.debug('Device authorization info cached');
	} catch (error) {
		if (error instanceof z.ZodError) {
			methodLogger.error(
				'Device authorization info validation failed',
				error,
			);
		} else {
			methodLogger.error(
				'Error caching device authorization info',
				error,
			);
		}
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
		try {
			// Parse and validate with Zod schema
			const deviceInfo = DeviceAuthorizationInfoSchema.parse(
				JSON.parse(data),
			);

			methodLogger.debug(
				'Retrieved device authorization info from cache',
			);
			return deviceInfo;
		} catch (error) {
			if (error instanceof z.ZodError) {
				methodLogger.error(
					'Device authorization info validation failed',
					error,
				);
			} else {
				methodLogger.error(
					'Error parsing device authorization info from cache',
					error,
				);
			}
			return undefined;
		}
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
 * Save data to the MCP AWS SSO cache file
 * @param data The data to save
 */
