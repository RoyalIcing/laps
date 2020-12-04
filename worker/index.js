addEventListener('scheduled', (event) => {
  event.waitUntil(handleScheduled(event))
})

addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request))
})

const domains = [
  'components.guide',
  'icing.space',
  'stratechery.com',
  'daringfireball.net',
  'www.theverge.com',
  'dev.to',
  'remix.run',
  'web.dev',
  'preactjs.com',
  'webflow.com',
  'nomadlist.com',
]

/**
 * Run psi
 * @param {ScheduledEvent} request
 */
async function handleScheduled(event) {
  // const targetDomain = Math.random() > 0.0 ? 'components.guide' : 'icing.space';
  const targetDomain = domains[Math.floor(Math.random() * domains.length)]

  const rootURL = new URL(
    'https://x2qwtp8clc.execute-api.us-west-2.amazonaws.com',
  )
  const url = new URL('/staging/', rootURL)
  url.searchParams.set('url', `https://${targetDomain}/`)
  const response = await fetch(url)
  const data = await response.json()

  const date = new Date(event.scheduledTime)

  const id = `${targetDomain} ${date.getFullYear()}-${
    date.getMonth() + 1
  }-${date.getDate()} ${event.scheduledTime}`
  await PSI.put(id, JSON.stringify(data))
}

const map = { '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot', "'": '#039' }
function escapeToHTML(input) {
  // return input.replace(/[&<>"']/g, (s) => `&${map[s]};`);
  return input.replace(/[&<>]/g, (s) => `&${map[s]};`)
}

function processValue(value) {
  if (typeof value === 'number') {
    return `${value}`
  } else if (/^\s*[<]/.test(value)) {
    // Treat as already safe HTML
    return value
  } else {
    // Escape to safe HTML
    return escapeToHTML(value)
  }
}

async function renderToString(children) {
  const root = []

  function process(child) {
    if (child == null || child == false) return

    if (typeof child === 'string' || typeof child === 'number') {
      return processValue(child)
    } else if (typeof child.then === 'function') {
      // output.push(child.then(processValue))
      return child.then(process)
    } else if (child[Symbol.iterator]) {
      const inner = []
      consumeIterable(child, inner)
      return Promise.all(inner).then(items => items.join(''))
    }
  }

  function consumeIterable(iteratable, output) {
    for (const child of iteratable) {
      output.push(process(child))
      // if (child == null || child == false) continue

      // if (typeof child === 'string' || typeof child === 'number') {
      //   output.push(processValue(child))
      // } else if (typeof child.then === 'function') {
      //   output.push(child.then(processValue))
      // } else if (child[Symbol.iterator]) {
      //   const inner = []
      //   consumeIterable(child, inner)
      //   output.push(Promise.all(inner).then(items => items.join('')))
      // }
    }
  }

  consumeIterable(children, root)

  return (await Promise.all(root)).filter(Boolean).join('')

  // return output.join('')
}

function* html(literals, ...values) {
  for (let i = 0; i < literals.length; i++) {
    yield literals[i]
    if (values[i] != null && values[i] !== false) {
      yield values[i]
    }
  }
}

function formatBytes(bytes) {
  if (bytes > 1024 * 1024) {
    return `${Math.round(bytes / 1024 / 1024)} MiB`
  } else if (bytes > 1024) {
    return `${Math.round(bytes / 1024)} KiB`
  } else {
    return `${bytes} B`
  }
}

function* Term(term, definition) {
  yield '<dt>'
  yield term
  yield '</dt>'
  yield '<dd>'
  yield definition
  yield '</dd>'
}

function* AuditArticle(audit) {
  yield '<article>'
  yield '<h3>'
  yield audit.title
  yield '</h3>'

  yield '<dl>'

  yield audit.score != null && Term('Score', audit.score)
  yield audit.displayValue && Term('Value', audit.displayValue)

  if (audit.id === 'mainthread-work-breakdown') {
    // yield JSON.stringify(Object.keys(audit));
    for (item of audit.details.items) {
      yield Term(item.groupLabel, `${Math.round(item.duration)} ms`)
    }
  } else if (audit.id === 'total-byte-weight') {
    for (item of audit.details.items) {
      yield Term(item.url, formatBytes(item.totalBytes))
    }
  } else if (audit.id === 'resource-summary') {
    for (item of audit.details.items) {
      if (item.requestCount > 0) {
        yield Term(
          item.label,
          `✕${item.requestCount} (${formatBytes(item.transferSize)})`,
        )
      }
    }
  } else if (audit.id === 'unused-css-rules') {
    for (item of audit.details.items) {
      yield Term(
        item.url,
        `${item.wastedPercent.toFixed(2)}% of ${formatBytes(
          item.totalBytes,
        )} wasted`,
      )
    }
  }

  yield '</dl>'

  if (audit.id === 'screenshot-thumbnails') {
    yield '<ol class="row">'
    for (item of audit.details.items) {
      yield '<li>'
      yield '<figure>'
      yield `<img src="${item.data}" style="box-shadow: 2px 2px 8px rgba(0,0,0,0.25);" width=60>`
      yield '<figcaption>'
      yield `${item.timing} ms`
      yield '</figcaption>'
      yield '</figure>'
    }
    yield '</ol>'
  }

  yield '</article>'
}

