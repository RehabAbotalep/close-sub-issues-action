const core = require('@actions/core');
const { Octokit } = require('@octokit/rest');

async function run() {
  try {
    // Get inputs from action.yml
    const token = core.getInput('github_token', { required: true });
    const repository = core.getInput('repository', { required: true });
    const issueNumber = core.getInput('issue_number', { required: true });

    // Validate inputs
    const [owner, repo] = repository.split('/');
    if (!owner || !repo) {
      throw new Error(`Invalid repository format: "${repository}". Expected "owner/repo".`);
    }

    if (!issueNumber || isNaN(parseInt(issueNumber, 10))) {
      throw new Error(`Invalid issue_number: "${issueNumber}". Expected a numeric value.`);
    }

    // Initialize Octokit
    const octokit = new Octokit({ auth: token });

    core.info(`Fetching sub-issues for parent issue #${issueNumber} in ${repository}...`);
    
    // Fetch sub-issues for the parent issue using GitHub's Sub-issues API
    const subIssues = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await octokit.request('GET /repos/{owner}/{repo}/issues/{issue_number}/sub_issues', {
        owner,
        repo,
        issue_number: issueNumber,
        per_page: 100,
        page,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });

      const issues = response.data;
      if (issues.length === 0) {
        hasMore = false;
      } else {
        subIssues.push(...issues
          .filter((issue) => issue.state === 'open')
          .map((issue) => issue.number));
        page++;
      }
    }

    // Check if there are sub-issues
    if (subIssues.length === 0) {
      core.info('No sub-issues found for the parent issue.');
      core.setOutput('closed_count', 0);
      core.setOutput('total_count', 0);
      return;
    }

    core.info(`Found ${subIssues.length} sub-issues: ${subIssues.join(', ')}`);

    // Close each sub-issue
    const closedIssues = [];
    for (const subIssueNumber of subIssues) {
      try {
        await octokit.issues.update({
          owner,
          repo,
          issue_number: subIssueNumber,
          state: 'closed',
        });
        core.info(`Successfully closed sub-issue #${subIssueNumber}`);
        closedIssues.push(subIssueNumber);
      } catch (error) {
        core.warning(`Failed to close sub-issue #${subIssueNumber}: ${error.message}`);
      }
    }

    // Add comment to parent issue if any sub-issues were closed
    if (closedIssues.length > 0) {
      const closedList = closedIssues.map(num => `#${num}`).join(' ');
      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: parseInt(issueNumber, 10),
        body: `✅ Automatically closed the following sub-issues: ${closedList}`
      });
      core.info('Added comment to parent issue.');
    }

    // Set outputs
    core.setOutput('closed_count', closedIssues.length);
    core.setOutput('total_count', subIssues.length);
    core.info(`All sub-issues processed. Closed ${closedIssues.length}/${subIssues.length} sub-issues.`);

  } catch (error) {
    core.setFailed(`Workflow failed: ${error.message}`);
  }
}

run();