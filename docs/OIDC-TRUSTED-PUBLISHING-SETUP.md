# OIDC Trusted Publishing Setup Guide

**Date:** February 4, 2026  
**Package:** @aashari/mcp-server-aws-sso  
**Migration:** NPM_TOKEN → OIDC Trusted Publishing

---

## Overview

This document describes the migration from NPM_TOKEN-based publishing to **OIDC Trusted Publishing** for automated npm releases.

### Why Migrate to OIDC?

**Before (NPM_TOKEN):**
- ❌ Expires every 90 days (as of December 9, 2025)
- ❌ Requires manual token rotation
- ❌ Stored as GitHub secret
- ❌ Can be compromised if leaked
- ❌ Maintenance burden

**After (OIDC Trusted Publishing):**
- ✅ Never expires
- ✅ Zero token management
- ✅ More secure (no secrets stored)
- ✅ Automatic authentication via GitHub Actions
- ✅ npm recommended approach (since Dec 2025)

---

## Migration Checklist

### ✅ Phase 1: Code Changes (COMPLETED)

**1. Update `package.json` dependencies:**
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.25.3",  // was 1.23.0
    "zod": "^4.3.6",                          // was 4.1.13
    "express": "^5.2.1",                      // was 5.1.0
    "commander": "^14.0.3"                    // was 14.0.2
  }
}
```

**2. Update `.github/workflows/ci-semantic-release.yml`:**
```yaml
permissions:
  contents: write
  issues: write
  pull-requests: write
  id-token: write  # ← NEW: Required for OIDC
```

**3. Remove NPM_TOKEN from workflow:**
```yaml
# Before
env:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  NPM_TOKEN: ${{ secrets.NPM_TOKEN }}  # ← REMOVED

# After
env:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  # NPM_TOKEN removed - using OIDC instead
```

**4. Verify `.releaserc.json` has npm publishing enabled:**
```json
{
  "plugins": [
    ["@semantic-release/npm", {
      "npmPublish": true,  // ← Must be true
      "pkgRoot": "."
    }]
  ]
}
```

### ⏳ Phase 2: npm Configuration (TODO)

**Configure trusted publisher on npmjs.com:**

1. **Login to npmjs.com**
   - Go to https://www.npmjs.com
   - Sign in with your account

2. **Navigate to package settings**
   - Go to https://www.npmjs.com/package/@aashari/mcp-server-aws-sso
   - Click "Settings" tab

3. **Add GitHub Actions as trusted publisher**
   - Scroll to "Publishing access" section
   - Click "Add trusted publisher"
   - Select "GitHub Actions"

4. **Configure exact values:**
   ```
   Provider: GitHub Actions
   Owner: aashari
   Repository: mcp-server-aws-sso
   Workflow: .github/workflows/ci-semantic-release.yml
   Environment: (leave empty)
   ```

5. **Save configuration**
   - Click "Add"
   - Verify the trusted publisher appears in the list

### ⏳ Phase 3: Test Release (TODO)

**Trigger a release to verify OIDC works:**

1. **Make a test commit:**
   ```bash
   git checkout -b feat/oidc-migration
   git add .
   git commit -m "feat: migrate to OIDC trusted publishing

   - Update MCP SDK 1.23.0 → 1.25.3
   - Update Zod 4.1.13 → 4.3.6
   - Update Express 5.1.0 → 5.2.1
   - Update Commander 14.0.2 → 14.0.3
   - Migrate from NPM_TOKEN to OIDC publishing
   - Clean root directory organization

   BREAKING CHANGE: Requires OIDC trusted publisher configuration on npmjs.com"
   ```

2. **Push to main:**
   ```bash
   git push origin feat/oidc-migration
   # Create PR, review, then merge to main
   ```

3. **Monitor GitHub Actions:**
   ```bash
   gh run watch
   ```

4. **Verify npm publication:**
   - Check https://www.npmjs.com/package/@aashari/mcp-server-aws-sso
   - Verify new version (v4.0.0) is published
   - Verify GitHub release is created

---

## Expected Release Flow

### 1. Semantic Release Analysis

When code is pushed to `main`, semantic-release analyzes commits:

```
feat: new feature        → Minor version (3.1.0 → 3.2.0)
fix: bug fix             → Patch version (3.1.0 → 3.1.1)
BREAKING CHANGE: ...     → Major version (3.1.0 → 4.0.0)
```

### 2. OIDC Authentication

GitHub Actions requests short-lived token from npm:

```
GitHub Actions → npm OIDC endpoint
  ├─ Validates workflow file path
  ├─ Validates repository owner/name
  └─ Issues temporary token (valid ~5 minutes)
