# MCP Server AWS SSO - Modernization Analysis

**Date:** February 4, 2026  
**Current Version:** v3.1.0  
**Last Release:** December 3, 2025

---

## Executive Summary

**mcp-server-aws-sso** is a production MCP server that enables AI assistants to interact with AWS accounts through AWS IAM Identity Center (SSO). The codebase is well-structured with a clean 6-layer architecture, but several dependencies need modernization to match current best practices.

### Health Status: 🟡 Good, Needs Modernization

- ✅ **Architecture**: Clean separation (CLI → Tools → Controllers → Services → Utils)
- ✅ **Testing**: Jest setup with test coverage
- ✅ **CI/CD**: Semantic-release with GitHub Actions
- ⚠️ **Dependencies**: Using older MCP SDK (v1.23.0 vs v1.25.3)
- ⚠️ **Authentication**: Still using NPM_TOKEN (should migrate to OIDC)
- ✅ **Documentation**: Comprehensive README with examples

---

## Project Overview

### Purpose
Enables AI systems (Claude, Cursor) to:
- Authenticate with AWS SSO using device authorization flow
- List AWS accounts and roles available to the user
- Execute AWS CLI commands with temporary SSO credentials
- Manage EC2 instances via SSM (Systems Manager)
- Run shell commands on EC2 instances securely

### Architecture (6 Layers)

```
┌─────────────────────────────────────────┐
│         CLI Layer (Commander)           │  ← aws.sso.*.cli.ts
├─────────────────────────────────────────┤
│      Tools Layer (MCP Tools)            │  ← aws.sso.*.tool.ts
├─────────────────────────────────────────┤
│   Controllers (Business Logic)          │  ← aws.sso.*.controller.ts
├─────────────────────────────────────────┤
│   Services (AWS SDK Integration)        │  ← vendor.aws.sso.*.service.ts
├─────────────────────────────────────────┤
│   Utils (Helpers & Formatters)          │  ← utils/*.util.ts
├─────────────────────────────────────────┤
│   Types (TypeScript Definitions)        │  ← types/*.types.ts
└─────────────────────────────────────────┘
```

### Key Features

1. **AWS SSO Authentication**
   - Device authorization flow (OAuth 2.0)
   - Automatic token refresh
   - Cached credentials (~/.aws/sso/cache/)

2. **Multi-Account Management**  
   - List all accessible AWS accounts
   - Show available roles per account
   - Switch between accounts seamlessly

3. **AWS CLI Execution**
   - Execute any AWS CLI command
   - Automatic credential injection
   - Support for JMESPath filtering
   - Output in JSON or TOON format

4. **EC2 Management**
   - List EC2 instances across accounts
   - Execute shell commands via SSM
   - Monitor instance status
   - Disk usage checks

### File Structure

```
mcp-server-aws-sso/
├── src/
│   ├── index.ts                    # Server entry point (246 lines)
│   ├── cli/                        # CLI commands
│   │   ├── index.ts                # CLI router
│   │   ├── aws.sso.auth.cli.ts     # Authentication commands
│   │   ├── aws.sso.accounts.cli.ts # Account listing
│   │   ├── aws.sso.exec.cli.ts     # AWS CLI execution
│   │   └── aws.sso.ec2.cli.ts      # EC2 management
│   ├── tools/                      # MCP tool registrations
│   │   ├── aws.sso.auth.tool.ts    # SSO login tool
│   │   ├── aws.sso.accounts.tool.ts# Account listing tool
│   │   ├── aws.sso.exec.tool.ts    # CLI execution tool
│   │   └── aws.sso.ec2.tool.ts     # EC2 management tool
│   ├── controllers/                # Business logic layer
│   │   ├── aws.sso.auth.controller.ts
│   │   ├── aws.sso.accounts.controller.ts
│   │   ├── aws.sso.exec.controller.ts
│   │   └── aws.sso.ec2.controller.ts
│   ├── services/                   # AWS SDK integration
│   │   ├── vendor.aws.sso.auth.service.ts
│   │   ├── vendor.aws.sso.accounts.service.ts
│   │   ├── vendor.aws.sso.exec.service.ts
│   │   └── vendor.aws.sso.ec2.service.ts
│   ├── utils/                      # Utilities
│   │   ├── config.util.ts          # Environment config
│   │   ├── logger.util.ts          # Logging
│   │   ├── error.util.ts           # Error handling
│   │   ├── formatter.util.ts       # Output formatting
│   │   ├── toon.util.ts            # TOON format
│   │   └── aws.sso.cache.util.ts   # Credential caching
│   └── types/                      # Type definitions
└── scripts/
    ├── ensure-executable.js        # Make dist/index.js executable
    └── update-version.js           # Version sync script
```

