const nextFetch = require('next/dist/compiled/undici').fetch;
nextFetch('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=').then(r=>r.arrayBuffer()).then(b=>console.log('Success:', b.byteLength)).catch(e=>console.error('ERROR:', e.message));
