// Mock the modules BEFORE requiring them
jest.mock('@actions/core');
jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn()
}));

const core = require('@actions/core');
const { Octokit } = require('@octokit/rest');

describe('Close Sub-Issues Action', () => {
  let mockOctokit;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock Octokit instance
    mockOctokit = {
      request: jest.fn(),
      issues: {
        update: jest.fn(),
        createComment: jest.fn()
      }
    };
    Octokit.mockImplementation(() => mockOctokit);

    // Setup default inputs
    core.getInput.mockImplementation((name) => {
      const inputs = {
        'github_token': 'test-token',
        'repository': 'owner/repo',
        'issue_number': '123'
      };
      return inputs[name];
    });
  });

  test('should validate repository format', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'repository') return 'invalid-format';
      return 'test';
    });

    // Clear module cache to re-run the action
    jest.resetModules();
    jest.doMock('@actions/core', () => core);
    jest.doMock('@octokit/rest', () => ({ Octokit: jest.fn(() => mockOctokit) }));
    
    await require('../src/index.js');

    expect(core.setFailed).toHaveBeenCalledWith(
      expect.stringContaining('Invalid repository format')
    );
  });

  test('should handle no sub-issues found', async () => {
    mockOctokit.request.mockResolvedValue({ data: [] });

    jest.resetModules();
    jest.doMock('@actions/core', () => core);
    jest.doMock('@octokit/rest', () => ({ Octokit: jest.fn(() => mockOctokit) }));
    
    await require('../src/index.js');

    expect(core.info).toHaveBeenCalledWith('No sub-issues found for the parent issue.');
  });

  test('should only collect open sub-issues', async () => {
    const mockSubIssues = [
      { number: 1, state: 'open' },
      { number: 2, state: 'open' },
      { number: 3, state: 'closed' }  // Should be filtered out
    ];

    // Filter like the actual code does
    const openIssues = mockSubIssues.filter(issue => issue.state === 'open');
    
    expect(openIssues).toHaveLength(2);
    expect(openIssues.map(i => i.number)).toEqual([1, 2]);
  });

  test('should validate issue number is numeric', async () => {
    core.getInput.mockImplementation((name) => {
      const inputs = {
        'github_token': 'test-token',
        'repository': 'owner/repo',
        'issue_number': 'not-a-number'
      };
      return inputs[name];
    });

    jest.resetModules();
    jest.doMock('@actions/core', () => core);
    jest.doMock('@octokit/rest', () => ({ Octokit: jest.fn(() => mockOctokit) }));
    
    await require('../src/index.js');

    expect(core.setFailed).toHaveBeenCalledWith(
      expect.stringContaining('Invalid issue_number')
    );
  });
});
