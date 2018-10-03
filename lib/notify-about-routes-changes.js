module.exports = notifyAboutRoutesChanges

const execa = require('execa')
const ghGot = require('gh-got')

async function notifyAboutRoutesChanges () {
  const repoName = process.env.TRAVIS_REPO_SLUG
  const branchName = `cron/routes-changes/${new Date().toISOString().substr(0, 10)}`

  // check if any routes files have been changed
  const { stdout } = await execa('git', ['status', 'routes'])
  if (/nothing to commit/.test(stdout)) {
    return
  }

  console.log('🤖  Routes changes detected in cron job. Creating pull request ...')

  // count changes
  const diffResult = await execa.shell('git diff --stat routes/*/')
  const changesSummary = diffResult.stdout
    .split('\n')
    .pop()
    .trim()
    .replace(/file/, 'endpoint definition')

  // push changes back to GitHub
  await execa('git', ['checkout', '-b', branchName])
  await execa('git', ['add', 'cache'])
  await execa('git', ['commit', '-m', 'build: cache'])
  await execa('git', ['add', 'index.json', 'routes'])
  await execa('git', ['commit', '-m', 'build: routes'])
  await execa('git', ['push', `https://${process.env.GH_TOKEN}@github.com/${repoName}.git`, `HEAD:${branchName}`])
  await execa('git', ['checkout', '-'])

  // start pullrequest
  const { body } = await ghGot.post(`repos/${repoName}/pulls`, {
    token: process.env.GH_TOKEN,
    body: {
      title: `🤖🚨 ${changesSummary}`,
      head: branchName,
      base: 'master',
      body: `Dearest humans,

  My friend Travis asked me to let you know that they found routes changes in their daily routine check.`
    }
  })

  console.log(`🤖  Pull request created: ${body.html_url}`)
}