---

## Dependency Analysis

### Current vs Latest Versions

| Package | Current | Latest | Gap | Notes |
|---------|---------|--------|-----|-------|
| **@modelcontextprotocol/sdk** | 1.23.0 | 1.25.3 | 🔴 2 minor | Missing registerTool API, improvements |
| **zod** | 4.1.13 | 4.3.6 | 🟡 2 patch | New features: fromJSONSchema, xor, looseRecord |
| **express** | 5.1.0 | 5.2.1 | 🟡 1 minor | Bug fixes and improvements |
| **commander** | 14.0.2 | 14.0.3 | 🟢 1 patch | Minor CLI improvements |
| **@aws-sdk/\*** | 3.893.0 | 3.893.0 | ✅ Current | AWS SDK v3 up to date |
| **@toon-format/toon** | 2.0.1 | 2.1.0 | 🟡 1 minor | Latest TOON features |

### Critical Updates Needed

1. **MCP SDK 1.23.0 → 1.25.3** (Important)
   - New `registerTool()` API (replacing manual registration)
   - Better TypeScript support
   - Performance improvements
   - Preparing for SDK v2 (Q1 2026)

2. **Zod 4.1.13 → 4.3.6** (Recommended)
   - `z.fromJSONSchema()` - Convert JSON Schema to Zod
   - `z.xor()` - Exclusive OR validation
   - `z.looseRecord()` - More flexible object validation
   - `z.exactOptional()` - Precise optional handling

3. **Express 5.1.0 → 5.2.1** (Optional)
   - Security fixes
   - Minor bug fixes

---

## Code Quality Assessment

### Strengths ✅

1. **Clean Architecture**
   - Well-separated layers (CLI → Tools → Controllers → Services)
   - Single responsibility principle followed
   - Easy to test and modify

2. **Error Handling**
   - Comprehensive error utilities
   - Error detection and formatting
   - User-friendly error messages

3. **Testing**
   - Jest setup with 47 test files
   - Test utilities for CLI and services
   - Coverage reporting configured

4. **Logging**
   - Context-aware logger with file/function tracking
   - Debug mode support
   - Structured logging

5. **Type Safety**
   - Full TypeScript implementation
   - Zod schema validation
   - Comprehensive type definitions

### Areas for Improvement ⚠️

1. **Dependency Age**
   - MCP SDK is 2 versions behind
   - Missing new Zod features
   - Not using latest patterns

2. **No OIDC Publishing**
   - Still using NPM_TOKEN (expires every 90 days as of Dec 2025)
   - Should migrate to OIDC trusted publishing (zero maintenance)

3. **Root Directory**
   - Has `.trigger-ci` and `.gitkeep` (cleanup needed)
   - No `docs/` directory for supplementary documentation

4. **No ResourceLink Pattern**
   - Could benefit from ResourceLink for token efficiency
   - Large AWS responses could be cached as resources

5. **No Prompts Support**
   - MCP prompts primitive not utilized
   - Could provide pre-built prompts for common AWS tasks

---

## Testing Status

### Current Test Setup

```json
"test": "jest --passWithNoTests",
"test:coverage": "jest --coverage",
"test:cli": "jest src/cli/.*\\.cli\\.test\\.ts --runInBand"
```

### Test Files Found

