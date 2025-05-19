# AWS SSO MCP Server - Examples

This document provides detailed examples for both MCP tools and CLI commands available in the AWS SSO MCP Server.

## MCP Tool Examples

### `aws_sso_login`

**Basic Login:**
```json
{}
```

**Custom Login Options:**
```json
{
  "launchBrowser": false,
  "autoPoll": true
}
```

### `aws_sso_status`

**Check Authentication Status:**
```json
{}
```

### `aws_sso_ls_accounts`

**List All Accounts and Roles:**
```json
{}
```

### `aws_sso_exec_command`

**List S3 Buckets:**
```json
{
  "accountId": "123456789012", 
  "roleName": "ReadOnly",
  "command": "aws s3 ls"
}
```

**Describe EC2 Instances in a Specific Region:**
```json
{
  "accountId": "123456789012",
  "roleName": "AdminRole",
  "command": "aws ec2 describe-instances --query 'Reservations[*].Instances[*].[InstanceId,State.Name,InstanceType]' --output table",
  "region": "us-west-2"
}
```

**Check CloudWatch Logs:**
```json
{
  "accountId": "123456789012",
  "roleName": "DevOpsRole",
  "command": "aws logs describe-log-groups --limit 5",
  "region": "us-east-1"
}
```

### `aws_sso_ec2_exec_command`

**Check System Resources:**
```json
{
  "instanceId": "i-0a69e80761897dcce",
  "accountId": "123456789012",
  "roleName": "InfraOps",
  "command": "uptime && df -h && free -m"
}
```

**View Running Processes:**
```json
{
  "instanceId": "i-0a69e80761897dcce",
  "accountId": "123456789012",
  "roleName": "AdminRole",
  "command": "ps aux | grep java",
  "region": "us-west-2"
}
```

**Check Server Logs:**
```json
{
  "instanceId": "i-0a69e80761897dcce",
  "accountId": "123456789012",
  "roleName": "SupportRole",
  "command": "tail -n 50 /var/log/application.log",
  "region": "eu-west-1"
}
```

## CLI Command Examples

### Login

**Standard Login (launches browser and polls automatically):**
```bash
mcp-aws-sso login
```

**Login without Browser Launch:**
```bash
mcp-aws-sso login --no-launch-browser
```

**Login without Auto-polling:**
```bash
mcp-aws-sso login --no-auto-poll
```

### Status

**Check Authentication Status:**
```bash
mcp-aws-sso status
```

### List Accounts

**List All Accessible Accounts and Roles:**
```bash
mcp-aws-sso ls-accounts
```

### Execute AWS Commands

**List S3 Buckets:**
```bash
mcp-aws-sso exec-command \
  --account-id 123456789012 \
  --role-name ReadOnly \
  --command "aws s3 ls"
```

**List EC2 Instances with Specific Region:**
```bash
mcp-aws-sso exec-command \
  --account-id 123456789012 \
  --role-name AdminRole \
  --region us-west-2 \
  --command "aws ec2 describe-instances --output table"
```

**Create a CloudFormation Stack:**
```bash
mcp-aws-sso exec-command \
  --account-id 123456789012 \
  --role-name PowerUserAccess \
  --region us-east-1 \
  --command "aws cloudformation deploy --template-file template.yaml --stack-name my-stack --parameter-overrides Param1=value1"
```

### Execute EC2 Commands

**Check System Resources:**
```bash
mcp-aws-sso ec2-exec-command \
  --instance-id i-0a69e80761897dcce \
  --account-id 123456789012 \
  --role-name InfraOps \
  --command "uptime && df -h && free -m"
```

**Check Application Status:**
```bash
mcp-aws-sso ec2-exec-command \
  --instance-id i-0a69e80761897dcce \
  --account-id 123456789012 \
  --role-name AdminRole \
  --region us-west-2 \
  --command "systemctl status application.service"
```

**Run a Complex Command:**
```bash
mcp-aws-sso ec2-exec-command \
  --instance-id i-0a69e80761897dcce \
  --account-id 123456789012 \
  --role-name DevOpsRole \
  --command "cd /opt/application && ./run-diagnostics.sh --verbose"
```

## Response Formats

### MCP Tool Response Example (`aws_sso_exec_command`)

```markdown
# AWS SSO: Command Result

**Account/Role:** 123456789012/ReadOnly
**Region:** us-east-1 (Default: ap-southeast-1)

## Command
```bash
aws s3 ls
```

## Output
```
2023-01-15 08:42:53 my-bucket-1
2023-05-22 14:18:19 my-bucket-2
2024-02-10 11:05:37 my-logs-bucket
```

*Executed: 2025-05-19 06:21:49 UTC*
```

### CLI Command Response Example (`exec-command`)

```
# AWS SSO: Command Result

**Account/Role:** 123456789012/ReadOnly
**Region:** us-east-1 (Default: ap-southeast-1)

## Command
```bash
aws s3 ls
```

## Output
```
2023-01-15 08:42:53 my-bucket-1
2023-05-22 14:18:19 my-bucket-2
2024-02-10 11:05:37 my-logs-bucket
```

*Executed: 2025-05-19 06:21:49 UTC*
``` 
