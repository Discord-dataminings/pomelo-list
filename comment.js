const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');

async function run() {
  try {
    const token = process.env.GITHUB_TOKEN;
    const octokit = github.getOctokit(token);

    // Get the commit SHA from the workflow event
    const commitSha = github.context.payload.after;

    // Get the repository and owner from the workflow event
    const { repo, owner } = github.context.repo;

    // Get the commit diff
    const { data: commit } = await octokit.rest.repos.getCommit({
      owner,
      repo,
      ref: commitSha
    });

    // Extract added and removed usernames from the commit diff
    const addedUsernames = [];
    const removedUsernames = [];

    for (const file of commit.files) {
      const { data: fileDiff } = await octokit.rest.repos.getCommit({
        owner,
        repo,
        ref: commitSha
      });

      const patch = fileDiff.files.find(f => f.filename === file.filename).patch;

      const lines = patch.split('\n');

      for (const line of lines) {
        if (line.startsWith('+')) {
          const username = line;
          addedUsernames.push(username);
        } else if (line.startsWith('-')) {
          const username = line;
          removedUsernames.push(username);
        }
      }
    }

    // Create the comment message
    let comment = `Commit: ${commitSha}\n\n`;
    if (addedUsernames.length > 0) {
      comment += 'Added usernames:\n';
      comment += addedUsernames.map(username => `- ${username}`).join('\n');
      comment += '\n\n';
    }
    if (removedUsernames.length > 0) {
      comment += 'Removed usernames:\n';
      comment += removedUsernames.map(username => `- ${username}`).join('\n');
      comment += '\n\n';
    }

    // Create a comment in the repository
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: github.context.issue.number,
      body: comment
    });

    console.log('Comment created successfully.');
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
