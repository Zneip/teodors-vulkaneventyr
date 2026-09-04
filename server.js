const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = Number(process.env.PORT || 4173);
const debugPin = '5859';
const shopPricesPath = path.join(root, 'shop-prices.json');
const shopPriceKeys = [
  'fish-slot',
  'fish',
  'jump-broth',
  'small-jump-broth',
  'kvikklunsj',
  'first-aid',
  'first-aid-extra',
  'rain-hat',
  'boots'
];
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function sendJson(response, status, value) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  response.end(JSON.stringify(value));
}

function validateShopPrices(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const prices = {};
  for (const key of shopPriceKeys) {
    const price = Number(value[key]);
    if (!Number.isInteger(price) || price < 0 || price > 999) return null;
    prices[key] = price;
  }
  return prices;
}

function saveShopPrices(request, response) {
  let body = '';
  request.setEncoding('utf8');
  request.on('data', chunk => {
    body += chunk;
    if (body.length > 8192) request.destroy();
  });
  request.on('end', () => {
    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      sendJson(response, 400, { error: 'Ugyldig JSON.' });
      return;
    }
    if (String(payload.pin || '') !== debugPin) {
      sendJson(response, 403, { error: 'Feil pinkode.' });
      return;
    }
    const prices = validateShopPrices(payload.prices);
    if (!prices) {
      sendJson(response, 400, { error: 'Alle priser må være heltall mellom 0 og 999.' });
      return;
    }
    fs.writeFile(shopPricesPath, `${JSON.stringify(prices, null, 2)}\n`, 'utf8', error => {
      if (error) {
        sendJson(response, 500, { error: 'Kunne ikke lagre prisfilen.' });
        return;
      }
      sendJson(response, 200, { prices });
    });
  });
  request.on('error', () => {
    if (!response.headersSent) sendJson(response, 400, { error: 'Kunne ikke lese forespørselen.' });
  });
}

const server = http.createServer((request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('Ugyldig adresse');
    return;
  }

  if (pathname === '/api/shop-prices') {
    if (request.method !== 'PUT') {
      response.writeHead(405, { Allow: 'PUT' }).end('Metoden er ikke tillatt');
      return;
    }
    saveShopPrices(request, response);
    return;
  }

  const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const filePath = path.resolve(root, requested);
  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403).end('Ingen tilgang');
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      response.writeHead(404).end('Ikke funnet');
      return;
    }
    response.writeHead(200, {
      'Content-Type': types[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    fs.createReadStream(filePath).pipe(response);
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Teodors Vulkaneventyr kjører på port ${port}`);
});
