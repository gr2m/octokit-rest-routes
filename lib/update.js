module.exports = update

const {writeFile} = require('fs-extra')
const {join: joinPath} = require('path')

const {flatten} = require('lodash')

const getDocPages = require('../lib/landing-page/get')
const getEndpoint = require('../lib/endpoint/get')
const getPageSections = require('../lib/documentation-page/get')
const toRoutesFilename = require('../lib/page-to-routes-filename')

async function update (options) {
  console.log(`🔍  Finding documentation pages`)
  const pages = await getDocPages()
  console.log(`🤖  ${pages.length} pages found`)

  const filePaths = []
  await pages.reduce(async (promise, page, i) => {
    await promise

    console.log('')
    console.log(`🔭  ${i + 1}/${pages.length}: ${page.url}`)
    const sections = await getPageSections(page)
    const endpoints = flatten(
      await Promise.all(sections.map(section => getEndpoint(section.url)))
    ).filter(Boolean)

    if (endpoints.length === 0) {
      console.log(`ℹ️  No endpoints found in ${sections.length}`)
      return
    }

    console.log(`ℹ️  ${endpoints.length} endpoints found in ${sections.length} sections`)

    const filename = toRoutesFilename(page)
    const filePath = joinPath('routes', filename)
    await writeFile(filePath, JSON.stringify(endpoints, null, 2) + '\n')
    console.log(`✅  ${filename} written`)
    filePaths.push(filePath)
  }, Promise.resolve())

  const pathByScope = filePaths.reduce((map, path) => {
    const [scope] = path.substr('routes/'.length).split(/[-.]/)
    if (!map[scope]) map[scope] = []
    map[scope].push(`require(./${path})`)
    return map
  }, {})

  const indexFileContent = JSON.stringify(pathByScope, null, 2)
    .replace(/\]/g, ')')
    .replace(/"(\w+)": \[/g, '$1: [].concat(')
    .replace(/"require\(([^)]+)\)"/g, 'require(\'$1\')')

  // update main index.js file which loads all routes specificatiosn
  await writeFile('index.js', `module.exports = ${indexFileContent}\n`)
}
