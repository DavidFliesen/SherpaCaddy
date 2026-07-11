const $ = (id) => document.getElementById(id);
const STORE = 'sherpa-caddy-v1';
const state = JSON.parse(localStorage.getItem(STORE) || '{"rounds":[],"selectedCourse":null,"activeRound":null}');
let deferredPrompt;

const lessons = [
  ['⛳','What “par” means','Par is the expected number of strokes for a hole. A bogey is one over par; a birdie is one under.'],
  ['🧍','Where to stand','Stay out of another player’s line of sight and never stand close enough to be struck by a club or ball.'],
  ['⏱️','Keeping pace','Be ready when it is your turn. Limit practice swings, watch where every ball lands, and pick up when a hole is taking too long.'],
  ['🤫','Basic courtesy','Stay quiet and still while someone is hitting. Avoid walking across another player’s putting line.'],
  ['🛠️','Care for the course','Replace divots, rake bunkers, repair ball marks, and follow cart rules posted for the day.'],
  ['🧤','What to bring','Clubs, balls, tees, a ball marker, water, sun protection, comfortable shoes, and a good attitude are enough to begin.'],
  ['🏌️','Choosing a club','Use a club that gives you a comfortable, controlled shot. Beginners do not need to hit the longest possible club every time.'],
  ['🌬️','Playing the wind','A headwind usually calls for more club and a smooth swing. A tailwind may call for less club. Crosswinds reward a safer target.'],
  ['🛟','Playing safely','Never hit while people are within range. Shout “Fore!” immediately when a ball may be heading toward someone.']
];
const qa = [
  [/par|bogey|birdie|eagle/, 'Par is the target score for a hole. One over is a bogey, one under is a birdie, and two under is an eagle.'],
  [/turn|who goes|honor/, 'Usually the player farthest from the hole plays first. On the tee, the best score on the previous hole traditionally has the honor, but ready golf is often faster and friendlier.'],
  [/wind|club up|headwind/, 'Into a headwind, take more club and swing smoothly rather than harder. With a tailwind, consider less club. In a crosswind, aim for a safer landing area.'],
  [/bunker|sand/, 'Use the course’s rake when finished and leave the bunker smoother than you found it. For the shot, focus on getting out safely before trying something heroic.'],
  [/water|hazard|penalty/, 'Choose a target that keeps your normal miss away from the trouble. A safe shot that stays dry is usually better than a perfect shot you rarely hit.'],
  [/first time|beginner|new golfer/, 'Tell the starter or playing partners that you are new. Play from a comfortable tee, keep pace, and do not worry about finishing every hole. The goal is to learn and enjoy the round.'],
  [/what.*bring|equipment/, 'Bring clubs, balls, tees, a marker, water, sun protection, and comfortable shoes. You do not need a full professional setup to start.'],
  [/etiquette|courtesy|rules/, 'The essentials are simple: stay safe, be ready, remain quiet during shots, care for the course, and keep up with the group ahead.']
];

