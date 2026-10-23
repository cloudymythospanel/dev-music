const http = require('http');
const https = require('https');
const url = require('url');
const { Ytdl } = require('@distube/ytdl-core');

const ytdl = new Ytdl();
const PORT = 5055;

const server = http.createServer(async (req, res) => {
  // CORS headers so iPhone can call it freely
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  // 1. STREAM AUDIO DIRECTLY
  if (pathname === '/stream') {
    const videoId = query.v;
    if (!videoId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing v parameter' }));
      return;
    }

    try {
      const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`);
      const audioFormats = info.formats.filter(f => f.hasAudio && !f.hasVideo);
      // Pick best audio (m4a / aac)
      const bestAudio = audioFormats.find(f => f.container === 'm4a') || audioFormats[0];

      if (!bestAudio || !bestAudio.url) {
        throw new Error('No audio stream found');
      }

      // Redirect iPhone to the direct audio stream
      res.writeHead(302, {
        Location: bestAudio.url,
        'Content-Type': 'audio/mp4'
      });
      res.end();
    } catch (err) {
      console.error('Stream error for', videoId, err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 2. SEARCH SONGS BY LYRICS / WORDS
  if (pathname === '/search') {
    const q = query.q;
    if (!q) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify([]));
      return;
    }

    try {
      const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q + ' song')}`;
      https.get(ytUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      }, (ytRes) => {
        let html = '';
        ytRes.on('data', chunk => html += chunk);
        ytRes.on('end', () => {
          const items = [];
          const seenIds = new Set();
          const vidMatches = [...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)];
          const uniqueIds = [...new Set(vidMatches.map(m => m[1]))].slice(0, 15);

          for (const vid of uniqueIds) {
            if (!seenIds.has(vid)) {
              seenIds.add(vid);
              const titleMatch = html.match(
                new RegExp('"videoId":"' + vid + '"[\\s\\S]*?"title":\\{"runs":\\[\\{"text":"(.*?)"\\}')
              );
              const artistMatch = html.match(
                new RegExp('"videoId":"' + vid + '"[\\s\\S]*?"ownerText":\\{"runs":\\[\\{"text":"(.*?)"\\}')
              );

              items.push({
                id: `stream-${vid}`,
                videoId: vid,
                title: titleMatch ? titleMatch[1] : q,
                artist: artistMatch ? artistMatch[1] : 'Music',
                artwork: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
                url: `http://192.168.1.40:${PORT}/stream?v=${vid}`
              });
            }
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(items));
        });
      }).on('error', (e) => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      });
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`DEV MUSIC Streaming Audio Engine running on http://0.0.0.0:${PORT}`);
});
