# workflow "Test on push" {
workflow "Deploy on push" {
  on = "push"
  resolves = ["remove older deployments"]
}

action "npm ci" {
  uses = "docker://timbru31/node-alpine-git"
  runs = "npm"
  args = "ci"
}

action "lint" {
  needs = "npm ci"
  uses = "docker://timbru31/node-alpine-git"
  runs = "npx"
  args = "standard"
}

action "routes:lint" {
  needs = "npm ci"
  uses = "docker://timbru31/node-alpine-git"
  runs = "npm"
  args = "run routes:lint"
}

action "test" {
  needs = [
    "lint",
    "routes:lint"
  ]
  uses = "docker://timbru31/node-alpine-git"
  runs = "npm"
  args = "test"
}

action "deploy to now" {
  needs = [
    "routes:lint"
  ]
  uses = "docker://timbru31/node-alpine-git"
  runs = "npx"
  args = "now deploy --token $NOW_TOKEN"
  secrets = ["NOW_TOKEN"]
}

action "alias deploy domain" {
  needs = [
    "deploy to now"
  ]
  uses = "docker://timbru31/node-alpine-git"
  runs = "npx"
  args = "now alias --token $NOW_TOKEN"
  secrets = ["NOW_TOKEN"]
}

action "remove older deployments" {
  needs = [
    "deploy to now"
  ]
  uses = "docker://timbru31/node-alpine-git"
  runs = "npx"
  args = "now rm --safe --yes octokit-routes-openapi --token $NOW_TOKEN"
  secrets = ["NOW_TOKEN"]
}

workflow "Record on demand" {
  on = "repository_dispatch"
  resolves = ["routes update pull request"]
}

workflow "Cron" {
  on = "schedule(0 2 * * *)"
  resolves = ["routes update pull request"]
}

action "record action only" {
  uses = "actions/bin/filter@master"
  args = "action record"
}

action "clear routes" {
  needs = "record action only"
  uses = "docker://timbru31/node-alpine-git"
  runs = "rm"
  args = "-rf routes cache"
}

action "update .com routes" {
  needs = [
    "clear routes",
    "npm ci"
  ]
  uses = "docker://timbru31/node-alpine-git"
  runs = "bin/octokit-rest-routes.js"
  args = "update"
}

action "update GHE routes" {
  needs = [
    "clear routes",
    "npm ci"
  ]
  uses = "docker://timbru31/node-alpine-git"
  runs = "bin/octokit-rest-routes.js"
  args = "update --ghe"
}

action "routes update pull request" {
  uses = "docker://timbru31/node-alpine-git"
  runs = "bin/create-pull-request-on-change.js"
  secrets = ["GITHUB_TOKEN"]
}

workflow "Release" {
  on = "push"
  resolves = ["semantic-release"]
}

action "master branch only" {
  uses = "actions/bin/filter@master"
  args = "branch master"
}

action "npm ci (release)" {
  needs = "master branch only"
  uses = "docker://timbru31/node-alpine-git"
  runs = "npm"
  args = "ci"
}

action "semantic-release" {
  needs = [
    "master branch only",
    "npm ci (release)"
  ]
  uses = "docker://timbru31/node-alpine-git"
  runs = "npm"
  args = "run semantic-release"
  secrets = ["GITHUB_TOKEN", "NPM_TOKEN"]
}
