#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Use dynamic import meta for ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const entryPoint = path.join(rootDir, 'dist', 'index.js');

try {
	if (fs.existsSync(entryPoint)) {
		// Ensure the file is executable (cross-platform)
		const currentMode = fs.statSync(entryPoint).mode;
		// Check if executable bits are set (user, group, or other)
		// Mode constants differ slightly across platforms, checking broadly
		const isExecutable =
			currentMode & fs.constants.S_IXUSR ||
			currentMode & fs.constants.S_IXGRP ||
			currentMode & fs.constants.S_IXOTH;

		if (!isExecutable) {
			// Set permissions to 755 (rwxr-xr-x) if not executable
			fs.chmodSync(entryPoint, 0o755);
			console.log(
				`Made ${path.relative(rootDir, entryPoint)} executable`,
			);
		} else {
			// console.log(`${path.relative(rootDir, entryPoint)} is already executable`);
		}
	} else {
		// console.warn(`${path.relative(rootDir, entryPoint)} not found, skipping chmod`);
	}
} catch (err) {
	// console.warn(`Failed to set executable permissions: ${err.message}`);
	// We use '|| true' in package.json, so no need to exit here
}
