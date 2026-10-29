import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolveConfig, inspectOutgoingResponse, handleBansApi, handleLiftApi, handleBadEggRequest, resetBadEggV3State, resetConfigApiState, getActiveTemporaryBan} from '../functions/_badegg.js';
const token='test-token-at-least-16-chars';
const req=(path,ip='203.0.113.9',auth='invalid')=>new Request('https://local.test'+path,{headers:{'CF-Connecting-IP':ip, authorization:`Bearer ${auth}`}});
test('intentional public homepage contact is narrow and other PII remains protected',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 const config=resolveConfig({BADEGG_MODE:'enforce',BADEGG_SCAN_OUTPUTS:'1',BADEGG_SCAN_PII:'1',BADEGG_SCAN_OUTPUT_BODIES:'1',BADEGG_OUTPUT_ACTION:'block'});
 const scan=async(text,host='idi.idi-official.workers.dev',route='/')=>inspectOutgoingResponse(new Response(text,{headers:{'content-type':'text/html'}}),route,config,null,null,{host});
 assert.equal((await scan(html)).status,200);
 assert.equal((await scan(html+' private-person@example.org')).status,502);
 assert.equal((await scan('0xffshell@duck.com.example.org')).status,502);
 assert.equal((await scan(html,'elsewhere.example')).status,502);
 assert.equal((await scan(html,'idi.idi-official.workers.dev','/other')).status,502);
 assert.equal((await scan('0xffshell@duck.com and password = "SuperSecretPassword123456"')).status,502);
});
test('failed KV delete cannot report lift success, and list failure is visible',async()=>{
 resetBadEggV3State();resetConfigApiState();
 const record={mode:'active',expiresAtMs:null,reasonCategories:['test']};
 const kv={get:async()=>record,list:async()=>{throw Error('down')},delete:async()=>{throw Error('down')}};
 const env={BADEGG_ADMIN_TOKEN:token,IDI_BADEGG:kv};
 const lift=await handleLiftApi(new Request('https://local.test/api/badegg/lift',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({ip:'203.0.113.77'})}),env);
 assert.equal(lift.status,503);assert.equal((await lift.json()).ok,false);
 assert.ok(await getActiveTemporaryBan('203.0.113.77',env));
 const list=await handleBansApi(req('/api/badegg/bans','203.0.113.9',token),env);
 assert.equal(list.status,503);assert.equal((await list.json()).ok,false);
});
test('operator failures are throttled per source across endpoints without locking valid credentials',async()=>{
 resetBadEggV3State();resetConfigApiState();const env={BADEGG_ADMIN_TOKEN:token};
 const call=(path,ip,credential)=>handleBadEggRequest(req(path,ip,credential),env,{},()=>new Response('upstream'));
 for(let i=0;i<10;i++)assert.equal((await call('/api/badegg/bans','203.0.113.9','wrong')).status,401);
 assert.equal((await call('/?badegg-status=1','203.0.113.9','wrong')).status,429);
 assert.equal((await call('/api/badegg/config','203.0.113.10','wrong')).status,401);
 assert.equal((await call('/api/badegg/config','203.0.113.10',token)).status,200);
 assert.equal((await call('/api/badegg/config','203.0.113.9',token)).status,200);
});
test('KV policy read errors return 503 instead of silently using defaults',async()=>{
 resetBadEggV3State();resetConfigApiState();
 const env={BADEGG_ADMIN_TOKEN:token,IDI_BADEGG:{get:async()=>{throw Error('unavailable')}}};
 const response=await handleBadEggRequest(req('/','203.0.113.9',token),env,{},()=>new Response('upstream'));
 assert.equal(response.status,503);assert.match(await response.text(),/retry later/i);
});
