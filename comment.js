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
    const { data: diffData } = await octokit.repos.getCommit({
      owner,
      repo,
      ref: commitSha
    });

    // Extract added and removed usernames from the commit diff
    const addedUsernames = [];
    const removedUsernames = [];

    for (const file of diffData.files) {
      const { data: fileDiffData } = await octokit.repos.getCommit({
        owner,
        repo,
        ref: commitSha
      });

      const patch = fileDiffData.files.find(f => f.filename === file.filename).patch;

      const lines = patch.split('\n');

      for (const line of lines) {
        if (line.startsWith('+') && line.includes('username')) {
          const username = line.split('username')[1].trim();
          addedUsernames.push(username);
        } else if (line.startsWith('-') && line.includes('username')) {
          const username = line.split('username')[1].trim();
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
    await octokit.issues.createComment({
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
