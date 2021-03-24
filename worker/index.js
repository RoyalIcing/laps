import { renderToString as renderHTML, attributes, html } from 'yieldmarkup';

addEventListener('scheduled', (event) => {
  event.waitUntil(handleScheduled(event))
})

addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request))
})

const domains = [
  'components.guide',
  'icing.space',
  'www.elevatepartners.com.au',
  'dev.to',
  'medium.com',
  'web.dev',
  'github.com',
  'stratechery.com',
  'daringfireball.net',
  'www.theverge.com',
  'remix.run',
  'hotwire.dev',
  'preactjs.com',
  'basecamp.com',
  'webflow.com',
  'nomadlist.com'
];

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
  const url = new URL('/staging/', rootURL);
  url.searchParams.set('url', `https://${targetDomain}/`)
  const response = await fetch(url);
  const data = await response.json();

  const date = new Date(event.scheduledTime);

  const id = `${targetDomain} ${date.getFullYear()}-${
    date.getMonth() + 1
  }-${date.getDate()} ${event.scheduledTime}`
  await PSI.put(id, JSON.stringify(data));
}

function formatBytes(bytes) {
  if (bytes > 1024 * 1024) {
    return `${Math.round(bytes / 1024 / 1024)} MiB`;
  } else if (bytes > 1024) {
    return `${Math.round(bytes / 1024)} KiB`;
  } else {
    return `${bytes} B`;
  }
}

function* Term(term, definition) {
  yield html`<dt>`;
  yield term;
  yield html`</dt>`;
  yield html`<dd>`;
  yield definition;
  yield html`</dd>`;
}

function* AuditArticle(audit) {
  yield html`<article>`;
  yield html`<h3>`;
  yield audit.title;
  yield html`</h3>`;

  yield html`<dl>`;

  yield audit.score != null && Term('Score', audit.score)
  yield audit.displayValue && Term('Value', audit.displayValue)

  if (audit.id === 'mainthread-work-breakdown') {
    // yield JSON.stringify(Object.keys(audit));
    for (const item of audit.details.items) {
      yield Term(item.groupLabel, `${Math.round(item.duration)} ms`);
    }
  } else if (audit.id === 'total-byte-weight') {
    for (const item of audit.details.items) {
      yield Term(item.url, formatBytes(item.totalBytes));
    }
  } else if (audit.id === 'resource-summary') {
    for (const item of audit.details.items) {
      if (item.requestCount > 0) {
        yield Term(
          item.label,
          `✕${item.requestCount} (${formatBytes(item.transferSize)})`,
        );
      }
    }
  } else if (audit.id === 'unused-css-rules') {
    for (const item of audit.details.items) {
      yield Term(
        item.url,
        `${item.wastedPercent.toFixed(2)}% of ${formatBytes(
          item.totalBytes,
        )} wasted`,
      );
    }
  }

  yield html`</dl>`

  if (audit.id === 'screenshot-thumbnails') {
    yield html`<ol class="row">`;
    for (const item of audit.details.items) {
      yield html`<li>`;
      yield html`<figure>`;
      yield html`<img src="${item.data}" style="box-shadow: 2px 2px 8px rgba(0,0,0,0.25);" width=60>`;
      yield html`<figcaption style="font-size: 60%">`;
      yield `${item.timing} ms`;
      yield html`</figcaption>`;
      yield html`</figure>`;
    }
    yield html`</ol>`;
  }

  yield html`</article>`;
}

const Meta = {
  *Title(text) {
    yield html`<title>`;
    yield text;
    yield html`</title>`;
  },
}

function* SharedStyle() {
  yield html`<style>`;

  yield ':root { font-size: 125%; font-family: system-ui, sans-serif; }';
  yield ':root { --measure: 44rem; }';
  yield ':root { --tone: #eee; }';
  yield ':root { --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }';

  yield '*, *:before, *:after { font: inherit; box-sizing: border-box; margin: 0; padding: 0; }';
  yield '* { --py: 0; --px: 0; padding-top: var(--py); padding-bottom: var(--py); padding-left: var(--px); padding-right: var(--px); }';

  yield 'article { margin: 1rem; }';
  
  yield 'h1, h2, h3, dl, ul:not([class]), ol:not([class]), p { --px: var(--content-px); }';

  yield 'h1 { font-size: 2rem; font-weight: bold; }';
  yield 'h2 { font-size: 1.5rem; font-weight: bold; }';
  yield 'h3 { font-size: 1.375rem; font-weight: bold; }';

  yield 'dl { display: grid; grid-template-columns: minmax(min-content, auto) max-content; }';
  yield 'dt { font-weight: bold; }';
  yield 'dd { text-align: "." center; }';
  yield 'ul[class], ol[class] { list-style: none; }';
  yield 'ul:not([class]), ol:not([class]) { margin-left: 1rem; }';

  yield '[aria-current] { font-weight: bold; }';
  
  yield '.measure { max-width: var(--measure); box-sizing: content-box; }';
  yield '.measure:not(.measure *) { margin-left: auto; margin-right: auto; }';
  
  yield '.measure { --content-px: 1rem; }';

  yield '.row { display: flex; flex-wrap: wrap; }';
  
  yield '.card { padding: 1rem; background: var(--tone); border-radius: 8px; box-shadow: var(--shadow-lg); }';
  
  yield '[data-p] { --px: 1rem; --py: 1rem; }';
  yield '[data-p=2] { --px: 2rem; --py: 2rem; }';
  
  yield '[data-m] { margin: 1rem auto; }';
  yield '[data-m~=b] { margin-bottom: 1rem; }';

  yield html`</style>`;
}

