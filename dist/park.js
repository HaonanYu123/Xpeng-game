'use strict';
(() => {
const $=id=>document.getElementById(id),canvas=$('parkCanvas'),STORE='xiaop-cloudhaven-park-v1';let saved=null,storageOK=true;
try{saved=JSON.parse(localStorage.getItem(STORE));}catch(e){storageOK=false;}
let engine=window.ParkEngine.create({saved});engine.setSpeed(1.5);
const petData=window.ParkMotion.characters,emotes=window.ParkEngine.emotes,images={},assetErrors=[];
const CARE_TOPUP_REVISION=2;
const BATTLE_RETURN_DELAY_MS=1800;
const care=window.ParkCare.create({saved:saved?.care,refillRevision:CARE_TOPUP_REVISION});
const initialCare=care.serialize();
if(initialCare.needsRefillRevision!==saved?.care?.needsRefillRevision){
 const toppedUp={...(saved||engine.serialize()),care:initialCare};
 try{localStorage.setItem(STORE,JSON.stringify(toppedUp));saved=toppedUp;}catch(e){storageOK=false;}
}
const petCard=$('petCard'),duelPicker=$('duelPicker'),mapPicker=$('mapPicker');
const dialogs=[petCard,duelPicker,mapPicker],openDialog=()=>dialogs.find(d=>d.open);
let duelOrigin=null,mapOrigin=null,adventure=null,homeState=null;
const combat=window.ParkCombat.create({care});let battlePainter,selectedActions=false,currentScene=window.ParkWorlds.scenes.find(s=>s.id===saved?.sceneId)||window.ParkWorlds.scenes[0];
const scenePositions=saved?.scenePositions||{};let lastBattlePhase=null,battleReturnAt=null,encounterNotice=null;
const danceAudio=window.ParkDance.createAudio();
const world=engine.world,halfW=world.width/2,halfH=world.height/2;
const camera={x:halfW,y:halfH,zoom:1};let painter,hover=-1,destination=null,previous=0,uiElapsed=0,saveElapsed=0,lastSelected=-1,activeExpression='joy',drag=null;
const expressionChoices=engine.actors.map(a=>a.expression||'joy');
const personalities=['好奇心满满','慢悠悠的云朵','爱蹦跳的小朋友','喜欢暖暖的阳光','想和大家做朋友','悬浮着陪在身边'];
$('emoteButtons').innerHTML=Object.entries(emotes).map(([id,e])=>`<button class="emote-button" id="emote-${id}" aria-pressed="${id===activeExpression}"><span class="emote-thumbnail" id="emote-thumb-${id}" aria-hidden="true"></span><b>${e.name}</b></button>`).join('');
function save(){try{const base=adventure?homeState:engine.serialize();localStorage.setItem(STORE,JSON.stringify({...base,expressions:engine.serialize().expressions,sceneId:currentScene.id,scenePositions,care:care.serialize()}));storageOK=true;$('saveStatus').textContent='陪伴与位置已保存';}catch(e){storageOK=false;$('saveStatus').textContent='当前浏览器暂不能保存位置';}}
function renderCare(snapshot,careState){
 const pet=careState.pets[snapshot.selected],profile=pet.profile,job=pet.job;
 $('careLevel').textContent='Lv.'+pet.growth.level;
 $('careXpBar').style.width=pet.growth.current/pet.growth.next*100+'%';
 $('careXpText').textContent=pet.growth.maxed?'已满级 · Lv.10':'成长 '+pet.growth.current+' / '+pet.growth.next;
 $('needFoodLabel').textContent=pet.id===5?'能量':'饱食';
 for(const [key,label]of [['food','Food'],['mood','Mood'],['clean','Clean'],['energy','Energy']]){
  const value=window.ParkCare.needValue(pet.needs[key]);
  $('need'+label+'Value').textContent=value;
  $('need'+label+'Bar').style.width=value+'%';
  $('need'+label).setAttribute('aria-valuenow',String(value));
  $('need'+label).classList.toggle('low',value<35);
 }
 $('needFood').setAttribute('aria-label',pet.id===5?'能量':'饱食');
 $('careFeedLabel').textContent=profile.feed;
 for(const action of ['feed','pet','bath','dance'])$('care-'+action).disabled=!care.available(pet.id,action).ok;
 let activity='';
 if(job)activity=job.stage==='going'?'正在找个开阔的位置':job.action==='dance'?'正在一起跳舞':{feed:'正在享用'+profile.food,pet:'正在摸摸头',bath:'泡泡澡进行中'}[job.action];
 $('battleRequirement').hidden=Object.values(pet.needs).some(v=>window.ParkCare.needValue(v)>=window.ParkCare.rules.battleMin);
 $('careActivity').textContent=activity;
 $('careActivity').hidden=!activity;
 $('careProgress').hidden=!job||job.stage!=='doing';
 $('careProgressBar').style.width=job?Math.min(100,job.elapsed/job.duration*100)+'%':'0%';

}
function activeDance(state=care.snapshot()){return state.pets.find(p=>p.job?.action==='dance')||null;}
function cancelDance(){const p=activeDance();if(p){care.cancel(engine,p.id);updateUI();save();}}
function tapDance(point){const p=activeDance();if(!p)return false;if(window.ParkDance.contains(engine.actors[p.id],point)){care.tap(engine,p.id);updateUI();}return true;}
function runCare(action){
 const id=engine.snapshot().selected;
 if(action==='dance')danceAudio.unlock();selectedActions=false;
 const result=care.act(engine,id,action);if(!result.ok){updateUI();return;}
 updateUI();save();closePetCard();
}
for(const action of ['feed','pet','bath','dance'])$('care-'+action).onclick=()=>runCare(action);
function updateUI(snapshot=engine.snapshot()){
 const careState=snapshot.care||care.snapshot();
 const a=snapshot.actors[snapshot.selected],p=petData[a.species];if(lastSelected!==a.id){lastSelected=a.id;$('selectedNumber').textContent=String(a.id+1).padStart(2,'0')+' / 06';$('selectedDescription').textContent=p.desc;$('selectedPersonality').textContent=personalities[a.id];}
 $('interactionCount').textContent=snapshot.emoteCount;
 $('petCardName').textContent=a.name;
 petCard.setAttribute('data-pet',p.key);
 renderCare(snapshot,careState);renderExpression(snapshot);renderControls(careState);canvas.classList.toggle('dance-active',Boolean(activeDance(careState)));
}
function openPetCard(id){
 if(!engine.actors[id]||battleViewState()||duelPicker.open||mapPicker.open)return;
 if(adventure&&adventure.snapshot().id!==id)return;if(adventure&&!care.snapshot().pets[id].job)adventure.stop();destination=null;clearEncounterNotice();
 drag=null;hover=-1;canvas.classList.remove('dragging');
 engine.select(id);updateUI();save();
 if(!petCard.open)petCard.show();renderControls();
}
function renderControls(state=care.snapshot()){
 const battle=battleViewState(),p=state.pets[engine.snapshot().selected],allowed=care.battleAvailable(p.id);
 $('petActions').hidden=(!adventure&&(!selectedActions||Boolean(p.job)))||petCard.open||Boolean(battle)||duelPicker.open||mapPicker.open;
 $('openBackpack').hidden=false;$('openBackpack').disabled=false;
 $('returnCamp').hidden=!adventure;$('enterBattle').hidden=Boolean(adventure);
 if(encounterNotice&&Date.now()>=encounterNotice.until)encounterNotice=null;
 $('encounterNotice').hidden=!encounterNotice||!adventure||Boolean(battle)||petCard.open||duelPicker.open||mapPicker.open;
 $('encounterNotice').textContent=encounterNotice?.text||'';
 $('enterBattle').disabled=false;
 $('enterBattle').title='战斗';
 $('enterBattle').setAttribute('aria-label',$('enterBattle').title);$('sceneLabel').textContent=currentScene.name;
 canvas.setAttribute('aria-label',battle?'竞技场对战，点击底部滑轮锁定并发射光波，中央区域正常伤害，其他位置半伤':adventure?'探索地图：点击道路移动，点击宠物或小怪战斗，下方可打开背包或返回营地':'营地：点击宠物后，可打开背包或点击战斗选择探索地图');
 $('openDuel').disabled=!allowed.ok;renderDuelChoices();
 const modal=Boolean(openDialog());canvas.inert=modal;
 $('dialogShade').hidden=!modal;$('screenTools').hidden=!adventure||Boolean(battle)||modal;
 $('battlePanel').hidden=!battle;if(!battle)return;
 const ended=window.ParkCombat.ended(battle.phase);
 $('battleWave').hidden=ended;$('battleWave').disabled=battle.phase!=='player';
 $('battleWave').setAttribute('aria-label',battle.skillName+'：点击滑轮锁定落点，中央区域正常伤害，其他位置半伤');
 $('battleResult').textContent=ended?(battle.phase==='draw'?'平局':battle.mode==='pvp'?engine.actors[battle.winnerId].name+' 获胜':battle.phase==='victory'?'挑战成功':'下次再来')+(battle.winnerId!==null?'，经验增加 '+battle.reward.xp:''):'';
 $('leaveBattle').textContent=ended?'返回地图':'返回';

}
function selectPetActions(id){if(!engine.actors[id]||activeDance()||battleViewState()||duelPicker.open||mapPicker.open||adventure)return;engine.select(id);selectedActions=true;drag=null;updateUI();save();}
$('openBackpack').onclick=()=>openPetCard(engine.snapshot().selected);
$('enterBattle').onclick=()=>{
 if(adventure||battleViewState()||petCard.open||duelPicker.open||activeDance())return;mapOrigin=engine.snapshot().selected;mapPicker.show();renderControls();
};
for(const scene of window.ParkWorlds.scenes){
 $('map'+scene.id[0].toUpperCase()+scene.id.slice(1)).onclick=()=>{if(!mapPicker.open||mapOrigin===null)return;const id=mapOrigin;mapPicker.close();enterAdventure(id,scene.id);};
}
$('closeMapPicker').onclick=()=>mapPicker.close();
mapPicker.addEventListener('close',()=>{mapOrigin=null;canvas.focus({preventScroll:true});updateUI();});
mapPicker.addEventListener('cancel',e=>{e.preventDefault();mapPicker.close();});
mapPicker.addEventListener('click',e=>{if(e.target!==mapPicker)return;const r=mapPicker.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)mapPicker.close();});
$('battleWave').onclick=()=>{if(combat.command('wave'))updateUI();};
function battleViewState(){return combat.snapshot();}
function leaveBattle(){
 battleReturnAt=null;lastBattlePhase=null;
 const battle=combat.snapshot();if(!battle)return;combat.leave();clearEncounterNotice();
 if(battle){if(adventure&&battle.mode==='pve')adventure.resolve(battle);else engine.resumeActor(battle.id);if(battle.mode==='pvp')engine.resumeActor(battle.opponentId);}
 selectedActions=false;updateUI();save();canvas.focus({preventScroll:true});
}
$('leaveBattle').onclick=leaveBattle;
function beginCombatView(){
 battleReturnAt=null;lastBattlePhase=null;
 const battle=combat.snapshot();if(!battle)return;clearEncounterNotice();selectedActions=false;engine.holdActor(battle.id);if(battle.mode==='pvp')engine.holdActor(battle.opponentId);
 destination=null;hover=-1;drag=null;resetView();danceAudio.update(null,null);updateUI();save();canvas.focus({preventScroll:true});
}
for(let id=0;id<6;id++){
 const pet=petData[id],button=$('duelPet'+id);button.innerHTML='<img src="'+pet.image+'" alt=""><b>'+pet.name+'</b>';
 button.onclick=()=>{if(!duelPicker.open||duelOrigin===null)return;const result=combat.startDuel(duelOrigin,id);if(!result.ok){renderDuelChoices();return;}duelPicker.close();beginCombatView();};
}
function renderDuelChoices(){
 if(duelOrigin===null)return;const source=care.battleAvailable(duelOrigin);
 for(let id=0;id<6;id++){const b=$('duelPet'+id),target=care.battleAvailable(id);b.hidden=id===duelOrigin;b.disabled=!source.ok||!target.ok||id===duelOrigin;b.title=b.disabled?(source.reason==='needs'||target.reason==='needs'?'四项都低于 30 时不能战斗':'伙伴正在互动'):'与'+petData[id].name+'对战';}
}
$('openDuel').onclick=()=>{const id=engine.snapshot().selected;if(!care.battleAvailable(id).ok||combat.snapshot())return;duelOrigin=id;closePetCard();$('duelTitle').textContent=engine.actors[id].name+' · 选择对手';duelPicker.show();renderControls();};
function closeDuelPicker(){if(duelPicker.open)duelPicker.close();}
$('closeDuelPicker').onclick=closeDuelPicker;
duelPicker.addEventListener('close',()=>{duelOrigin=null;canvas.focus({preventScroll:true});updateUI();});
duelPicker.addEventListener('cancel',e=>{e.preventDefault();closeDuelPicker();});
duelPicker.addEventListener('click',e=>{if(e.target!==duelPicker)return;const r=duelPicker.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDuelPicker();});

function enterAdventure(id,theme){
 if(battleViewState()||duelPicker.open)return;
 clearEncounterNotice();if(!adventure)homeState=engine.serialize();for(const p of care.snapshot().pets)care.cancel(engine,p.id);
 currentScene=window.ParkWorlds.scenes.find(s=>s.id===theme)||window.ParkWorlds.scenes[0];
 window.ParkWorlds.use(currentScene.id,Boolean(images['scene-'+currentScene.id]?.naturalWidth));
 engine=window.ParkEngine.create({saved:{...homeState,expressions:engine.serialize().expressions,selected:id,mapId:window.ParkMap.world.id,positions:[]},soloId:id});engine.setSpeed(1.5);
 adventure=window.ParkAdventure.create({engine,care,combat,id,theme:currentScene.id});painter=window.ParkScene.create(canvas,images);
 selectedActions=false;destination=null;hover=-1;drag=null;resetView();updateUI();save();canvas.focus({preventScroll:true});
}
function restoreHome(persist=true){
 if(combat.snapshot())return;for(const p of care.snapshot().pets)care.cancel(engine,p.id);const state={...(homeState||engine.serialize()),expressions:engine.serialize().expressions};adventure=null;homeState=null;clearEncounterNotice();
 window.ParkWorlds.use(currentScene.id,false);engine=window.ParkEngine.create({saved:state});engine.setSpeed(1.5);
 painter=window.ParkScene.create(canvas,images);selectedActions=false;destination=null;hover=-1;drag=null;resetView();updateUI();if(persist)save();
}
$('returnCamp').onclick=()=>{if(adventure&&!battleViewState())restoreHome();};
function clearEncounterNotice(){encounterNotice=null;}
function showEncounterNeeds(result){
 const p=care.snapshot().pets[adventure.snapshot().id],labels={food:p.id===5?'能量':'饱食',mood:'心情',clean:'清洁',energy:'体力'};
 const low=result.low||Object.keys(p.needs).filter(k=>window.ParkCare.needValue(p.needs[k])<window.ParkCare.rules.battleMin);
 encounterNotice={text:low.map(k=>labels[k]+' '+window.ParkCare.needValue(p.needs[k])).join('、')+' 均低于 30，暂不能战斗',until:Date.now()+4500};updateUI();
}
function adventureClick(point){
 if(!adventure)return false;const result=adventure.trigger(point);
 if(result.handled){if(result.ok)beginCombatView();else if(result.reason==='needs')showEncounterNeeds(result);return true;}
 clearEncounterNotice();if(adventure.move(point)){const target=adventure.snapshot().target;destination={...target,until:engine.snapshot().time+2.5};}updateUI();return true;
}
function closePetCard(){if(petCard.open)petCard.close();}
$('closePetCard').onclick=closePetCard;
petCard.addEventListener('close',()=>{canvas.focus({preventScroll:true});updateUI();});
petCard.addEventListener('cancel',e=>{e.preventDefault();closePetCard();});
petCard.addEventListener('click',e=>{
 if(e.target!==petCard)return;
 const r=petCard.getBoundingClientRect();
 if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closePetCard();
});
function renderExpression(snapshot){
 const actor=snapshot.actors[snapshot.selected],id=expressionChoices[actor.id],preview=window.ParkExpressions.previewFor(actor.species,id);
 if(!preview)return;
 activeExpression=id;
 $('parkExpression').style.backgroundImage=`url('${preview.image}')`;
 $('parkExpression').style.backgroundSize=preview.backgroundSize;
 $('parkExpression').style.backgroundPosition=preview.backgroundPosition;
 $('parkExpression').setAttribute('aria-label',actor.name+' · '+emotes[id].name);
 $('expressionPet').textContent=actor.name+'的表情';
 $('expressionName').textContent=emotes[id].name;
 $('expressionSource').textContent=actor.name+' · '+emotes[id].name;
 for(const key of Object.keys(emotes)){
  const thumbnail=window.ParkExpressions.previewFor(actor.species,key,84),button=$('emote-'+key),image=$('emote-thumb-'+key);
  button.disabled=Boolean(care.snapshot().pets[actor.id].job);button.setAttribute('aria-pressed',String(key===id));button.setAttribute('aria-label',actor.name+'：'+emotes[key].name);
  image.style.backgroundImage=`url('${thumbnail.image}')`;image.style.backgroundSize=thumbnail.backgroundSize;image.style.backgroundPosition=thumbnail.backgroundPosition;
 }
}
function setExpression(id){
 const e=emotes[id],actor=engine.actors[engine.snapshot().selected];if(!e)return;
 if(care.snapshot().pets[actor.id].job)return;
 if(adventure)engine.resumeActor(actor.id);
 if(!engine.setExpression(id))return;
 expressionChoices[actor.id]=id;updateUI();save();
}
Object.keys(emotes).forEach(id=>$('emote-'+id).onclick=()=>setExpression(id));
function clampCamera(){camera.x=Math.max(halfW/camera.zoom,Math.min(world.width-halfW/camera.zoom,camera.x));camera.y=Math.max(halfH/camera.zoom,Math.min(world.height-halfH/camera.zoom,camera.y));}
function setZoom(value){camera.zoom=Math.max(1,Math.min(1.8,Math.round(value*10)/10));clampCamera();}
function resetView(){camera.x=halfW;camera.y=halfH;setZoom(1);}
function toWorld(clientX,clientY){const r=canvas.getBoundingClientRect(),px=(clientX-r.left)/r.width,py=(clientY-r.top)/r.height;return{x:px*world.width/camera.zoom+camera.x-halfW/camera.zoom,y:py*world.height/camera.zoom+camera.y-halfH/camera.zoom,inside:Math.hypot(px-.5,py-.5)<=.5};}
function hitPet(point){
 if(point.inside===false)return null;
 const records=care.snapshot().pets;
 return engine.actors.slice().sort((a,b)=>b.y-a.y).find(actor=>{
  const bounds=window.ParkMotion.hitBounds(actor,records[actor.id]);
  return point.x>bounds.left&&point.x<bounds.right&&point.y>bounds.top&&point.y<bounds.bottom;
 });
}
canvas.addEventListener('pointerdown',e=>{if(openDialog()||battleViewState()||e.button!==undefined&&e.button!==0||!toWorld(e.clientX,e.clientY).inside)return;drag={id:e.pointerId,startX:e.clientX,startY:e.clientY,camX:camera.x,camY:camera.y,moved:false};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(openDialog()||battleViewState())return;if(activeDance()&&drag){if(Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>7)drag.moved=true;return;}if(drag&&drag.id===e.pointerId){const dx=e.clientX-drag.startX,dy=e.clientY-drag.startY;if(Math.hypot(dx,dy)>7)drag.moved=true;if(drag.moved){const r=canvas.getBoundingClientRect();camera.x=drag.camX-dx/r.width*world.width/camera.zoom;camera.y=drag.camY-dy/r.height*world.height/camera.zoom;clampCamera();canvas.classList.add('dragging');}}else{if(adventure){const hit=adventure.hit(toWorld(e.clientX,e.clientY));hover=hit==='player'?adventure.snapshot().id:-1;canvas.style.cursor=hit?'pointer':'grab';return;}const a=hitPet(toWorld(e.clientX,e.clientY));hover=a?a.id:-1;canvas.style.cursor=a?'pointer':'grab';}});
canvas.addEventListener('pointerup',e=>{if(openDialog()||battleViewState())return;if(!drag||drag.id!==e.pointerId)return;const moved=drag.moved;drag=null;canvas.classList.remove('dragging');if(moved)return;const point=toWorld(e.clientX,e.clientY);if(!point.inside)return;if(tapDance(point))return;if(adventureClick(point))return;const a=hitPet(point);if(a){selectPetActions(a.id);return;}
selectedActions=false;updateUI();
if(engine.goTo(point.x,point.y)){care.cancel(engine,engine.snapshot().selected);destination={x:point.x,y:point.y,until:engine.snapshot().time+2.5};updateUI();}});
const stopDrag=()=>{drag=null;canvas.classList.remove('dragging');};canvas.addEventListener('pointercancel',stopDrag);canvas.addEventListener('lostpointercapture',stopDrag);canvas.addEventListener('pointerleave',()=>{hover=-1;});canvas.addEventListener('wheel',e=>{e.preventDefault();if(openDialog()||activeDance()||battleViewState())return;setZoom(camera.zoom+(e.deltaY<0?.1:-.1));},{passive:false});
document.addEventListener('keydown',e=>{if(e.key==='Tab'){const modal=openDialog();if(modal){const buttons=Array.from(modal.querySelectorAll('button,[tabindex]')).filter(b=>!b.hidden&&!b.disabled);if(buttons.length){const index=buttons.indexOf(document.activeElement),next=e.shiftKey?(index<=0?buttons.length-1:index-1):(index+1)%buttons.length;e.preventDefault();buttons[next].focus();}return;}}if(e.key==='Escape'){if(mapPicker.open){e.preventDefault?.();mapPicker.close();return;}if(duelPicker.open){e.preventDefault?.();closeDuelPicker();return;}if(petCard.open){e.preventDefault?.();closePetCard();return;}if(battleViewState()){leaveBattle();return;}if(activeDance()){cancelDance();return;}if(adventure){restoreHome();return;}selectedActions=false;resetView();updateUI();}});
canvas.addEventListener('keydown',e=>{if(Boolean(openDialog()))return;if(battleViewState()&&(e.key===' '||e.key==='Enter')){e.preventDefault();if(combat.command('wave'))updateUI();return;}if(!e.repeat&&(e.key===' '||e.key==='Enter')&&activeDance()){e.preventDefault();const p=activeDance();care.tap(engine,p.id);updateUI();}});
$('dialogShade').onclick=()=>{const open=openDialog();if(open)open.close();};
window.addEventListener('beforeunload',save);document.addEventListener('visibilitychange',()=>{previous=0;save();});
function frame(timestamp){const dt=previous?Math.min(.05,(timestamp-previous)/1000):.016;previous=timestamp;if(!battleViewState()){if(adventure)adventure.update(dt);else engine.update(dt);}combat.update(dt);const combatState=combat.snapshot();if(combatState?.phase!==lastBattlePhase){lastBattlePhase=combatState?.phase;updateUI();battleReturnAt=window.ParkCombat.ended(lastBattlePhase)?timestamp+BATTLE_RETURN_DELAY_MS:null;if(battleReturnAt!==null)save();}
 if(battleReturnAt!==null&&timestamp>=battleReturnAt)leaveBattle();
 const careEvents=care.update(dt,engine);
 if(careEvents.length){for(const event of careEvents){engine.react(event.id,'joy');expressionChoices[event.id]='joy';}save();updateUI();}
 const snapshot=engine.snapshot();snapshot.care=care.snapshot();const game=activeDance(snapshot.care);danceAudio.update(game?.id,game?.game);const battle=battleViewState();if(battle)battlePainter.render(battle,engine.actors[battle.id],engine.actors[battle.opponentId]);else{const field=adventure?.snapshot();painter.render(field?{...snapshot,actors:snapshot.actors.filter(a=>a.id===field.id),encounters:field.monsters}:snapshot,camera,hover,destination);}uiElapsed+=dt;saveElapsed+=dt;if(uiElapsed>.35){updateUI(snapshot);uiElapsed=0;}if(saveElapsed>5){save();saveElapsed=0;}requestAnimationFrame(frame);}
const ready=Promise.all(petData.flatMap(p=>{
 const metadata=window.ParkWalkAssets.characters[p.key];
 const assets=[[p.key,p.image]];
 if(metadata.gait!=='hover')assets.push([p.key+'-walk',metadata.image]);
 if(metadata.actions)assets.push([p.key+'-actions',metadata.actions.image]);
 return assets;
}).concat([[window.ParkMap.background.key,window.ParkMap.background.image],['rhythm-atlas',window.ParkRhythmAssets.image],['monsters','assets/monsters/enemies-v23.png'],...window.ParkCombat.enemies.filter(e=>e.imageKey).map(e=>[e.imageKey,'assets/monsters/'+e.id+'-v30.png'])]).concat(Object.entries(window.ParkExpressionAssets.characters).map(([key,asset])=>[key+'-expressions',asset.image])).concat(window.ParkWorlds.scenes.map(s=>['scene-'+s.id,s.image,true])).concat([['arena',window.ParkWorlds.arena.image,true]]).concat(Object.entries(window.ParkCareProps).map(([key,asset])=>[key,asset.image])).map(([key,path,optional])=>new Promise(resolve=>{const im=new Image();images[key]=im;im.onload=resolve;im.onerror=()=>{if(!optional)assetErrors.push(path);resolve();};im.src=optional?path+'?v=35':path;})));
setZoom(1);updateUI();ready.then(()=>{battlePainter=window.ParkBattleScene.create(canvas,images);restoreHome(false);$('sceneLoading').hidden=true;requestAnimationFrame(frame);});
window.XiaoPPark={adventureStatus:()=>adventure?.snapshot()||null,battleStatus:()=>combat.snapshot(),battleViewStatus:()=>battleViewState(),mapStatus:()=>({mode:combat.snapshot()?'battle':adventure?'exploration':'plaza',scene:combat.snapshot()?'arena':currentScene.id,originScene:combat.snapshot()?.originScene||null,sourceReady:Boolean(combat.snapshot()?images.arena?.naturalWidth:images['scene-'+currentScene.id]?.naturalWidth),arenaReady:Boolean(images.arena?.naturalWidth),scenes:window.ParkWorlds.scenes.map(s=>({...s,ready:Boolean(images['scene-'+s.id]?.naturalWidth)})),id:combat.snapshot()?'arena':world.id,shape:world.bounds.type,width:world.width,height:world.height,movement:'paved-roads-only',background:combat.snapshot()?window.ParkWorlds.arena.image:window.ParkMap.background.image}),expressionStatus:()=>({choices:expressionChoices.slice(),selected:engine.snapshot().selected,emotions:Object.keys(emotes),assets:Object.keys(window.ParkExpressionAssets.characters)}),careStatus:()=>care.snapshot(),snapshot:()=>engine.snapshot(),assetStatus:()=>({loaded:Object.values(images).filter(im=>im.naturalWidth>0).length,errors:assetErrors.slice()}),view:()=>({...camera}),motionStatus:()=>({version:35,mode:'walk-cycles-and-xiaop-hover',transition:'single-pose-foot-plant-or-continuous-hover',characters:petData.map(p=>({key:p.key,frames:window.ParkWalkAssets.characters[p.key].frames,gait:window.ParkWalkAssets.characters[p.key].gait||'walk-cycle'})),activeFrames:engine.snapshot().actors.map(a=>({id:a.id,key:petData[a.species].key,frame:a.state!=='walking'&&a.poseMix>0?window.ParkMotion.settleFrameFor(a):window.ParkMotion.frameFor(a),settling:a.species!==5&&a.state!=='walking'&&a.poseMix>0,gait:a.species===5?'hover':'walk',lift:window.ParkMotion.liftFor(a),speed:a.motionSpeed}))})};
})();
