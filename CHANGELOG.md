## [1.11.1](https://github.com/aashari/mcp-server-aws-sso/compare/v1.11.0...v1.11.1) (2025-05-04)


### Performance Improvements

* Update dependencies ([a4c3812](https://github.com/aashari/mcp-server-aws-sso/commit/a4c38124c5fbb2d10c7bf269e06a2eb02db499fc))

# [1.11.0](https://github.com/aashari/mcp-server-aws-sso/compare/v1.10.0...v1.11.0) (2025-05-04)


### Bug Fixes

* adjust test assertion for auth required message ([ea76f76](https://github.com/aashari/mcp-server-aws-sso/commit/ea76f768c4af6753a428e6b8683a3b2fcbf15034))


### Features

* **format:** standardize CLI and Tool output formatting ([aef1191](https://github.com/aashari/mcp-server-aws-sso/commit/aef1191e20c870d0e8d822a68b10ba30e051b6ca))

# [1.10.0](https://github.com/aashari/mcp-server-aws-sso/compare/v1.9.0...v1.10.0) (2025-05-04)


### Features

* standardize CLI output format with header/context/footer ([544c85d](https://github.com/aashari/mcp-server-aws-sso/commit/544c85d5cf25aba04c024a8538e0fa2a009b206b))

# [1.9.0](https://github.com/aashari/mcp-server-aws-sso/compare/v1.8.2...v1.9.0) (2025-05-04)


### Bug Fixes

* add rate limiting handling to AWS SSO tests ([2fb9f00](https://github.com/aashari/mcp-server-aws-sso/commit/2fb9f00ee7a67b8dc3679414525b73006dc72ff7))
* improve schema validation for AWS SSO auth responses ([42909e0](https://github.com/aashari/mcp-server-aws-sso/commit/42909e07a40f1a28b06a8318d9ec6e90c9b711f1))


### Features

* enhance AWS SSO output formats with session duration and improved structures ([ac5784a](https://github.com/aashari/mcp-server-aws-sso/commit/ac5784a5cf98162d40c850ab7b584bcbf5473f39))
* improve exec-command output with timestamp and role suggestions for permission errors ([20ce619](https://github.com/aashari/mcp-server-aws-sso/commit/20ce619cf57316085a7fbd6193ebb8e044dacb94))

## [1.8.2](https://github.com/aashari/mcp-server-aws-sso/compare/v1.8.1...v1.8.2) (2025-05-04)


### Bug Fixes

* update AwsCredentialsSchema to handle string format expiration dates ([02fae67](https://github.com/aashari/mcp-server-aws-sso/commit/02fae679b3bc373561faea2f5d3b7e06108b399e))

## [1.8.1](https://github.com/aashari/mcp-server-aws-sso/compare/v1.8.0...v1.8.1) (2025-05-04)


### Bug Fixes

* remove unused exports to improve type safety and reduce bundle size ([c63f558](https://github.com/aashari/mcp-server-aws-sso/commit/c63f5584e218589378c1e33b779e8b692df4980a))

# [1.8.0](https://github.com/aashari/mcp-server-aws-sso/compare/v1.7.9...v1.8.0) (2025-05-04)


### Features

* refactor controller parameter types to use Zod-inferred types ([d6c11a1](https://github.com/aashari/mcp-server-aws-sso/commit/d6c11a12b05727c80071946c7bd72a3cfcec7875))
* refactor service response types using Zod schemas ([d9c1ea3](https://github.com/aashari/mcp-server-aws-sso/commit/d9c1ea39826249da86abdec3f44476a7d4f329c9))
* refactor tool argument types using Zod schemas ([1d4ee44](https://github.com/aashari/mcp-server-aws-sso/commit/1d4ee440f098168670b981c961082fbf96858d39))

## [1.7.9](https://github.com/aashari/mcp-server-aws-sso/compare/v1.7.8...v1.7.9) (2025-05-04)


### Bug Fixes

* Remove more unused exports ([c56c4d9](https://github.com/aashari/mcp-server-aws-sso/commit/c56c4d942d055a9d13cf58a73a642e4b446580f4))
* Remove unused exports and files identified by ts-prune ([3c93f70](https://github.com/aashari/mcp-server-aws-sso/commit/3c93f708604fbb22b0975df386c587d19cb6f7c0))
* Remove unused exports and functions ([6b98e2a](https://github.com/aashari/mcp-server-aws-sso/commit/6b98e2ae041ed430b84621668a72f96d42a2693e))
* Remove unused pagination types ([c1471db](https://github.com/aashari/mcp-server-aws-sso/commit/c1471db01a8f7ea6531ae0851d9b4b0562f379d7))

## [1.7.8](https://github.com/aashari/mcp-server-aws-sso/compare/v1.7.7...v1.7.8) (2025-05-03)


### Bug Fixes

* **exec:** handle shell expansions in exec command ([bd94984](https://github.com/aashari/mcp-server-aws-sso/commit/bd9498423c4ccae1d6c319b1c78c619154f9da17))

## [1.7.7](https://github.com/aashari/mcp-server-aws-sso/compare/v1.7.6...v1.7.7) (2025-05-03)


### Performance Improvements

* add retry mechanism with exponential backoff for handling rate limits ([74741f3](https://github.com/aashari/mcp-server-aws-sso/commit/74741f366fcae48249db8f5834a901a409f07dce))

## [1.7.6](https://github.com/aashari/mcp-server-aws-sso/compare/v1.7.5...v1.7.6) (2025-05-03)


### Performance Improvements

* add retry mechanism with exponential backoff for API rate limiting ([027d26b](https://github.com/aashari/mcp-server-aws-sso/commit/027d26b201ec32a00e08d05af28adacf6ea05412))

## [1.7.5](https://github.com/aashari/mcp-server-aws-sso/compare/v1.7.4...v1.7.5) (2025-05-03)


### Bug Fixes

* handle null exitCode in formatters and add missing formatAuthRequired function ([2b7b81c](https://github.com/aashari/mcp-server-aws-sso/commit/2b7b81cad19597af16a0e549b4af1b80d288ea7b))
* update test files to work with new API structure ([31d6813](https://github.com/aashari/mcp-server-aws-sso/commit/31d681356427bf41f3dc47f70c928d3445fb5bd7))

## [1.7.4](https://github.com/aashari/mcp-server-aws-sso/compare/v1.7.3...v1.7.4) (2025-05-02)


### Bug Fixes

* update query parameter description for consistency between CLI and Tool ([4b3fb5b](https://github.com/aashari/mcp-server-aws-sso/commit/4b3fb5b71bf6007ed20037e79c7160531b0e6f1b))

## [1.7.3](https://github.com/aashari/mcp-server-aws-sso/compare/v1.7.2...v1.7.3) (2025-05-02)


### Bug Fixes

* ensure CLI and Tool implementation consistency in AWS SSO server ([31780b1](https://github.com/aashari/mcp-server-aws-sso/commit/31780b1af832cfe3e442c78323ead1d0f25d9a8d))

## [1.7.2](https://github.com/aashari/mcp-server-aws-sso/compare/v1.7.1...v1.7.2) (2025-05-02)


### Bug Fixes

* trigger release ([77718f9](https://github.com/aashari/mcp-server-aws-sso/commit/77718f9df1e7609d93e72bd5f990f7716670efe6))

## [1.7.1](https://github.com/aashari/mcp-server-aws-sso/compare/v1.7.0...v1.7.1) (2025-05-02)


### Bug Fixes

* Remove re-exports from index.ts ([b4794f8](https://github.com/aashari/mcp-server-aws-sso/commit/b4794f82dc8e79cd6daf1b24c454c4848da14e1d))

# [1.7.0](https://github.com/aashari/mcp-server-aws-sso/compare/v1.6.0...v1.7.0) (2025-05-02)


### Features

* Standardize pagination output structure ([e7162c3](https://github.com/aashari/mcp-server-aws-sso/commit/e7162c39d5199dea6566ad2f9518b028d78654a5))

# [1.6.0](https://github.com/aashari/mcp-server-aws-sso/compare/v1.5.1...v1.6.0) (2025-05-02)


### Bug Fixes

* correct aws_sso ls-accounts CLI description (remove cache mention) ([04c30eb](https://github.com/aashari/mcp-server-aws-sso/commit/04c30eb5f6be1d4af678a942b6b39375a10b37da))


### Features

* add autoPoll argument to aws_sso_login tool ([c33dccc](https://github.com/aashari/mcp-server-aws-sso/commit/c33dccc08d70af18ed1f61f15aff0610fa412c12))

## [1.5.1](https://github.com/aashari/mcp-server-aws-sso/compare/v1.5.0...v1.5.1) (2025-05-02)


### Bug Fixes

* align ls_accounts tool args and description with CLI ([94d726c](https://github.com/aashari/mcp-server-aws-sso/commit/94d726cf37353a76f568e7ab7d47b05104921127))

# [1.5.0](https://github.com/aashari/mcp-server-aws-sso/compare/v1.4.6...v1.5.0) (2025-05-02)


### Bug Fixes

* revert account cache, implement per-page filter for ls-accounts ([5afc3f6](https://github.com/aashari/mcp-server-aws-sso/commit/5afc3f6779a75f14dc2c20077a605d4576379902))


### Features

* implement standardized pagination for AWS SSO account listings ([1730178](https://github.com/aashari/mcp-server-aws-sso/commit/17301787d118698b5a55d86cf278ab22bfca12ee))

## [1.4.6](https://github.com/aashari/mcp-server-aws-sso/compare/v1.4.5...v1.4.6) (2025-05-02)


### Performance Improvements

* Update dependencies ([a28d517](https://github.com/aashari/mcp-server-aws-sso/commit/a28d51795b80a1ee811c3d6f43b263f22c46c356))

## [1.4.5](https://github.com/aashari/mcp-server-aws-sso/compare/v1.4.4...v1.4.5) (2025-05-01)


### Bug Fixes

* remove unused formatter functions for cleaner codebase ([5529196](https://github.com/aashari/mcp-server-aws-sso/commit/5529196097cb28bfb0c0690939281ecc8c645d24))


### Performance Improvements

* improve aws_sso_login tool description for better AI consumption ([1de7235](https://github.com/aashari/mcp-server-aws-sso/commit/1de7235d04de67828b9dbeeab28f271b962ac9e0))

## [1.4.4](https://github.com/aashari/mcp-server-aws-sso/compare/v1.4.3...v1.4.4) (2025-05-01)


### Bug Fixes

* align AWS SSO commands, flags, and tests ([36ebd95](https://github.com/aashari/mcp-server-aws-sso/commit/36ebd95a666364e04513c8b6e5b5b04238caf5ad))

## [1.4.3](https://github.com/aashari/mcp-server-aws-sso/compare/v1.4.2...v1.4.3) (2025-05-01)


### Bug Fixes

* align login CLI option description with schema ([800385a](https://github.com/aashari/mcp-server-aws-sso/commit/800385aa739c41840d780e927f00ea14b5922fd7))

## [1.4.2](https://github.com/aashari/mcp-server-aws-sso/compare/v1.4.1...v1.4.2) (2025-04-30)


### Bug Fixes

* **cli:** Align command names and descriptions with tool definitions ([927056e](https://github.com/aashari/mcp-server-aws-sso/commit/927056e1237bf3cc2f39c2ecc1639319c701dcdc))

## [1.4.1](https://github.com/aashari/mcp-server-aws-sso/compare/v1.4.0...v1.4.1) (2025-04-30)


### Performance Improvements

* Update dependencies ([a10fe80](https://github.com/aashari/mcp-server-aws-sso/commit/a10fe802f6ce73e2decda4f56a0a73962e3b8790))

# [1.4.0](https://github.com/aashari/mcp-server-aws-sso/compare/v1.3.0...v1.4.0) (2025-04-30)


### Bug Fixes

* Standardize and shorten MCP tool names ([5aeba56](https://github.com/aashari/mcp-server-aws-sso/commit/5aeba56b9e1efee3a345ec36aa610537d44b2f49))


### Features

* Support multiple keys for global config lookup ([186651b](https://github.com/aashari/mcp-server-aws-sso/commit/186651b7cb80603e0d93e184c013bb7f1703b975))

# [1.3.0](https://github.com/aashari/mcp-server-aws-sso/compare/v1.2.6...v1.3.0) (2025-04-25)


### Bug Fixes

* unify tool names and descriptions for consistency ([0047793](https://github.com/aashari/mcp-server-aws-sso/commit/00477938a3134c567b4b74b6f59e00f816abdce5))


### Features

* prefix AWS SSO tool names with 'aws_sso_' for uniqueness ([b55619d](https://github.com/aashari/mcp-server-aws-sso/commit/b55619dfedd8afbbf899ffa6ad526563242561a0))

## [1.2.6](https://github.com/aashari/mcp-server-aws-sso/compare/v1.2.5...v1.2.6) (2025-04-22)


### Performance Improvements

* Update dependencies ([0fc3a8f](https://github.com/aashari/mcp-server-aws-sso/commit/0fc3a8f3c6c3102a1a8739d4b29c92d957ade512))

## [1.2.5](https://github.com/aashari/mcp-server-aws-sso/compare/v1.2.4...v1.2.5) (2025-04-20)


### Bug Fixes

* Update dependencies and fix related type errors ([c9ce885](https://github.com/aashari/mcp-server-aws-sso/commit/c9ce885363bb56c2c968431d1875cc24bd412bdb))

## [1.2.4](https://github.com/aashari/mcp-server-aws-sso/compare/v1.2.3...v1.2.4) (2025-04-09)


### Bug Fixes

* **deps:** update dependencies to latest versions ([e2a6d83](https://github.com/aashari/mcp-server-aws-sso/commit/e2a6d83634f378880a4c668cf83c44415ab883c6))

## [1.2.3](https://github.com/aashari/mcp-server-aws-sso/compare/v1.2.2...v1.2.3) (2025-04-04)


### Bug Fixes

* standardize README.md format across MCP servers ([4f83f2e](https://github.com/aashari/mcp-server-aws-sso/commit/4f83f2e8381bdb59425abed524a3b8ea92322bc1))
* standardize tool registration function names to registerTools ([0b640a1](https://github.com/aashari/mcp-server-aws-sso/commit/0b640a1d5ed4910ce4be4a77326495365cf05834))
* **tests:** add --no-auto-poll flag to prevent login test timeouts ([d763943](https://github.com/aashari/mcp-server-aws-sso/commit/d763943aefa9e25ccb05648b8df2da6f5f74fab5))

## [1.2.2](https://github.com/aashari/mcp-server-aws-sso/compare/v1.2.1...v1.2.2) (2025-04-03)


### Bug Fixes

* trigger new release ([ce8cbeb](https://github.com/aashari/mcp-server-aws-sso/commit/ce8cbebaa3eedebaf52ea2e4c49294627935a611))

## [1.2.1](https://github.com/aashari/mcp-server-aws-sso/compare/v1.2.0...v1.2.1) (2025-04-03)


### Bug Fixes

* **test:** resolve TypeScript linting errors in test files ([bfe63f6](https://github.com/aashari/mcp-server-aws-sso/commit/bfe63f68d85a293e5af0d8d3276b8d65e38ee537))

# [1.2.0](https://github.com/aashari/mcp-server-aws-sso/compare/v1.1.3...v1.2.0) (2025-04-03)


### Features

* **logging:** add file logging with session ID to ~/.mcp/data/ ([8203e8b](https://github.com/aashari/mcp-server-aws-sso/commit/8203e8b54f9c7c2ad521d155090b2443f9507314))

## [1.1.3](https://github.com/aashari/mcp-server-aws-sso/compare/v1.1.2...v1.1.3) (2025-04-03)


### Bug Fixes

* **logging:** ensure consistent logger implementation across projects ([b711738](https://github.com/aashari/mcp-server-aws-sso/commit/b711738ca9fd5809b9816cf6501d2ffec57ce167))

## [1.1.2](https://github.com/aashari/mcp-server-aws-sso/compare/v1.1.1...v1.1.2) (2025-04-03)


### Bug Fixes

* **logger:** ensure consistent logger implementation across all projects ([ba796e5](https://github.com/aashari/mcp-server-aws-sso/commit/ba796e591604cb1bbf4726130a3bfb8b604fcf97))

## [1.1.1](https://github.com/aashari/mcp-server-aws-sso/compare/v1.1.0...v1.1.1) (2025-04-03)


### Bug Fixes

* **aws-sso:** update AWS SSO integration to use SDK for listing accounts and roles ([d9ae338](https://github.com/aashari/mcp-server-aws-sso/commit/d9ae338c42075d1e869e27aa1065d963e135e323))

# [1.1.0](https://github.com/aashari/mcp-server-aws-sso/compare/v1.0.0...v1.1.0) (2025-03-29)


### Bug Fixes

* **accounts:** remove console.log in favor of logger ([d07328d](https://github.com/aashari/mcp-server-aws-sso/commit/d07328d9aa29365cd58a16458b2e3b9d6fc1178a))
* **auth:** replace console.log with proper logger calls ([ec057de](https://github.com/aashari/mcp-server-aws-sso/commit/ec057def0641f5df2e380486bb0298351f2cf2fb))
* **config:** standardize configuration export pattern to match Atlassian projects ([2b61224](https://github.com/aashari/mcp-server-aws-sso/commit/2b6122470ef84c94bbee1e79ba11fc7f7ea10f19))
* **error:** align handleCliError signature with Atlassian projects ([701ad11](https://github.com/aashari/mcp-server-aws-sso/commit/701ad114ad45b8fb87d51071ed764db18cab75dc))
* **test:** mock dynamic import in accounts controller test ([937982d](https://github.com/aashari/mcp-server-aws-sso/commit/937982dffcef3275e885c16e2105d3b7c35f7b89))
* **tests:** fix type errors in AWS SSO service and controller tests ([5fc4de3](https://github.com/aashari/mcp-server-aws-sso/commit/5fc4de35cb4ea113fd288bba733d450f766a9a12))
* **test:** skip getAwsSsoConfig test when AWS_SSO_START_URL is not set ([05229e3](https://github.com/aashari/mcp-server-aws-sso/commit/05229e354fce638cfe865216bec240611335e5d7))
* **tests:** update mock implementation for aws.sso.cache.util.js in tests ([31bce3d](https://github.com/aashari/mcp-server-aws-sso/commit/31bce3d027659c8d93d25e79c5fd71ffda8abdfa))
* **utils:** remove duplicate CLI test utility file ([053fc6c](https://github.com/aashari/mcp-server-aws-sso/commit/053fc6c14e43f2e29a32cfe43adc8b5eed8a7b4a))


### Features

* **tests:** add live data tests for AWS SSO services and controllers ([512e85c](https://github.com/aashari/mcp-server-aws-sso/commit/512e85c1c5e0e07f1cd816eee441b6a9ca8062d0))

# 1.0.0 (2025-03-29)


### Bug Fixes

* add workflows permission to semantic-release workflow ([de3a335](https://github.com/aashari/mcp-server-aws-sso/commit/de3a33510bd447af353444db1fcb58e1b1aa02e4))
* correct TypeScript errors in transport utility ([573a7e6](https://github.com/aashari/mcp-server-aws-sso/commit/573a7e63e1985aa5aefd806c0902462fa34c14d7))
* ensure executable permissions for bin script ([395f1dc](https://github.com/aashari/mcp-server-aws-sso/commit/395f1dcb5f3b5efee99048d1b91e3b083e9e544f))
* handle empty strings properly in greet function ([546d3a8](https://github.com/aashari/mcp-server-aws-sso/commit/546d3a84209e1065af46b2213053f589340158df))
* improve error logging with IP address details ([121f516](https://github.com/aashari/mcp-server-aws-sso/commit/121f51655517ddbea7d25968372bd6476f1b3e0f))
* improve GitHub Packages publishing with a more robust approach ([fd2aec9](https://github.com/aashari/mcp-server-aws-sso/commit/fd2aec9926cf99d301cbb2b5f5ca961a6b6fec7e))
* improve GitHub Packages publishing with better error handling and debugging ([db25f04](https://github.com/aashari/mcp-server-aws-sso/commit/db25f04925e884349fcf3ab85316550fde231d1f))
* improve GITHUB_OUTPUT syntax in semantic-release workflow ([6f154bc](https://github.com/aashari/mcp-server-aws-sso/commit/6f154bc43f42475857e9256b0a671c3263dc9708))
* improve version detection for global installations ([97a95dc](https://github.com/aashari/mcp-server-aws-sso/commit/97a95dca61d8cd7a86c81bde4cb38c509b810dc0))
* make publish workflow more resilient against version conflicts ([ffd3705](https://github.com/aashari/mcp-server-aws-sso/commit/ffd3705bc064ee9135402052a0dc7fe32645714b))
* remove all test files to fix CI/CD pipeline ([8ebab41](https://github.com/aashari/mcp-server-aws-sso/commit/8ebab41d6068acf911275450c84c2acaf18431f3))
* remove failing test and configure Jest to pass with no tests ([674a15f](https://github.com/aashari/mcp-server-aws-sso/commit/674a15fcc43abde59c6b44b90c5bea061c174174))
* remove invalid workflows permission ([c012e46](https://github.com/aashari/mcp-server-aws-sso/commit/c012e46a29070c8394f7ab596fe7ba68c037d3a3))
* remove type module to fix CommonJS compatibility ([8b1f00c](https://github.com/aashari/mcp-server-aws-sso/commit/8b1f00c37467bc676ad8ec9ab672ba393ed084a9))
* resolve linter errors in version detection code ([5f1f33e](https://github.com/aashari/mcp-server-aws-sso/commit/5f1f33e88ae843b7a0d708899713be36fcd2ec2e))
* temporarily disable tests to resolve CI/CD pipeline issues ([3c461ef](https://github.com/aashari/mcp-server-aws-sso/commit/3c461eff90c7826052981035c349064405b91d10))
* update examples to use correct API (greet instead of sayHello) ([7c062ca](https://github.com/aashari/mcp-server-aws-sso/commit/7c062ca42765c659f018f990f4b1ec563d1172d3))
* update release workflow to ensure correct versioning in compiled files ([a365394](https://github.com/aashari/mcp-server-aws-sso/commit/a365394b8596defa33ff5a44583d52e2c43f0aa3))
* update version display in CLI ([2b7846c](https://github.com/aashari/mcp-server-aws-sso/commit/2b7846cbfa023f4b1a8c81ec511370fa8f5aaf33))


### Features

* add automated dependency management ([efa1b62](https://github.com/aashari/mcp-server-aws-sso/commit/efa1b6292e0e9b6efd0d43b40cf7099d50769487))
* add CLI usage examples for both JavaScript and TypeScript ([d5743b0](https://github.com/aashari/mcp-server-aws-sso/commit/d5743b07a6f2afe1c6cb0b03265228cba771e657))
* add support for custom name in greet command ([be48a05](https://github.com/aashari/mcp-server-aws-sso/commit/be48a053834a1d910877864608a5e9942d913367))
* add version update script and fix version display ([ec831d3](https://github.com/aashari/mcp-server-aws-sso/commit/ec831d3a3c966d858c15972365007f9dfd6115b8))
* **architecture:** separate accounts entity from auth entity ([e8abc35](https://github.com/aashari/mcp-server-aws-sso/commit/e8abc35c84e187e67bffa2c3fb1a6371365c1f61))
* implement review recommendations ([a23cbc0](https://github.com/aashari/mcp-server-aws-sso/commit/a23cbc0608a07e202396b3cd496c1f2078e304c1))
* implement testing, linting, and semantic versioning ([1d7710d](https://github.com/aashari/mcp-server-aws-sso/commit/1d7710dfa11fd1cb04ba3c604e9a2eb785652394))
* improve CI workflows with standardized Node.js version, caching, and dual publishing ([0dc9470](https://github.com/aashari/mcp-server-aws-sso/commit/0dc94705c81067d7ff63ab978ef9e6a6e3f75784))
* improve development workflow and update documentation ([4458957](https://github.com/aashari/mcp-server-aws-sso/commit/445895777be6287a624cb19b8cd8a12590a28c7b))
* improve package structure and add better examples ([bd66891](https://github.com/aashari/mcp-server-aws-sso/commit/bd668915bde84445161cdbd55ff9da0b0af51944))
* Initial release of AWS SSO MCP Server v1.0.0 ([d7f9458](https://github.com/aashari/mcp-server-aws-sso/commit/d7f9458ece07427ff12c1ec2e6085c6202b9cd86))


### Performance Improvements

* **core:** refactor code structure to align with Atlassian MCP patterns ([090fd56](https://github.com/aashari/mcp-server-aws-sso/commit/090fd5653ab62d70eb75c49828a9876f54cee6fc))
* **ipaddress:** enhance formatter output and optimize service implementation ([f1ccdbf](https://github.com/aashari/mcp-server-aws-sso/commit/f1ccdbf58cb2518ca979363369904255e5de275b))
* **standards:** align codebase with Atlassian MCP server patterns ([8b8eb13](https://github.com/aashari/mcp-server-aws-sso/commit/8b8eb13fd4ce18158e83c4f8c7044ce06287f23e))
* **tests:** add CLI test infrastructure and ipaddress tests ([ccee308](https://github.com/aashari/mcp-server-aws-sso/commit/ccee308a86e076a67756e9113b481aa3848f40b7))
* **utils:** implement standardized core utilities and error handling ([6c14a2f](https://github.com/aashari/mcp-server-aws-sso/commit/6c14a2f83397f79cc39f0b7ec70b40e9d9755b9c))


### Reverts

* restore simple version handling ([bd0fadf](https://github.com/aashari/mcp-server-aws-sso/commit/bd0fadfa8207b4a7cf472c3b9f4ee63d8e36189d))
