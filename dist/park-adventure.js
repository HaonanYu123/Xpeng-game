 'use strict';
(function(root){
 const placements={
  forest:{entry:[640,970],monsters:[[470,740],[760,780]]},
  snow:{entry:[690,870],monsters:[[460,720],[800,700]]},
  desert:{entry:[940,690],monsters:[[520,800],[690,710]]},
  lava:{entry:[440,680],monsters:[[650,820],[810,710]]}
 };
 function create({engine,care,combat,id,theme}){
  const actor=engine.actors[id],enemies=root.ParkCombat.enemies.filter(e=>e.theme===theme);if(!actor||!enemies.length)throw new Error('Invalid expedition');
  engine.select(id);engine.holdActor(id);
  const layout=placements[theme],start=root.ParkEngine.nearestWalkable(...layout.entry),spawn=root.ParkEngine.nearestWalkable(...layout.monsters[0]);
  if(!start||!spawn)throw new Error('No paved encounter location');
  Object.assign(actor,{x:start.x,y:start.y,state:'idle',poseMix:0});let time=0,target=null;const defeatedIds=new Set();
  const monsters=enemies.map((enemy,index)=>{const point=root.ParkEngine.nearestWalkable(...layout.monsters[index]);return{...enemy,x:point.x,y:point.y,height:148,width:150};});
  function snapshot(){const alive=monsters.filter(m=>!defeatedIds.has(m.id)).map(m=>({...m}));return{id,theme,time,target:target?{...target}:null,player:{...engine.actors[id],path:engine.actors[id].path.map(p=>({...p}))},monsters:alive,monster:alive[0]||null,defeated:!alive.length};}
  function hit(point){
   if(!point||point.inside===false)return null;
   for(const m of monsters)if(!defeatedIds.has(m.id)&&point.x>m.x-m.width/2&&point.x<m.x+m.width/2&&point.y>m.y-m.height&&point.y<m.y+12)return m.id;
   const a=engine.actors[id],bounds=root.ParkMotion.hitBounds(a,care.snapshot().pets[id]);
   if(point.x>bounds.left&&point.x<bounds.right&&point.y>bounds.top&&point.y<bounds.bottom)return'player';return null;
  }
  function stop(){target=null;return engine.holdActor(id);}
  function move(point){
   if(combat.snapshot()||care.snapshot().pets[id].job||!point||point.inside===false)return false;
   let destination={x:point.x,y:point.y};
   if(!engine.walkable(destination.x,destination.y)){
    if(!root.ParkMap.onRoad(point.x,point.y))return false;const snapped=root.ParkEngine.nearestWalkable(point.x,point.y);
    if(!snapped||Math.hypot(snapped.x-point.x,snapped.y-point.y)>32)return false;destination=snapped;
   }
   if(!engine.guideActor(id,destination.x,destination.y))return false;target=destination;return true;
  }
  function trigger(point){
   const targetId=hit(point),alive=monsters.filter(m=>!defeatedIds.has(m.id));if(!targetId||!alive.length)return{handled:false,ok:false};
   const enemyId=targetId==='player'?alive.slice().sort((a,b)=>Math.hypot(a.x-actor.x,a.y-actor.y)-Math.hypot(b.x-actor.x,b.y-actor.y))[0].id:targetId;
   if(care.snapshot().pets[id].job)return{handled:true,ok:false,reason:'busy'};
   stop();return{handled:true,...combat.start(id,theme,enemyId)};
  }
  function resolve(battle){if(battle?.mode!=='pve'||battle.id!==id||battle.originScene!==theme)return false;if(battle.phase==='victory')defeatedIds.add(battle.enemy.id);stop();return true;}
  function update(dt){
   if(!Number.isFinite(dt)||dt<=0)return;time+=Math.min(.05,dt);if(combat.snapshot())return;
   if(!care.snapshot().pets[id].job&&!actor.path.length&&actor.goalKind!=='care'){actor.goalKind='care';actor.vx=0;actor.vy=0;actor.arrived=true;}
   engine.update(dt);if(target&&!actor.path.length)target=null;
  }
  return{snapshot,hit,stop,move,trigger,resolve,update};
 }
 root.ParkAdventure={create,placements};if(typeof module==='object'&&module.exports)module.exports=root.ParkAdventure;
})(typeof window!=='undefined'?window:globalThis);
