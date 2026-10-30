import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import { inspectOutgoingResponse, resolveConfig } from '../functions/_badegg.js';

const config = resolveConfig({ BADEGG_MODE:'enforce', BADEGG_SCAN_PII:'1', BADEGG_SCAN_OUTPUT_BODIES:'1', BADEGG_OUTPUT_ACTION:'block' });
const host = 'idi.idi-official.workers.dev';
const check = async (body, { hostname=host, route='/members/', type='text/html', headers={} }={}) => {
  const res = new Response(body, {headers:{'content-type':type,...headers}});
  return inspectOutgoingResponse(res, route, config, null, null, {ip:'203.0.113.1',host:hostname,method:'GET'});
};

test('published mailto contact works on home HTML pages without changing response', async()=>{
  const body='<a href="mailto:0xffshell@duck.com">Contact</a>';
  const response=await check(body);assert.equal(response.status,200);assert.equal(await response.text(),body);
  assert.equal((await check('<p>0xffshell@duck.com</p>',{route:'/'})).status,200);
  assert.equal((await check('<p>0xffshell@duck.com</p>')).status,200);
  const members = await readFile(new URL('../members/index.html', import.meta.url), 'utf8');
  const scanned = await check(members); assert.equal(scanned.status,200); assert.equal(await scanned.text(),members);
});

test('other private data and unrelated origins remain blocked', async()=>{
  const link='<a href="mailto:0xffshell@duck.com">Contact</a>';
  for(const [body,options] of [
    ['<p>another@example.test</p>',{}],
    [link,{hostname:'other.example.test'}],
    [link,{type:'text/plain'}],
    ['<a href="mailto:0xffshell@duck.com.evil.test">Other</a>',{}],
    [link,{headers:{'x-contact':'another@example.test'}}]
  ]) assert.equal((await check(body,options)).status,502,JSON.stringify(options));
});