function persist(){ localStorage.setItem(STORE, JSON.stringify(state)); }
function toast(msg){ const t=$('toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2400); }
function switchView(id){ document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id)); document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.view===id)); window.scrollTo({top:0,behavior:'smooth'}); if(id==='rounds') renderRounds(); }
function normalizeCourse(c){
  const loc = c.location || c.address || {};
  return {
    id:c.id || c.course_id || c.slug || c.name,
    name:c.name || c.course_name || c.club_name || 'Unnamed course',
    city:c.city || loc.city || c.municipality || '', state:c.state || loc.state || c.region || '',
    latitude:Number(c.latitude ?? c.lat ?? loc.latitude ?? loc.lat),
    longitude:Number(c.longitude ?? c.lon ?? c.lng ?? loc.longitude ?? loc.lon ?? loc.lng),
    holes:c.holes || c.scorecard?.holes || []
  };
}
function extractCourses(data){ const arr = Array.isArray(data)?data:(data.courses||data.results||data.items||data.data||[]); return arr.map(normalizeCourse).filter(c=>c.name); }
async function fetchJSON(url){ const r=await fetch(url); if(!r.ok) throw new Error(`Request failed (${r.status})`); return r.json(); }
async function searchCourses(q){
  $('courseResults').innerHTML='<div class="card">Searching OpenGolfAPI…</div>';
  try{
    const data=await fetchJSON(`https://api.opengolfapi.org/v1/courses/search?q=${encodeURIComponent(q)}`);
    renderCourseResults(extractCourses(data));
  }catch(e){ $('courseResults').innerHTML=`<div class="card"><strong>Course search could not be loaded.</strong><p>${e.message}. Check your connection or try again later.</p></div>`; }
}
async function nearbyCourses(lat,lon){
  $('courseResults').innerHTML='<div class="card">Finding nearby courses…</div>';
  const urls=[
    `https://api.opengolfapi.org/v1/courses/nearby?lat=${lat}&lon=${lon}&radius=40`,
    `https://api.opengolfapi.org/v1/courses/nearby?latitude=${lat}&longitude=${lon}&radius=40`
  ];
  for(const url of urls){ try{ const courses=extractCourses(await fetchJSON(url)); if(courses.length){renderCourseResults(courses);return;} }catch(_){} }
  $('courseResults').innerHTML=`<div class="card"><strong>Your location was found.</strong><p>Automatic nearby-course lookup is unavailable right now. Search by a nearby city or course name.</p><small>Coordinates: ${lat.toFixed(3)}, ${lon.toFixed(3)}</small></div>`;
}
function renderCourseResults(courses){
  if(!courses.length){$('courseResults').innerHTML='<div class="card">No matching courses were found. Try a broader city or state search.</div>';return;}
  $('courseResults').innerHTML=courses.slice(0,20).map((c,i)=>`<button class="course-result" data-index="${i}"><strong>${escapeHTML(c.name)}</strong><span>${escapeHTML([c.city,c.state].filter(Boolean).join(', ')||'Location not listed')}</span></button>`).join('');
  [...$('courseResults').querySelectorAll('.course-result')].forEach(btn=>btn.onclick=()=>selectCourse(courses[Number(btn.dataset.index)]));
}
function selectCourse(c){ state.selectedCourse=c; persist(); $('selectedCourseName').textContent=c.name; $('selectedCourseLocation').textContent=[c.city,c.state].filter(Boolean).join(', '); $('selectedCourseCard').classList.remove('hidden'); $('courseResults').innerHTML=''; $('weatherPanel').innerHTML='<div class="weather-loading">Select “Load weather” to check playing conditions.</div>'; toast('Course selected'); }
async function loadWeatherFor(course){
  if(!Number.isFinite(course.latitude)||!Number.isFinite(course.longitude)){ $('weatherPanel').innerHTML='<div class="weather-loading">This course does not include coordinates in the available data.</div>';return; }
  $('weatherPanel').innerHTML='<div class="weather-loading">Loading conditions…</div>';
  try{
    const url=`https://api.open-meteo.com/v1/forecast?latitude=${course.latitude}&longitude=${course.longitude}&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=precipitation_probability&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto&forecast_days=1`;
    const d=await fetchJSON(url), c=d.current||{}; const rain=d.hourly?.precipitation_probability?.[new Date().getHours()] ?? '—';
    $('weatherPanel').innerHTML=[['Temperature',`${Math.round(c.temperature_2m)}°F`],['Feels like',`${Math.round(c.apparent_temperature)}°F`],['Wind',`${Math.round(c.wind_speed_10m)} mph`],['Gusts',`${Math.round(c.wind_gusts_10m)} mph`],['Wind direction',`${Math.round(c.wind_direction_10m)}°`],['Rain chance',`${rain}%`],['Precipitation',`${c.precipitation ?? 0} in`],['Sherpa note',weatherAdvice(c,rain)]].map(([a,b])=>`<div class="weather-item"><span>${a}</span><strong>${b}</strong></div>`).join('');
  }catch(e){$('weatherPanel').innerHTML=`<div class="weather-loading">Weather could not be loaded: ${e.message}</div>`;}
}
function weatherAdvice(c,rain){ const wind=Number(c.wind_speed_10m||0), gust=Number(c.wind_gusts_10m||0), r=Number(rain||0); if(gust>=25)return 'Strong gusts—play safer targets.'; if(wind>=15)return 'Windy—use extra club into the breeze.'; if(r>=50)return 'Rain likely—protect grips and allow less roll.'; return 'Comfortable conditions—focus on tempo.'; }
function startRound(){ const c=state.selectedCourse;if(!c)return toast('Select a course first'); const holes=Array.from({length:18},(_,i)=>({number:i+1,par:Number(c.holes?.[i]?.par)||4,strokes:0,note:''})); state.activeRound={id:crypto.randomUUID?.()||String(Date.now()),course:c,startedAt:new Date().toISOString(),currentHole:0,holes};persist();renderActiveRound();$('roundPanel').classList.remove('hidden');$('selectedCourseCard').classList.add('hidden'); }
function renderActiveRound(){ const r=state.activeRound;if(!r)return;$('roundCourseName').textContent=r.course.name; const h=r.holes[r.currentHole]; $('holeNumber').textContent=h.number;$('holePar').textContent=`Par ${h.par}`;$('strokeCount').textContent=h.strokes;$('scoreToPar').textContent=h.strokes?scoreLabel(h.strokes-h.par):'Not scored';$('holeNote').value=h.note||'';$('roundProgress').textContent=`Hole ${h.number} of ${r.holes.length}`; }
function scoreLabel(n){return n===0?'Even':n>0?`+${n}`:`${n}`}
function saveHole(){ const r=state.activeRound;if(!r)return; r.holes[r.currentHole].note=$('holeNote').value.trim();persist();toast('Hole saved'); }
function moveHole(delta){saveHole(); const r=state.activeRound;r.currentHole=Math.max(0,Math.min(r.holes.length-1,r.currentHole+delta));persist();renderActiveRound();}
function endRound(){ const r=state.activeRound;if(!r)return;saveHole(); r.endedAt=new Date().toISOString();r.totalStrokes=r.holes.reduce((s,h)=>s+h.strokes,0);r.totalPar=r.holes.reduce((s,h)=>s+h.par,0);state.rounds.unshift(r);state.activeRound=null;persist();$('roundPanel').classList.add('hidden');$('selectedCourseCard').classList.remove('hidden');toast('Round saved on this device');switchView('rounds');}
function renderRounds(){ const el=$('roundList');if(!state.rounds.length){el.innerHTML='<div class="card"><strong>No saved rounds yet.</strong><p>Completed rounds will remain on this device until you export or delete them.</p></div>';return;} el.innerHTML=state.rounds.map((r,i)=>`<article class="round-item"><div><h3>${escapeHTML(r.course.name)}</h3><p>${new Date(r.startedAt).toLocaleDateString()} · ${r.totalStrokes||0} strokes · ${scoreLabel((r.totalStrokes||0)-(r.totalPar||0))} to par</p><p>${r.holes.filter(h=>h.strokes).length} holes scored</p></div><div class="round-actions"><button class="secondary" data-export="${i}">Export</button><button class="danger" data-delete="${i}">Delete</button></div></article>`).join(''); el.querySelectorAll('[data-export]').forEach(b=>b.onclick=()=>downloadJSON(state.rounds[+b.dataset.export],`sherpa-round-${dateSlug(state.rounds[+b.dataset.export].startedAt)}.json`));el.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>{state.rounds.splice(+b.dataset.delete,1);persist();renderRounds();}); }
function downloadJSON(data,name){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download=name;a.click();URL.revokeObjectURL(a.href);}
function dateSlug(d){return new Date(d).toISOString().slice(0,10)}
function askSherpa(text){ const q=text.trim();if(!q)return; const found=qa.find(([rx])=>rx.test(q.toLowerCase())); const answer=found?found[1]:'For now, I can help with beginner rules, etiquette, scoring terms, wind, hazards, equipment, and first-round questions. A future backend can add a full conversational AI caddy.';$('answerTitle').textContent=q;$('answerText').textContent=answer;speak(answer);$('questionInput').value=''; }
function speak(text){if('speechSynthesis'in window){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.rate=.96;speechSynthesis.speak(u)}}
function setupSpeech(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){
    $('micBtn').disabled=true;
    $('voiceNote').textContent='Speech recognition is not available in this browser. You can still type questions.';
    return;
  }
  const rec=new SR();
  rec.lang='en-US';
  rec.interimResults=false;
  const normalResult=e=>askSherpa(e.results[0][0].transcript);
  rec.onstart=()=>{$('micBtn').classList.add('listening');$('voiceNote').textContent='Listening…'};
  rec.onend=()=>{$('micBtn').classList.remove('listening');$('voiceNote').textContent='Push to talk. Speech support varies by browser.'};
  rec.onerror=()=>toast('I could not hear that clearly.');
  rec.onresult=normalResult;
  $('micBtn').onclick=()=>{rec.onresult=normalResult;rec.start()};
  $('voiceScoreBtn').onclick=()=>{
    rec.onresult=e=>{
      const t=e.results[0][0].transcript.toLowerCase();
      const words={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10};
      const digit=t.match(/\d+/)?.[0];
      const word=Object.keys(words).find(w=>t.includes(w));
      const n=Number(digit||words[word]||0);
      if(n){
        state.activeRound.holes[state.activeRound.currentHole].strokes=n;
        persist();renderActiveRound();toast(`Recorded ${n} strokes`);
      }else toast('Say a number of strokes.');
      rec.onresult=normalResult;
    };
    rec.start();
  };
}
function escapeHTML(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('installBtn').classList.remove('hidden')});$('installBtn').onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('installBtn').classList.add('hidden')}};
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js');
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>switchView(b.dataset.view));document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>switchView(b.dataset.go));
$('lessonGrid').innerHTML=lessons.map(([i,t,p])=>`<article class="lesson"><span class="icon">${i}</span><h3>${t}</h3><p>${p}</p></article>`).join('');
$('askBtn').onclick=()=>askSherpa($('questionInput').value);$('questionInput').onkeydown=e=>{if(e.key==='Enter')askSherpa(e.target.value)};$('searchCourseBtn').onclick=()=>searchCourses($('courseSearch').value.trim());$('courseSearch').onkeydown=e=>{if(e.key==='Enter')searchCourses(e.target.value.trim())};$('nearMeBtn').onclick=()=>navigator.geolocation?navigator.geolocation.getCurrentPosition(p=>nearbyCourses(p.coords.latitude,p.coords.longitude),()=>toast('Location permission was not granted.'),{enableHighAccuracy:true,timeout:10000}):toast('Location is not supported.');
$('clearCourseBtn').onclick=()=>{$('selectedCourseCard').classList.add('hidden');state.selectedCourse=null;persist()};$('loadWeatherBtn').onclick=()=>loadWeatherFor(state.selectedCourse);$('quickWeatherBtn').onclick=()=>{switchView('play');if(state.selectedCourse){$('selectedCourseCard').classList.remove('hidden');loadWeatherFor(state.selectedCourse)}else toast('Choose a course to check its weather.')};$('startRoundBtn').onclick=startRound;$('addStrokeBtn').onclick=()=>{state.activeRound.holes[state.activeRound.currentHole].strokes++;persist();renderActiveRound()};$('minusStrokeBtn').onclick=()=>{const h=state.activeRound.holes[state.activeRound.currentHole];h.strokes=Math.max(0,h.strokes-1);persist();renderActiveRound()};$('prevHoleBtn').onclick=()=>moveHole(-1);$('nextHoleBtn').onclick=()=>moveHole(1);$('saveHoleBtn').onclick=saveHole;$('endRoundBtn').onclick=endRound;$('exportAllBtn').onclick=()=>downloadJSON({app:'Sherpa Caddie',exportedAt:new Date().toISOString(),rounds:state.rounds},`sherpa-caddie-rounds-${dateSlug(new Date())}.json`);$('importBtn').onclick=()=>$('importFile').click();$('importFile').onchange=async e=>{try{const d=JSON.parse(await e.target.files[0].text());const rounds=Array.isArray(d)?d:(d.rounds||[d]);state.rounds=[...rounds,...state.rounds];persist();renderRounds();toast(`${rounds.length} round(s) imported`)}catch(_){toast('That file could not be imported.')}};
setupSpeech();if(state.selectedCourse){selectCourse(state.selectedCourse)}if(state.activeRound){$('roundPanel').classList.remove('hidden');$('selectedCourseCard').classList.add('hidden');renderActiveRound();switchView('play')}renderRounds();