function leadingZero(input) {
  return `0${input}`.slice(-2);
}

function* LighthouseNav(keys) {
  yield html`<nav>`;
  yield html`<ul class>`;

  for (const { name } of keys) {
    yield html`<li class="card" data-m>`;
    const [domain, dateString, timestamp] = name.split(' ')
    const date = new Date(parseInt(timestamp, 10));
    const url = `/${domain}/${dateString} ${timestamp}.html`;
    yield html`<h2><a href="${url}">${domain} ${dateString} ${leadingZero(date.getUTCHours())}:${leadingZero(date.getUTCMinutes())}</a></h2>`;
    yield PSI.get(name, 'json').then(json => {
      if (!json.lighthouseResult) {
        return html`<p>Couldn’t load lighthouse results</p>`;  
      }
      
      const { audits, requestedUrl, lighthouseVersion } = json.lighthouseResult;
      return [
        html`<p><a href="${requestedUrl}">${requestedUrl}</a></p>`,
        AuditArticle(audits['screenshot-thumbnails'])
      ];
    });
  }

  yield html`</nav>`;
}

const htmlStart = html`<!doctype html><html lang=en><meta charset=utf-8><meta name=viewport content="width=device-width">`;

function* LighthouseResultPage(domain, json) {
  yield htmlStart;
  yield Meta.Title(`Speed of ${domain}`);
  yield SharedStyle();
  
  if (!json.lighthouseResult) {
    yield html`<p>Couldn’t load lighthouse results</p>`;
    return;
  }
  
  const { audits, requestedUrl, lighthouseVersion } = json.lighthouseResult;
  yield html`
    <body>
      <header role=banner>
        <nav class="measure" data-p=2>
          <ul class>
            <li><a href="/">Home</a></li>
          </ul>
        </nav>
      </header>
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
          <pre>${JSON.stringify(json, null, 2)}</pre>
        </details>
      </main>
    </body> `;
}

function LighthouseListPage(keys) {
  return renderHTML([
    htmlStart,
    Meta.Title('List of lighthouse results'),
    SharedStyle(),
    html`
      <body>
        <header role=banner>
          <nav class="measure" data-p=2>
            <ul class>
              <li><a href="/">Home</a></li>
            </ul>
          </nav>
        </header>
        <main>
          <h1 class="measure">Lighthouse results</h1>
          <section class="measure">${LighthouseNav(keys)}</section>
        </main>
      </body> `,
  ])
}

function DomainListPage() {
  return renderHTML([
    htmlStart,
    Meta.Title('Pending.Space'),
    SharedStyle(),
    html`
      <body>
        <header role=banner>
          <nav class="measure" data-p=2>
            <ul class>
              <li><a href="/" aria-current=page>Home</a></li>
            </ul>
          </nav>
        </header>
        <main class="measure">
          <h1>Choose a domain</h1>
          <ul>
          ${domains.map(domain => html`<li><a ${attributes({ href: `/?prefix=${domain}`})}>${domain}</a></li>`)}
          </ul>
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
        var encodedResult = await renderHTML(LighthouseResultPage(domain, json))
      } else {
        var result = json
      }
    } else {
      const prefix = searchParams.get('prefix');

      if (prefix) {
        const { keys } = await PSI.list({ prefix: searchParams.get('prefix'), limit: 20 })
        if (/\.json/.test(pathname)) {
          var result = { version: '0.1', keys }
        } else {
          var contentType = 'text/html';
          var encodedResult = await LighthouseListPage(keys);
        }
      } else {
        var contentType = 'text/html';
        var encodedResult = await DomainListPage();
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