- ✅ `aws.sso.auth.cli.test.ts` - Authentication CLI tests
- ✅ `aws.sso.accounts.cli.test.ts` - Account listing tests
- ✅ `aws.sso.exec.cli.test.ts` - Command execution tests
- ✅ `aws.sso.auth.controller.test.ts` - Auth controller tests
- ✅ `aws.sso.accounts.controller.test.ts` - Accounts controller tests
- ✅ `aws.sso.exec.controller.test.ts` - Exec controller tests
- ✅ `vendor.aws.sso.auth.service.test.ts` - Auth service tests
- ✅ `vendor.aws.sso.accounts.service.test.ts` - Accounts service tests
- ✅ `vendor.aws.sso.exec.service.test.ts` - Exec service tests

**Note:** Using `--passWithNoTests` flag suggests some test files may not have tests yet.

---

## CI/CD & Release Process

### Current Setup

**Workflow:** `.github/workflows/ci-semantic-release.yml`
- ✅ Node.js 22
- ✅ npm ci (clean install)
- ✅ Build and test
- ⚠️ Uses NPM_TOKEN (should migrate to OIDC)
- ✅ Semantic-release automation

**Release Config:** `.releaserc.json`
- ✅ Conventional commit analysis
- ✅ Changelog generation
- ✅ GitHub release creation
- ✅ npm publishing enabled
- ⚠️ No OIDC configuration

### Last Successful Release

- **Version:** v3.1.0
- **Date:** December 3, 2025
- **Feature:** Raw response logging with truncation
- **Status:** ✅ Published successfully

---

## Security & Authentication

### AWS Credentials

The server handles AWS credentials securely:
- ✅ OAuth 2.0 device authorization flow
- ✅ Cached credentials in `~/.aws/sso/cache/`
- ✅ Automatic token refresh
- ✅ No plaintext credentials stored
- ✅ Temporary credentials only

### npm Publishing

- ⚠️ **Current:** Uses NPM_TOKEN secret (expires every 90 days)
- ✅ **Should be:** OIDC trusted publishing (zero token management)

**Impact of Dec 2025 npm changes:**
- Classic tokens permanently revoked
- Granular tokens limited to 90 days
- OIDC is the recommended long-term solution

---

## Modernization Roadmap

### Phase 1: Dependency Updates (High Priority)

1. **Update MCP SDK to v1.25.3**
   - Update import paths if needed
   - Test dual transport (STDIO & HTTP)
   - Verify tool registration works

2. **Update Zod to v4.3.6**
   - Review schema definitions
   - Consider using new features where applicable
   - Run tests to ensure compatibility

3. **Update Express to v5.2.1**
   - Minor version update
   - Should be straightforward

4. **Update Commander to v14.0.3**
   - Patch update
   - No breaking changes expected

### Phase 2: OIDC Migration (Critical)

1. **Configure OIDC on npmjs.com**
   - Add GitHub Actions as trusted publisher
   - Configure repository and workflow path

2. **Update GitHub Actions workflow**
   - Add `id-token: write` permission
   - Remove NPM_TOKEN dependency

3. **Test release process**
   - Create test commit
   - Verify OIDC authentication works
   - Confirm npm publication succeeds

### Phase 3: Cleanup & Organization (Optional)

1. **Root directory cleanup**
   - Remove `.trigger-ci` and `.gitkeep`
   - Create `docs/` directory
   - Move supplementary documentation

2. **Add modern patterns**
   - Consider ResourceLink for large responses
   - Add prompt templates for common AWS tasks
   - Document patterns in `docs/`

### Phase 4: Testing & Documentation

1. **Ensure all tests pass**
   - Run full test suite
   - Fix any failing tests
   - Add tests where missing

2. **Update documentation**
   - Document new features
   - Update migration guides
   - Add troubleshooting section

---

## Comparison with boilerplate-mcp-server

