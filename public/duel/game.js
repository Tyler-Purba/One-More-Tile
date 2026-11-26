const app = document.querySelector("#app"),
  notice = document.querySelector("#notice");
let game = null,
  busy = false;
const safe = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const button = (action, label, secondary = false) =>
  '<button data-act="' +
  action +
  '" class="' +
  (secondary ? "secondary" : "") +
  '">' +
  label +
  "</button>";
const rules =
  '<details class="rules"><summary>How to play</summary><p>The coin winner chooses who starts. Each turn, make one public guess or skip it. A correct guess wins the round. Otherwise, reveal one tile and pass the turn. Once every tile is open, players alternate guesses until someone solves it.</p><p>Play three different photos on 4×4, 8×8 and 16×16 boards. The starting player alternates each round. Most rounds won takes the match.</p></details>';
function render() {
  const g = game;
  if (!g) {
    app.innerHTML =
      '<section class="hero"><div><span class="eyebrow">Two players · Three rounds</span><h1>One<br>More Tile.</h1><p>Recognize the photo before your opponent. Every tile you uncover gives them a clue, too.</p><div class="controls">' +
      button("local", "Play on one screen") +
      "</div>" +
      rules +
      '</div><img class="cover" src="/duel/cover.webp" alt="A kitten peeking through a partially revealed puzzle"></section>';
    return;
  }
  const bar =
    '<div class="score"><strong>ROUND ' +
    (g.round + 1) +
    " / 3</strong><span>P1 · " +
    g.score[0] +
    "</span><span>P2 · " +
    g.score[1] +
    "</span>" +
    "</div>";
  if (g.phase === "choose") {
    app.innerHTML =
      bar +
      '<section class="panel"><div class="coin">P' +
      g.coin +
      '</div><p class="eyebrow">Coin toss</p><h2>Player ' +
      g.coin +
      " wins the toss.</h2><p>Choose who takes the first turn.</p>" +
      '<div class="controls">' +
          button("first1", "Player 1 starts") +
          button("first2", "Player 2 starts", true) +
          "</div>" +
      "</section>";
    return;
  }
  if (g.phase === "finished") {
    app.innerHTML =
      bar +
      '<section class="panel"><p class="eyebrow">Final score · ' +
      g.score.join(" – ") +
      "</p><h2>Player " +
      (g.score[0] > g.score[1] ? 1 : 2) +
      " wins the match.</h2><ol>" +
      g.results
        .map(
          (r, i) =>
            "<li>" +
            [4, 8, 16][i] +
            "×" +
            [4, 8, 16][i] +
            " · " +
            safe(r.answer) +
            " · Player " +
            r.winner +
            "</li>",
        )
        .join("") +
      "</ol>" +
      button("home", "New match") +
      "</section>";
    return;
  }
  const done = g.phase === "result",
    cells = new Map(g.tiles),
    n = g.width;
  const board = done
    ? '<img class="full" src="' +
      g.full +
      '" alt="' +
      safe(g.results.at(-1).answer) +
      '">'
    : '<div class="board" style="grid-template-columns:repeat(' +
      n +
      ",1fr);grid-template-rows:repeat(" +
      n +
      ',1fr)">' +
      Array.from(
        { length: n * n },
        (_, i) =>
          '<button class="tile" data-tile="' +
          i +
          '" aria-label="Tile ' +
          (i + 1) +
          (cells.has(i) ? ", revealed" : "") +
          '" ' +
          (g.phase === "tile" && !cells.has(i) ? "" : "disabled") +
          ">" +
          (cells.has(i)
            ? '<img alt="" src="' + cells.get(i) + '">'
            : n === 4
              ? String(i + 1).padStart(2, "0")
              : "") +
          "</button>",
      ).join("") +
      "</div>";
  let side = "";
  if (done)
    side =
      '<p class="eyebrow">Round solved</p><h2>Player ' +
      g.results.at(-1).winner +
      " takes it.</h2><p>The answer was <b>" +
      safe(g.results.at(-1).answer) +
      '</b>. <a href="' +
      g.credit +
      '" target="_blank" rel="noreferrer">Photo on Pexels ↗</a></p>' +
      button("next", g.round === 2 ? "See final score" : "Next round");
  else {
    side =
      '<span class="eyebrow">Player ' +
      g.active +
      "’s turn</span><h2>" +
      (g.phase === "guess" ? "Take a guess." : "Choose a tile.") +
      "</h2>";
    if (g.phase === "tile")
      side += "<p>Tap one covered tile to reveal a clue for both players.</p>";
    else
      side +=
        '<form><label class="label" for="answer">What’s in the photo?</label><input id="answer" maxlength="80" autocomplete="off" placeholder="Your guess"><div class="controls"><button type="submit">Guess</button><button type="button" data-act="skip" class="secondary">Skip guess</button></div></form>';
    if (g.guesses.length)
      side +=
        '<div class="label">Recent guesses</div><ul class="log">' +
        g.guesses
          .slice(-4)
          .reverse()
          .map((x) => "<li>P" + x.player + " · " + safe(x.text) + "</li>")
          .join("") +
        "</ul>";
  }
  app.innerHTML =
    bar +
    '<section class="play"><div>' +
    board +
    '<div class="count">' +
    n +
    "×" +
    n +
    " grid · " +
    cells.size +
    " / " +
    n * n +
    " tiles revealed</div></div><div>" +
    side +
    "</div></section>";
}
async function call(path, body) {
  const response = await fetch('/api/puzzles'+path, {
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)
  });
  if (!response.ok && !response.headers.get('content-type')?.includes('json'))
    throw Error('Server unavailable. Try again.');
  const data = await response.json();
  if (!response.ok) throw Error(data.error);
  return data;
}
function beginRound(){
  game.width = 4 << game.round;
  game.active = game.round % 2 ? 3-game.first : game.first;
  game.phase='guess'; game.tiles=[]; game.guesses=[];
}
async function act(action, extra={}) {
  if (busy) return;
  busy=true; notice.textContent='';
  try {
    if(action==='local'){
      const {id}=await call('',{});
      game={id,coin:1+Math.floor(Math.random()*2),round:0,score:[0,0],results:[],phase:'choose'};
    } else if(action==='home'){game=null;}
    else if(game.phase==='choose' && ['first1','first2'].includes(action)){
      game.first=Number(action.slice(-1));beginRound();
    } else if(game.phase==='result' && action==='next'){
      if(game.round===2)game.phase='finished';
      else {game.round++;beginRound();}
    } else if(game.phase==='guess' && ['guess','skip'].includes(action)){
      if(action==='guess'){
        const result=await call('/'+game.id+'/guess',{round:game.round,text:extra.text});
        game.guesses.push({player:game.active,text:extra.text.trim()});
        if(result.correct){
          game.score[game.active-1]++;
          game.results.push({winner:game.active,answer:result.answer});
          game.full=result.full;game.credit=result.credit;game.phase='result';
        }
      }
      if(game.phase==='guess'){
        if(game.tiles.length===game.width**2)game.active=3-game.active;
        else game.phase='tile';
      }
    } else if(game.phase==='tile' && action==='reveal'){
      if(game.tiles.some(([i])=>i===extra.tile))return;
      const result=await call('/'+game.id+'/tile',{round:game.round,tile:extra.tile});
      game.tiles.push([extra.tile,result.image]);game.active=3-game.active;game.phase='guess';
    }
    render();
  }catch(e){notice.textContent=e.message;}
  finally{busy=false;}
}
app.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.act) act(b.dataset.act);
  if (b.dataset.tile !== undefined)
    act("reveal", { tile: Number(b.dataset.tile) });
});
app.addEventListener("submit", (e) => {
  e.preventDefault();
  act("guess", { text: document.querySelector("#answer").value });
});
render();
