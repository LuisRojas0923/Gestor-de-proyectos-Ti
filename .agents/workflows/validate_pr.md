---
name: /validate-pr
description: Invokes the autonomous subagent swarm to validate all changes in the current branch before submitting a Pull Request.
---

# Validate PR Workflow

This workflow automates the pre-PR review process by leveraging the OpenCode/Codex reviewer swarm. When the user requests to validate a PR or triggers this workflow, follow these exact steps:

## Step 1: Identify the Scope
1. Use `git status` and `git log HEAD..origin/main` (or the target branch) to determine the scope of files modified.
2. Group the modifications into four domains: Backend, Frontend, Security/RBAC, and Tests/Docs.

## Step 2: Invoke the Reviewers
Use the `invoke_subagent` tool to concurrently launch the following 4 reviewers. Pass the appropriate scope to each one based on your analysis in Step 1.

1. **backend-reviewer**: Instruct it to review backend changes (FastAPI, SQLAlchemy, async safety, N+1 issues).
2. **frontend-reviewer**: Instruct it to review frontend changes (React, Tailwind, Design System components, mobile-first design).
3. **security-rbac-reviewer**: Instruct it to review changes involving authentication, RBAC manifests, and PII masking.
4. **docs-tests-reviewer**: Instruct it to review unit/integration tests and ensure there are no coverage gaps in the modified logic.

**CRITICAL INSTRUCTION FOR ALL SUBAGENTS**: Instruct them to save their review reports to `docs/reviews/builds/<agent-name>-pr-review.md` and reply to you inline with their final verdict (Approved or Blocked).

## Step 3: Wait for Reports
- Stop calling tools and wait silently for all 4 subagents to reply to you via the system messages. (You may use the `schedule` tool to set up silent waits if necessary).

## Step 4: Consolidate the Report
1. Once all subagents have replied, evaluate their verdicts.
2. **If blocked**: If any subagent blocked the PR, inform the user about the missing requirements (e.g., missing tests, security leaks) and proactively propose/implement the fixes.
3. **If approved**: If all subagents approve, generate a consolidated report artifact (e.g., `final_audit_report.md`) summarizing their findings and verdicts.
4. Inform the user that the PR is completely clean and provide the necessary `git push` command to proceed.