const Meta = {
  *Title(text) {
    yield '<title>'
    yield text
    yield '</title>'
  },
}

function* SharedStyle() {
  yield '<style>'

  yield ':root { font-size: 125%; font-family: system-ui, sans-serif; }'
  yield ':root { --measure: 44rem; }'

  yield '*, *:before, *:after { font: inherit; margin: 0; padding: 0; }'

  yield 'article { margin: 1rem; }'

  yield 'h1 { font-size: 2rem; font-weight: bold; }'
  yield 'h2 { font-size: 1.5rem; font-weight: bold; }'
  yield 'h3 { font-size: 1.375rem; font-weight: bold; }'

  yield 'dl { display: grid; grid-template-columns: minmax(min-content, auto) max-content; }'
  yield 'dt { font-weight: bold; }'
  yield 'dd { text-align: "." center; }'
  yield 'ul[class], ol[class] { list-style: none; }'

  yield '.measure { max-width: var(--measure); }'
  yield '.measure:not(.measure *) { margin-left: auto; margin-right: auto; }'

  yield '.row { display: flex; flex-wrap: wrap; }'

  yield '</style>'
}

function* LighthouseNav(keys) {
  yield '<nav>'
  yield '<ul>'

  for (const { name } of keys) {
    yield '<li>'
    const [domain, date, timestamp] = name.split(' ')
    const url = `/${domain}/${date} ${timestamp}.html`
    yield `<a href="${url}">${name}</a>`
    yield PSI.get(name, 'json').then(json => {
      const { audits, requestedUrl, lighthouseVersion } = json.lighthouseResult
      return [
        `<p>${requestedUrl}</p>`,
        AuditArticle(audits['screenshot-thumbnails'])
      ]
    })
  }

  yield '</nav>'
}

const htmlStart = `<!doctype html><html lang=en><meta charset=utf-8><meta name=viewport content="width=device-width">`

function LighthouseResultPage(domain, json) {
  const { audits, requestedUrl, lighthouseVersion } = json.lighthouseResult
  return renderToString([
    html`${htmlStart} ${Meta.Title(`Speed of ${domain}`)} ${SharedStyle()}
      <body>
        <nav class="measure">
          <ul>
            <li><a href="/">Home</a></li>
          </ul>
        </nav>
        <main>
          <h1 class="measure">
            ${requestedUrl}: Lighthouse ${lighthouseVersion}
          </h1>
          <section class="measure">
            <h2>Audits</h2>
            <div style="display: grid; grid-auto-columns: minmax(300px, auto);">
              ${Object.keys(audits).map((auditID) =>
                AuditArticle(audits[auditID]),
              )}
            </div>
          </section>
          <details>
            <summary>Raw results</summary>
            <pre>${JSON.stringify(audits, null, 2)}</pre>
          </details>
        </main>
      </body> `,
  ])
}

function LighthouseListPage(keys) {
  return renderToString([
    html`${htmlStart} ${Meta.Title('List of lighthouse results')}
      ${SharedStyle()}
      <body>
        <main>
          <h1 class="measure">Lighthouse results</h1>
          <section class="measure">${LighthouseNav(keys)}</section>
        </main>
      </body> `,
  ])
}

/**
 * Respond with results
 * @param {Request} request
 */
async function handleRequest(request) {
  try {
    const { pathname, searchParams } = new URL(request.url)
    const [, ...components] = pathname.split('/')
    if (components.length === 2 && domains.includes(components[0])) {
      const domain = components[0]
      const [encodedKey, extension] = components[1].split('.')
      const key = decodeURIComponent(encodedKey)
      const json = await PSI.get(`${domain} ${key}`, 'json')

      if (extension === 'html') {
        var contentType = 'text/html'
        var encodedResult = await LighthouseResultPage(domain, json)
      } else {
        var result = json
      }
    } else {
      const { keys } = await PSI.list({ prefix: searchParams.get('prefix'), limit: 20 })

      if (/\.json/.test(pathname)) {
        var result = { version: '0.1', keys }
      } else {
        var contentType = 'text/html'
        var encodedResult = await LighthouseListPage(keys)
      }
    }

    return new Response(
      typeof encodedResult !== 'undefined'
        ? encodedResult
        : JSON.stringify(result),
      {
        headers: {
          'content-type':
            typeof contentType === 'string'
              ? contentType
              : 'application/json; charset=utf-8',
        },
      },
    )
  } catch (error) {
    return new Response(error.message, { status: 500 })
  }
}
