addEventListener("scheduled", event => {
  event.waitUntil(handleScheduled(event))
})

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

/**
 * Run psi
 * @param {ScheduledEvent} request
 */
async function handleScheduled(event) {
  const targetDomain = Math.random() > 0.0 ? 'components.guide' : 'icing.space';
  
  const rootURL = new URL("https://x2qwtp8clc.execute-api.us-west-2.amazonaws.com")
  const url = new URL("/staging/", rootURL);
  url.searchParams.set('url', `https://${targetDomain}/`);
  const response = await fetch(url);
  const data = await response.json();
  
  const date = new Date(event.scheduledTime);
  
  const id = `${targetDomain} ${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()} ${event.scheduledTime}`;
  await PSI.put(id, JSON.stringify(data));
}

const map = { "&": "amp", "<": "lt", ">": "gt", '"': "quot", "'": "#039" };
function escapeToHTML(input) {
  // return input.replace(/[&<>"']/g, (s) => `&${map[s]};`);
  return input.replace(/[&<>]/g, (s) => `&${map[s]};`);
}

function render(children) {
  const output = [];

  function consumeIterable(iteratable) {
    for (const child of iteratable) {
      if (typeof child === "string") {
        // If starts with <
        if (/^\s*[<]/.test(child)) {
          // Treat as already safe HTML
          output.push(child);
        } else {
          // Escape to safe HTML
          output.push(escapeToHTML(child));
        }
      } else if (typeof child === "number") {
        output.push(`${child}`);
      } else if (child != null && child[Symbol.iterator]) {
        consumeIterable(child);
      }
    }
  }

  consumeIterable(children);

  return output.join("");
}

function* html( literals, ...values) {
  for (let i = 0; i < literals.length; i++) {
    yield literals[i];
    if (values[i] != null && values[i] !== false) {
      yield values[i];
    }
  }
}

function formatBytes(bytes) {
  if (bytes > 1024 * 1024) {
    return `${Math.round(bytes / 1024 /1024)} MiB`;
  } else if (bytes > 1024) {
    return `${Math.round(bytes /1024)} KiB`;
  } else {
    return `${bytes} B`;
  }
}

function* Term(term, definition) {
  yield '<dt>';
  yield term;
  yield '</dt>';
  yield '<dd>';
  yield definition;
  yield '</dd>';
}

function* AuditArticle(audit) {
  yield '<article>';
  yield '<h3>';
  yield audit.title;
  yield '</h3>';
  
  yield '<dl>';
  
  yield audit.score != null && Term('Score', audit.score);
  yield audit.displayValue && Term('Value', audit.displayValue);
  
  if (audit.id === "mainthread-work-breakdown") {
    // yield JSON.stringify(Object.keys(audit));
    for (item of audit.details.items) {
      yield Term(item.groupLabel, `${Math.round(item.duration)} ms`);
    }
  } else if (audit.id === "total-byte-weight") {
    for (item of audit.details.items) {
      yield Term(item.url, formatBytes(item.totalBytes));
    }
  } else if (audit.id === "resource-summary") {
    for (item of audit.details.items) {
      if (item.requestCount > 0) {
        yield Term(item.label, `✕${item.requestCount} (${formatBytes(item.transferSize)})`);
      }
    }
  } else if (audit.id === "unused-css-rules") {
    for (item of audit.details.items) {
      yield Term(item.url, `${item.wastedPercent.toFixed(2)}% of ${formatBytes(item.totalBytes)} wasted`);
    }
  }
  
  yield '</dl>';
  
  if (audit.id === "screenshot-thumbnails") {
    for (item of audit.details.items) {
      yield "<figure>"
      yield `<img src="${item.data}" style="box-shadow: 2px 2px 8px rgba(0,0,0,0.25);">`
      yield "<figcaption>";
      yield `${item.timing} ms`;
      yield "</figcaption>";
      yield "</figure>"
    }
  }
  
  yield '</article>';
}

const Meta = {
  *Title(text) {
    yield '<title>'
    yield text;
    yield '</title>'
  }
}

function *SharedStyle() {
  yield '<style>';
  
  yield ':root { font-size: 125%; font-family: system-ui, sans-serif; }';
  yield ':root { --measure: 44rem; }';
  
  yield '*, *:before, *:after { font: inherit; }';
  yield 'h1 { font-size: 2rem; font-weight: bold; }';
  yield 'h2 { font-size: 1.5rem; font-weight: bold; }';
  yield 'h3 { font-size: 1.375rem; font-weight: bold; }';
  
  yield 'dl { display: grid; grid-template-columns: minmax(min-content, auto) max-content; }';
  yield 'dt { font-weight: bold; }';
  yield 'dd { text-align: "." center; }';
  
  yield '.measure { max-width: var(--measure); }';
  yield '.measure:not(.measure *) { margin-left: auto; margin-right: auto; }';
  
  yield '</style>';
}

/**
 * Respond with results
 * @param {Request} request
 */
async function handleRequest(request) {
  try {
    const url = new URL(request.url);
    const [, ...components] = url.pathname.split('/');
    if (components.length === 2 && new Set(['icing.space', 'components.guide']).has(components[0])) {
      const [encodedKey, extension] = components[1].split('.');
      const key = decodeURIComponent(encodedKey);
      const json = await PSI.get(`${components[0]} ${key}`, 'json');
      
      if (extension === 'html') {
        const { audits, requestedUrl, lighthouseVersion } = json.lighthouseResult;
        var contentType = 'text/html';
        var encodedResult = render([
          html`<!doctype html><html lang=en><meta charset=utf-8><meta name=viewport content="width=device-width">
        ${Meta.Title('Speed of icing.space')}
        ${SharedStyle()}
        <body>
        <main>
        <h1 class="measure">${requestedUrl}: Lighthouse ${lighthouseVersion}</h1>
        <section class="measure">
        <h2>Audits</h2>
        <div style="display: grid; grid-auto-columns: minmax(300px, auto);">
        ${Object.keys(audits).map(auditID => AuditArticle(audits[auditID]))}
        </div>
        </section>
        <details>
        <summary>Raw results</summary>
        <pre>${JSON.stringify(audits, null, 2)}</pre>
        </details>
        </main>
        `
      ]);
      } else {
        var result = json;
      }
    } else {
      const { keys } = await PSI.list();
      var result = { version: '0.1', keys };
    }
    
    return new Response(typeof encodedResult !== 'undefined' ? encodedResult : JSON.stringify(result), {
      headers: { 'content-type': typeof contentType === 'string' ? contentType : 'application/json; charset=utf-8' },
    });
  }
  catch (error) {
    return new Response(error.message, { status: 500 });
  }
}