```

### 3. npm Publication

semantic-release publishes using OIDC token:

```bash
npm publish --provenance
# Uses OIDC token automatically
# No NPM_TOKEN needed
```

### 4. Release Creation

Creates GitHub release with:
- Tag (e.g., v4.0.0)
- Release notes from CHANGELOG.md
- Assets (if configured)

---

## Troubleshooting

### Issue: "404 OIDC token exchange error - package not found"

**Cause:** Trusted publisher not configured on npmjs.com

**Solution:**
1. Go to https://www.npmjs.com/package/@aashari/mcp-server-aws-sso
2. Add GitHub Actions as trusted publisher
3. Verify exact values match workflow file

---

### Issue: "403 Forbidden - insufficient permissions"

**Cause:** Missing `id-token: write` permission in workflow

**Solution:**
```yaml
permissions:
  id-token: write  # ← Add this
  contents: write
  issues: write
  pull-requests: write
```

---

### Issue: "Release not triggered"

**Cause:** Commit message doesn't follow conventional commits

**Solution:**
Use proper commit format:
- `feat: description` for features
- `fix: description` for bug fixes
- `BREAKING CHANGE: description` for major versions
- `chore: description` for non-release commits

---

### Issue: "npm ERR! need auth"

**Cause:** OIDC not properly configured

**Solution:**
1. Verify trusted publisher configuration
2. Ensure workflow file path is exact
3. Check repository owner and name match
4. Verify no environment restriction (leave empty)

---

## Verification Steps

After successful release:

1. **Check npm package:**
   ```bash
   npm view @aashari/mcp-server-aws-sso
   ```

2. **Verify latest version:**
   ```bash
   npm info @aashari/mcp-server-aws-sso version
   ```

3. **Check GitHub release:**
   ```bash
   gh release list
   gh release view v4.0.0
   ```

4. **Test installation:**
   ```bash
   npm install -g @aashari/mcp-server-aws-sso@latest
   mcp-aws-sso --version
   ```

---

## Security Benefits

**OIDC Advantages:**

1. **No Long-Lived Secrets**
   - Tokens valid only during publish (~5 minutes)
   - No storage of credentials

2. **Cryptographic Verification**
   - npm verifies GitHub identity via OIDC
   - Prevents token theft/reuse

3. **Audit Trail**
   - All publishes linked to specific workflow runs
   - Provenance tracking

4. **Least Privilege**
   - Token only valid for specific package
   - Limited to exact repository/workflow

---

## References

- **npm OIDC Announcement:** https://github.blog/changelog/2023-04-19-npm-provenance-public-beta/
- **npm Trusted Publishing:** https://docs.npmjs.com/generating-provenance-statements
- **GitHub OIDC:** https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect
- **Semantic Release:** https://semantic-release.gitbook.io/semantic-release/

---

## Next Steps

1. **Configure OIDC on npmjs.com** (Phase 2)
2. **Create test commit** with conventional commit message
3. **Merge to main** and monitor release
4. **Verify publication** on npm and GitHub
5. **Document success** in CHANGELOG.md

---

**Status:** Ready for Phase 2 - npm configuration needed
