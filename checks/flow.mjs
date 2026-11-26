// Exercise the real UI event handlers and HTTP server without a browser binary.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import photos from '../game/photos.json' with {type:'json'};
const port=process.env.TEST_PORT || 4399, origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['local.mjs'],{env:{...process.env,PORT:String(port),GAME_DB:':memory:'},stdio:['ignore','pipe','inherit']});
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('exit',()=>reject(Error('Server exited')));});
 const calls={}, page={innerHTML:'',addEventListener:(event,fn)=>calls[event]=fn},notice={},input={value:''};
 const ctx=vm.createContext({document:{querySelector:s=>s==='#app'?page:s==='#answer'?input:notice},fetch:(path,options)=>fetch(origin+path,options)});
 vm.runInContext(await readFile('public/duel/game.js','utf8'),ctx);
 async function click(action,extra={}){await vm.runInContext('act('+JSON.stringify(action)+','+JSON.stringify(extra)+')',ctx);assert.equal(notice.textContent,'');}
 await click('local');await click('first2');
 const seen=new Set();
 for(const [r,w] of [4,8,16].entries()){
  assert.equal((page.innerHTML.match(/data-tile=/g)||[]).length,w*w);
  assert.ok(page.innerHTML.includes('Player '+(r%2?1:2)+'’s turn'));
  if(r===1)await click('guess',{text:'unicorn'});else await click('skip');
  assert.match(page.innerHTML,/Choose a tile/);
  await click('reveal',{tile:0});
  const fragment=page.innerHTML.match(/<img alt="" src="([^"]+)"/)[1];
  const photo=photos.find(p=>p.grids[w][0]===fragment);seen.add(photo.id);
  await click('guess',{text:'The '+photo.answers.at(-1).toUpperCase()});
  assert.ok(page.innerHTML.includes(photo.full));await click('next');
 }
 assert.equal(seen.size,3);assert.match(page.innerHTML,/Player 1 wins the match/);
 await click('home');assert.match(page.innerHTML,/Play on one screen/);
 console.log('Verified 4×4, 8×8 and 16×16, three unique photos, both turns, skip, miss, tile fetch, correct guesses, replay and final 2–1 score.');
}finally{server.kill();}
