const core = require('@actions/core');
const github = require('@actions/github');

const getPrNumber = () => {
  const pullRequest = github.context.payload.pull_request;
  if (!pullRequest) {
    return undefined;
  }
  return pullRequest.number;
}

const getPrDescription = async (client) => {
  const prNumber = getPrNumber();
  if (!prNumber) {
    core.error("Could not get pull request number from context, exiting");
    return;
  }

  const { data: pullRequest } = await client.pulls.get({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    pull_number: prNumber
  });

  core.info(`pr body: ${pullRequest.body && pullRequest.body.trim()}`);

  return pullRequest.body && pullRequest.body.trim()
}

const getPrTemplate = async (client) => {
  const {data: {files: {pull_request_template}}} = await client.repos.getCommunityProfileMetrics({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
  });

  if (!pull_request_template) {
    return ''
  }

  core.info(`pr template url: ${pull_request_template.url}`);

  const prTemplatePath = pull_request_template && pull_request_template.url.split('/').splice(7).join('/');

  core.info(`pr template path: ${prTemplatePath}`);

  const {data: prTemplateContents} = await client.repos.getContent({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    prTemplatePath,
  });

  core.info(`pr template content: ${prTemplateContents}`);

  return prTemplateContents.trim();
}

// most @actions toolkit packages have async methods
async function run() {
  try {
    const token = core.getInput("repo-token", { required: true });

    const client = github.getOctokit(token)

    const prDescription = await getPrDescription(client)
    const prTemplate = await getPrTemplate(client)

    if (!prDescription || prDescription === prTemplate) {
      core.setFailed('PR description missing');
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
