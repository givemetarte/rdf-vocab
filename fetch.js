const fs = require('fs')
const rdf = require('rdf-ext')
const formats = require('@rdfjs/formats-common')
const rdfFetch = require('@rdfjs/fetch-lite')
const RdfXmlParser = require('rdfxml-streaming-parser').RdfXmlParser

formats.parsers.set('application/rdf+xml', new RdfXmlParser())

async function main () {
  const prefixes = require('./prefixes')
  const overrides = require('./overrides')

  // merge prefixes with overrides
  for (const prefix in prefixes) {
    const uri = prefixes[prefix]
    const override = overrides[prefix]
    prefixes[prefix] = Object.assign({ uri, prefix }, override)
  }

  for (const prefix in prefixes) {
    const mapping = prefixes[prefix]
    if (mapping.skip) {
      continue
    }
    let { dataset } = await fetch(mapping)
    const graph = rdf.namedNode(mapping.uri)
    dataset = dataset.map(({ subject, predicate, object }) => rdf.quad(subject, predicate, object, graph))

    const file = `./ontologies/${mapping.prefix}.nt`
    fs.writeFileSync(file, dataset.toCanonical())
    console.log(`${mapping.prefix}: wrote ${dataset.size} quads to ${file}`)
  }
}

async function fetch (mapping) {
  const headers = {}
  if (mapping.mediaType) {
    headers['accept'] = mapping.mediaType
  }
  try {
    const res = await rdfFetch(mapping.file || mapping.uri, { factory: rdf, formats, headers })
    if (mapping.mediaType) {
      res.headers.set('content-type', mapping.mediaType)
    }
    const dataset = await res.dataset()
    return { mapping, dataset }
  }
  catch (err) {
    console.warn(`failed fetching/processing ${mapping.prefix}`)
    throw err
  }
}

Promise.resolve().then(() => main())
