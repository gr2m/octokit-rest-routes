const cheerio = require('cheerio')

const {METHODS} = require('http')
const REGEX_ACCEPT_HEADER = /^application\/vnd\.github\.v3\.([^+]+)/

module.exports = {
  is (el) {
    return cheerio(el).is('pre')
  },
  parse (el) {
    const $el = cheerio(el)
    const text = $el.text().trim()
    const [word1, word2, ...rest] = text.split(/\s+/)

    // is route block, e.g. "GET /orgs/:org"
    if (METHODS.includes(word1)) {
      return {
        type: 'route',
        method: word1,
        path: word2
      }
    }

    // is alternative preview header
    if (word1 === 'Accept:') {
      return {
        type: 'mediaType',
        acceptHeader: word2,
        parameter: word2.match(REGEX_ACCEPT_HEADER)[1]
      }
    }

    // is response header with status
    if (word1 === 'Status:') {
      return {
        type: 'responseHeaders',
        status: parseInt(word2, 10),
        hasPaginationHeader: rest.includes('Link:')
      }
    }

    // is response header with location header
    if (word1 === 'HTTP/1.1') {
      return {
        type: 'responseHeaders',
        status: parseInt(word2, 10),
        location: rest.pop() // last "word" is value of Location header
      }
    }

    // is curl example
    if (word1 === 'curl') {
      return {
        type: 'example',
        text
      }
    }

    // is response
    if ($el.is('.highlight-json')) {
      return {
        type: 'example',
        format: 'json',
        data: JSON.parse(cleanJson(text))
      }
    }

    return {
      type: 'description',
      data: '```\n' + text + '\n```'
    }
  }
}

function cleanJson (text) {
  return text
    // https://developer.github.com/v3/enterprise-admin/ldap/#example
    // https://developer.github.com/v3/enterprise-admin/ldap/#example-1
    .replace(/(^'|'$)/g, '')
}
