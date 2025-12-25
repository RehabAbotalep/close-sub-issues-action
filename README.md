# Close Sub-Issues Action

Automatically closes all sub-issues associated with a parent issue when the parent is closed.

## Features

- Automatically closes all open sub-issues when parent issue is closed
- Adds a summary comment to the parent issue listing closed sub-issues
- Handles pagination for issues with many sub-issues

## Usage

Add this workflow to your repository at `.github/workflows/close-sub-issues.yml`:

```yaml
name: Close Sub-Issues

on:
  issues:
    types: [closed]

jobs:
  close-sub-issues:
    runs-on: ubuntu-latest
    steps:
      - name: Close Sub-Issues
        uses: RehabAbotalep/close-sub-issues-action@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          issue_number: ${{ github.event.issue.number }}
          repository: ${{ github.repository }}
```

## Inputs

| Input | Description | Required |
|-------|-------------|----------|
| `github_token` | GitHub token for authentication | Yes |
| `issue_number` | The issue number of the parent issue | Yes |
| `repository` | The repository in `owner/repo` format | Yes |

## Outputs

| Output | Description |
|--------|-------------|
| `closed_count` | The number of sub-issues that were successfully closed |
| `total_count` | The total number of sub-issues found |

## Example

When you close a parent issue with sub-issues, this action will:

1. Find all open sub-issues
2. Close each sub-issue
3. Add a comment to the parent issue:
   > ✅ Automatically closed the following sub-issues: #2 #3 #4

## License

MIT