| Aspect | mcp-server-aws-sso | boilerplate-mcp-server | Notes |
|--------|-------------------|----------------------|-------|
| **MCP SDK** | 1.23.0 | 1.25.3 | AWS SSO behind by 2 versions |
| **Zod** | 4.1.13 | 4.3.6 | AWS SSO behind on new features |
| **Express** | 5.1.0 | 5.2.1 | Minor version difference |
| **Architecture** | 6 layers | 7 layers (includes prompts/) | AWS SSO missing prompts layer |
| **OIDC Publishing** | ❌ No | ✅ Yes | AWS SSO needs migration |
| **ResourceLink** | ❌ No | ✅ Yes | AWS SSO could benefit |
| **Prompts** | ❌ No | ✅ Yes | AWS SSO could add AWS task prompts |
| **Docs Organization** | ❌ Root | ✅ docs/ | AWS SSO needs cleanup |
| **Security Docs** | ❌ No | ✅ SECURITY.md | AWS SSO could add |
| **Last Release** | Dec 3, 2025 | Feb 4, 2026 (today) | Both active |

---

## Risk Assessment

### Low Risk ⚠️
- Dependency updates (minor/patch versions)
- Root directory cleanup
- Documentation improvements

### Medium Risk ⚠️
- MCP SDK update (2 minor versions)
- Zod update (may need schema reviews)
- Adding new patterns (prompts, ResourceLink)

### High Risk (but Necessary) 🔴
- OIDC migration (requires npm configuration + workflow changes)
- **Mitigation:** Follow exact same pattern as boilerplate-mcp-server
- **Benefit:** Long-term solution with zero token management

---

## Recommended Action Plan

### Immediate (This Session)

1. ✅ **Analysis Complete** - You're reading this
2. **Dependency Audit** - Check for outdated dependencies
3. **OIDC Configuration** - Prepare npm trusted publisher setup
4. **Create Branch** - `feat/modernization-v4`

### Step-by-Step Modernization

```bash
# 1. Create modernization branch
git checkout -b feat/modernization-v4

# 2. Update dependencies
npm install @modelcontextprotocol/sdk@^1.25.3 \
            zod@^4.3.6 \
            express@^5.2.1 \
            commander@^14.0.3 \
            @toon-format/toon@^2.1.0

# 3. Update workflow for OIDC
# - Add id-token: write permission
# - Remove NPM_TOKEN

# 4. Clean root directory
rm -f .trigger-ci .gitkeep
mkdir -p docs
# Move documentation

# 5. Test everything
npm run build
npm test
npm run lint

# 6. Configure OIDC on npmjs.com
# (follow exact steps from boilerplate-mcp-server)

# 7. Commit and push
git add .
git commit -m "feat: modernize dependencies and migrate to OIDC publishing

- Update MCP SDK 1.23.0 → 1.25.3
- Update Zod 4.1.13 → 4.3.6
- Update Express 5.1.0 → 5.2.1
- Migrate to OIDC trusted publishing
- Clean root directory organization

BREAKING CHANGE: Requires OIDC configuration on npmjs.com"

git push origin feat/modernization-v4
```

---

## Success Criteria

✅ **Phase 1 Complete When:**
- All dependencies updated to latest versions
- `npm run build` succeeds
- `npm test` passes
- No ESLint errors

✅ **Phase 2 Complete When:**
- OIDC configured on npmjs.com
- Workflow updated with id-token permission
- Test release succeeds
- Package published to npm via OIDC

✅ **Phase 3 Complete When:**
- Root directory cleaned
- Documentation organized in docs/
- All tests passing

✅ **Full Modernization Complete When:**
- New version (v4.0.0) released
- OIDC publishing working
- Zero dependency warnings
- Documentation updated

---

## Conclusion

**mcp-server-aws-sso is production-ready but needs modernization** to align with latest MCP ecosystem patterns and avoid future npm authentication issues.

**Priority Order:**
1. 🔴 **High:** OIDC migration (avoids future auth failures)
2. 🟡 **Medium:** Dependency updates (MCP SDK, Zod)
3. 🟢 **Low:** Cleanup & organization (quality of life)

**Time Estimate:**
- Dependency updates: 30 minutes
- OIDC migration: 15 minutes (if following boilerplate pattern)
- Testing & validation: 30 minutes
- **Total: ~1.5 hours**

**Ready to proceed with modernization?**
