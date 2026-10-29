import test from 'node:test';import assert from 'node:assert/strict';
function fixture(){return {schema:2,block:{v4:{ips:['203.0.113.8',...Array.from({length:999},(_,i)=>`10.${Math.floor(i/256)}.${i%256}.1`)],nets:Array.from({length:100},(_,i)=>`198.18.${i}.0/24`)},v6:{ips:[],nets:['2001:db8::/32']}},counts:{v4Ips:1000,v4Nets:100,v6Ips:0,v6Nets:1}}}
const request=ip=>new Request('https://local.test/',{headers:{'CF-Connecting-IP':ip}});
test('failed verification retries three times and returns a safe 503',async()=>{
 const m=await import('../functions/_badegg.js?offline-test');let calls=0;const orig=globalThis.fetch;globalThis.fetch=async()=>{calls++;throw Error('offline')};try{
 const res=await m.handleBadEggRequest(request('203.0.113.7'),{}, {},()=>new Response('upstream'));assert.equal(res.status,503);assert.equal(calls,8);assert.match(await res.text(),/retry later/i);
 }finally{globalThis.fetch=orig}
});
test('external blocklist wins over allowlist for normal requests',async()=>{
 const m=await import('../functions/_badegg.js?healthy-test');const orig=globalThis.fetch;globalThis.fetch=async url=>String(url).includes('.bin')?new Response('',{status:503}):new Response(JSON.stringify(fixture()),{headers:{'content-type':'application/json'}});try{
 const res=await m.handleBadEggRequest(request('203.0.113.8'),{BADEGG_ALLOWLIST:'203.0.113.8'}, {},()=>new Response('upstream'));assert.equal(res.status,403);
 }finally{globalThis.fetch=orig}
});
