const fs = require('fs');
const https = require('https');
const { URL } = require('url');

async function fetchBuffer(url){
  return new Promise((resolve,reject)=>{
    const u = new URL(url);
    const opts = { method: 'GET', headers: {}, timeout: 30000 };
    https.get(u, opts, res=>{
      const chunks = [];
      res.on('data', c=>chunks.push(c));
      res.on('end', ()=>{
        const buf = Buffer.concat(chunks);
        resolve({ ok: res.statusCode>=200 && res.statusCode<300, headers: res.headers, buffer: buf });
      });
    }).on('error', reject);
  });
}

async function run(){
  const parsedPath = 'tmp/parsed.json';
  if(!fs.existsSync(parsedPath)){ console.error('parsed.json missing'); process.exit(2); }
  const parsed = JSON.parse(fs.readFileSync(parsedPath,'utf8'));
  const cards = parsed.cards || [];
  fs.mkdirSync('tmp/images', { recursive: true });

  for(const c of cards){
    if(!c.imageUrl) continue;
    try{
      console.log('Fetching image', c.imageUrl);
      const res = await fetchBuffer(c.imageUrl);
      const ok = res.ok;
      const headers = res.headers;
      const buf = res.buffer;
      const ext = headers['content-type'] && headers['content-type'].split('/')[1] ? headers['content-type'].split('/')[1].split(';')[0] : 'bin';
      const fname = `tmp/images/${c.cid || c.name || 'img'}.${ext}`.replace(/[^a-z0-9\.\-]/gi,'_');
      fs.writeFileSync(fname, buf);
      fs.writeFileSync(fname + '.meta.json', JSON.stringify({ url: c.imageUrl, ok, headers }, null, 2));
      console.log('Saved', fname);
    }catch(e){ console.error('image fetch failed', c.imageUrl, e.message); }
  }
}

run().catch(e=>{ console.error(e); process.exit(1); });
