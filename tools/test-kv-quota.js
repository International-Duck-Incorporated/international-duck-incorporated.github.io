import test from 'node:test';import assert from 'node:assert/strict';
import {handleBadEggRequest,resetBadEggV3State,resetConfigApiState} from '../functions/_badegg.js';
const token='synthetic-admin-token-more-than-16';
test('status never lists ban keys, while explicit ban list still reports failures honestly',async()=>{
 resetBadEggV3State();resetConfigApiState();
 const ips=Array.from({length:1000},(_,i)=>`10.${Math.floor(i/256)}.${i%256}.1`),nets=Array.from({length:100},(_,i)=>`198.18.${i}.0/24`);const fixture={schema:2,block:{v4:{ips,nets},v6:{ips:[],nets:['2001:db8::/32']}},counts:{v4Ips:1000,v4Nets:100,v6Ips:0,v6Nets:1}};
 let lists=0;const env={BADEGG_ADMIN_TOKEN:token,IDI_BADEGG:{get:async()=>null,list:async()=>{lists++;throw Error('quota exhausted')}}};const old=globalThis.fetch;globalThis.fetch=async url=>String(url).includes('.bin')?new Response('',{status:503}):new Response(JSON.stringify(fixture),{headers:{'content-type':'application/json'}});
 try{
 const req=path=>new Request('https://local.test'+path,{headers:{'CF-Connecting-IP':'203.0.113.9',authorization:`Bearer ${token}`}});
 for(let i=0;i<20;i++){const res=await handleBadEggRequest(req('/?badegg-status=1'),env,{},()=>new Response('upstream'));assert.equal(res.status,200);const body=await res.json();assert.equal(body.waf.activeTempBans,null);assert.equal(body.waf.banCountScope,'not_loaded')}
 assert.equal(lists,0);
 const bans=await handleBadEggRequest(req('/api/badegg/bans'),env,{},()=>new Response('upstream'));assert.equal(bans.status,503);assert.equal(lists,1);assert.equal((await bans.json()).ok,false);
 }finally{globalThis.fetch=old}
});
