// Runs the complete shared-screen flow against a disposable local database.
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import photos from '../game/photos.json' with {type:'json'};

const port=process.env.TEST_PORT || 4398;
const url='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['local.mjs'],{env:{...process.env,PORT:String(port),GAME_DB:':memory:'},stdio:['ignore','pipe','inherit']});
let browser;
try {
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('exit',()=>reject(Error('Local server failed to start')));});
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH || undefined});
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.goto(url);
  await page.getByText('Play on one screen').click();
  await page.getByText('Player 2 starts').click();
  const seen=new Set();
  for(const [round,width] of [4,8,16].entries()){
    await page.getByText('Player '+(round%2?1:2)+'’s turn').waitFor();
    assert.equal(await page.locator('.tile').count(),width*width);
    if(round===1){
      await page.locator('#answer').fill('a wrong answer');
      await page.getByRole('button',{name:'Guess',exact:true}).click();
    }else await page.getByText('Skip guess').click();
    await page.locator('.tile:enabled').first().click();
    const revealed=page.locator('.tile img');await revealed.waitFor();
    const image=await revealed.getAttribute('src');
    const puzzle=photos.find(p=>p.grids[width][0]===image);
    seen.add(puzzle.id);
    await page.locator('#answer').fill('The '+puzzle.answers.at(-1).toUpperCase());
    await page.getByRole('button',{name:'Guess',exact:true}).click();
    await page.getByText('Photo on Pexels').waitFor();
    await page.getByRole('button',{name:round<2?'Next round':'See final score'}).click();
  }
  await page.getByText('Player 1 wins the match.').waitFor();
  assert.equal(seen.size,3);
  await page.getByRole('button',{name:'New match'}).click();
  await page.getByText('Play on one screen').waitFor();
  console.log('Passed three unique rounds, alternate openers, skip, miss, reveal, aliases, 2–1 score, and replay.');
}finally{try{await browser?.close();}finally{server.kill();}}
