'use strict';
(function(root){
 const enemies=[
  {id:'moss',name:'苔帽菇菇',theme:'forest',frame:0,hp:78,attack:10,armor:2,xp:18,tint:'#a7b970'},
  {id:'frost',name:'冰晶团团',theme:'snow',frame:1,hp:86,attack:11,armor:3,xp:20,tint:'#a4dce8'},
  {id:'scarab',name:'砂壳滚滚',theme:'desert',frame:2,hp:96,attack:12,armor:4,xp:22,tint:'#e5ba76'},
  {id:'ember',name:'熔石咚咚',theme:'lava',frame:3,hp:104,attack:14,armor:3,xp:24,tint:'#ef9e61'},
  {id:'sprout',name:'橡果刺刺',theme:'forest',imageKey:'monster-sprout',frame:0,columns:1,hp:84,attack:11,armor:3,xp:20,tint:'#9ed96c'},
  {id:'puffin',name:'雪羽冰冰',theme:'snow',imageKey:'monster-puffin',frame:0,columns:1,hp:90,attack:12,armor:3,xp:22,tint:'#81d9f7'},
  {id:'gecko',name:'沙尾点点',theme:'desert',imageKey:'monster-gecko',frame:0,columns:1,hp:94,attack:13,armor:3,xp:24,tint:'#ffce80'},
  {id:'flame',name:'火尾绒绒',theme:'lava',imageKey:'monster-flame',frame:0,columns:1,hp:102,attack:14,armor:4,xp:26,tint:'#ff9873'}
 ];
 const names=['蓝翎啾啾','云绵朵朵','绒耳跳跳','暖围抱抱','毛衣汪汪','小P'];
 const skills=['蓝翎光波','云绵光波','绒耳光波','暖阳光波','元气光波','星光光波'];
 const colors=['#6eabff','#a5ead8','#d6a3ed','#ffd16d','#a0d6e9','#74f2f2'];
 const rules={duration:60,sliderPeriod:2.4,zoneStart:.4,zoneEnd:.6,waveDuration:1.12,impactPoint:.64};
 const levels=Object.freeze([
  {level:1,maxHp:126,attack:26,armor:2,wavePower:43},
  {level:2,maxHp:140,attack:29,armor:3,wavePower:48},
  {level:3,maxHp:154,attack:32,armor:3,wavePower:53},
  {level:4,maxHp:168,attack:35,armor:4,wavePower:58},
  {level:5,maxHp:182,attack:38,armor:4,wavePower:63},
  {level:6,maxHp:196,attack:41,armor:5,wavePower:68},
  {level:7,maxHp:210,attack:44,armor:5,wavePower:73},
  {level:8,maxHp:224,attack:47,armor:6,wavePower:78},
  {level:9,maxHp:238,attack:50,armor:6,wavePower:83},
  {level:10,maxHp:252,attack:53,armor:7,wavePower:87}
 ].map(Object.freeze));
 function fighter(level){const row=levels[Math.max(1,Math.min(10,Math.floor(Number(level)||1)))-1];return{...row,hp:row.maxHp};}
 function damageFor(attacker,defender,multiplier=1){
  const power=Number.isFinite(attacker.wavePower)?attacker.wavePower:Math.round(attacker.attack*1.65);
  const base=Math.max(2,power-defender.armor);
  return{base,damage:Math.max(1,Math.round(base*multiplier))};
 }
 const ended=phase=>['victory','defeat','draw'].includes(phase);
 function create({care,random=Math.random}){
  let state=null,time=0,sequence=0;
  function initial(fields){state={...fields,phase:'player',activeSide:'hero',round:1,animation:null,elapsed:0,pending:0,reward:null,rewards:[],winnerId:null,sequence:++sequence,remaining:rules.duration,sliderTime:0,slider:{position:0,locked:false,multiplier:null},finishedReason:null};}
  function chosenEnemy(theme,enemyId){return enemies.find(e=>e.theme===theme&&e.id===enemyId)||enemies.find(e=>e.theme===theme)||enemies[0];}
  function start(id,theme='forest',enemyId){
   if(state)return{ok:false,reason:'busy'};
   const chosen=chosenEnemy(theme,enemyId),allowed=care.beginBattle(id);if(!allowed.ok)return allowed;
   const level=allowed.level,maxEnemy=chosen.hp+level*10;
   initial({mode:'pve',mapId:'arena',originScene:chosen.theme,id,opponentId:null,theme:chosen.theme,ticket:allowed.ticket,level,enemyLevel:level,enemy:{...chosen},hero:fighter(level),foe:{hp:maxEnemy,maxHp:maxEnemy,attack:chosen.attack+level*2,armor:chosen.armor+Math.floor(level/2)}});
   return{ok:true};
  }
  function inspect(id,theme='forest',enemyId){
   const pet=care.snapshot().pets[id];if(!pet)return null;const chosen=chosenEnemy(theme,enemyId),level=pet.growth.level,maxEnemy=chosen.hp+level*10;
   return{mode:'pve',mapId:'arena',originScene:chosen.theme,id,opponentId:null,theme:chosen.theme,level,enemyLevel:level,enemy:{...chosen},hero:fighter(level),foe:{hp:maxEnemy,maxHp:maxEnemy},phase:'preview',activeSide:'hero',activeId:id,animation:null,elapsed:0,time:0,winnerId:null,reward:null,skillName:skills[id],eligibility:care.battleAvailable(id),needs:{...pet.needs},remaining:60,slider:{position:0,locked:false}};
  }
  function startDuel(id,opponentId){
   if(state)return{ok:false,reason:'busy'};const allowed=care.beginDuel(id,opponentId);if(!allowed.ok)return allowed;
   initial({mode:'pvp',mapId:'arena',id,opponentId,theme:'arena',ticket:allowed.first.ticket,opponentTicket:allowed.second.ticket,level:allowed.first.level,enemyLevel:allowed.second.level,enemy:{id:'pet-'+opponentId,name:names[opponentId],petId:opponentId,xp:18},hero:fighter(allowed.first.level),foe:fighter(allowed.second.level)});
   return{ok:true};
  }
  function settle(heroWon,reason='hp'){
   const draw=heroWon===null,first=care.settleBattle(state.id,state.ticket,heroWon===true,state.enemy.xp);state.rewards=[{id:state.id,...first}];
   if(state.mode==='pvp'){const second=care.settleBattle(state.opponentId,state.opponentTicket,!draw&&!heroWon,state.enemy.xp);state.rewards.push({id:state.opponentId,...second});}
   state.winnerId=draw?null:heroWon?state.id:state.mode==='pvp'?state.opponentId:null;
   state.reward=state.rewards.find(r=>r.id===state.winnerId)||first;
   state.phase=draw?'draw':heroWon?'victory':'defeat';state.animation=null;state.elapsed=0;state.finishedReason=reason;state.slider.locked=true;
  }
  function attack(side,multiplier){
   const attacker=state[side],defender=state[side==='hero'?'foe':'hero'];
   const {base,damage}=damageFor(attacker,defender,multiplier);
   state.pending=damage;state.phase=side==='hero'?'hero':'enemy';state.elapsed=0;
   state.animation={side:side==='hero'?'hero':'enemy',kind:'wave',multiplier,baseDamage:base,damage:state.pending,hit:false};
  }
  function command(action='wave'){
   if(!state||state.phase!=='player'||action!=='wave')return false;
   const position=state.slider.position,multiplier=position>=rules.zoneStart-1e-9&&position<=rules.zoneEnd+1e-9?1:.5;
   state.slider={position,locked:true,multiplier};attack(state.activeSide,multiplier);return true;
  }
  function nextTurn(side){
   state.activeSide=side;state.phase='player';state.animation=null;state.elapsed=0;
   state.sliderTime=0;state.slider={position:0,locked:false,multiplier:null};if(side==='hero')state.round++;
  }
  function update(dt){
   if(!state||!Number.isFinite(dt)||dt<=0||ended(state.phase))return;
   const d=Math.min(.05,dt);time+=d;state.elapsed+=d;state.remaining=Math.max(0,state.remaining-d);
   if(state.phase==='player'){
    state.sliderTime+=d;const progress=state.sliderTime/rules.sliderPeriod%1;state.slider.position=progress<.5?progress*2:(1-progress)*2;
   }else{
    const heroActed=state.phase==='hero',target=heroActed?state.foe:state.hero;
    if(!state.animation.hit&&state.elapsed>=rules.waveDuration*rules.impactPoint){target.hp=Math.max(0,target.hp-state.pending);state.animation.hit=true;}
    if(state.elapsed>=rules.waveDuration){
     if(!target.hp){settle(heroActed);return;}
     if(state.mode==='pvp')nextTurn(heroActed?'foe':'hero');
     else if(heroActed)attack('foe',random()<.55?1:.5);else nextTurn('hero');
    }
   }
   if(!state.remaining){const diff=state.hero.hp/state.hero.maxHp-state.foe.hp/state.foe.maxHp;settle(Math.abs(diff)<1e-9?null:diff>0,'timeout');}
  }
  function leave(){
   if(!state)return false;if(!ended(state.phase)){care.settleBattle(state.id,state.ticket,false,0);if(state.mode==='pvp')care.settleBattle(state.opponentId,state.opponentTicket,false,0);}state=null;return true;
  }
  function snapshot(){if(!state)return null;const activeId=state.activeSide==='hero'?state.id:state.opponentId;return JSON.parse(JSON.stringify({...state,time,activeId,skillName:skills[activeId],waveColor:colors[activeId],heroColor:colors[state.id],foeColor:state.mode==='pvp'?colors[state.opponentId]:state.enemy.tint}));}
  return{start,startDuel,inspect,command,update,leave,snapshot};
 }
 root.ParkCombat={create,enemies,skills,colors,rules,levels,fighter,damageFor,ended};if(typeof module==='object'&&module.exports)module.exports=root.ParkCombat;
})(typeof window!=='undefined'?window:globalThis);
