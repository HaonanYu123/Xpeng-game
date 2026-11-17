'use strict';
(function(root){
const MAP=root.ParkMap||(typeof module==='object'&&module.exports?require('./park-map.js'):null);
const WORLD=MAP.world,OBSTACLES=MAP.obstacles,SPAWNS=MAP.spawns;
const EMOTES={
 joy:{name:'开心',icon:'⌣',color:'#d5b765',message:'笑弯了眼睛，开心地回应你。'},
 surprise:{name:'惊讶',icon:'!',color:'#83bec5',message:'睁圆了眼睛，发出一声好奇的惊叹。'},
 sad:{name:'委屈',icon:'◡',color:'#97b3d0',message:'垂下眼睛，有一点委屈，想要你的陪伴。'},
 angry:{name:'生气',icon:'⌁',color:'#d79b8b',message:'皱起眉头，鼓着脸哼了一声。'}
};
function roundedContains(x,y,b,pad=0){const xx=b.x+pad,yy=b.y+pad,w=b.w-pad*2,h=b.h-pad*2,r=Math.max(0,b.r-pad);if(x<xx||y<yy||x>xx+w||y>yy+h)return false;const cx=Math.max(xx+r,Math.min(xx+w-r,x)),cy=Math.max(yy+r,Math.min(yy+h-r,y));return Math.hypot(x-cx,y-cy)<=r;}
function walkable(x,y,pad=18){
 if(!Number.isFinite(x)||!Number.isFinite(y)||!MAP.onRoad(x,y,pad*.55))return false;
 const view=WORLD.viewport,halfWidth=75+pad,top=180+pad,bottom=12+pad;
 for(const xx of [x-halfWidth,x+halfWidth])for(const yy of [y-top,y+bottom])if(Math.hypot(xx-view.x,yy-view.y)>view.r)return false;
 return !OBSTACLES.some(o=>o.type==='ellipse'?((x-o.x)/(o.rx+pad))**2+((y-o.y)/(o.ry+pad))**2<1:roundedContains(x,y,{x:o.x-pad,y:o.y-pad,w:o.w+pad*2,h:o.h+pad*2,r:o.r+pad}));
}
function nearestWalkable(x,y,pad=18){
 let nearest=null,best=Infinity;
 for(const point of MAP.roadPoints){const d=(point.x-x)**2+(point.y-y)**2;if(d<best&&walkable(point.x,point.y,pad)){nearest=point;best=d;}}
 return nearest?{...nearest}:null;
}
// Check the whole segment, so a shortcut cannot cut through a facility.
function lineClear(from,to,pad=18){
 const length=Math.hypot(to.x-from.x,to.y-from.y),samples=Math.max(1,Math.ceil(length/3));
 for(let i=0;i<=samples;i++){
  const t=i/samples;
  if(!walkable(from.x+(to.x-from.x)*t,from.y+(to.y-from.y)*t,pad))return false;
 }
 return true;
}
function create(options={}){
 const soloId=Number.isInteger(options.soloId)&&options.soloId>=0&&options.soloId<6?options.soloId:null;
 let seed=options.seed||Math.floor(Math.random()*2147483646)+1;
 const random=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646;};
 const saved=options.saved&&options.saved.version===1?options.saved:null;
 let paused=false,speed=[.75,1,1.5].includes(saved?.speed)?saved.speed:1;
 let selected=Number.isInteger(saved?.selected)&&saved.selected>=0&&saved.selected<6?saved.selected:0;
 let time=0,elapsed=Number.isFinite(saved?.elapsed)?saved.elapsed:0,mode='roam';
 let emoteCount=Number.isFinite(saved?.emoteCount)?saved.emoteCount:0;
 const actors=SPAWNS.map((s,i)=>{
  const position=saved?.positions?.[i];
  const old=position&&(saved.mapId?position:{x:position.x*WORLD.width/1800,y:position.y*WORLD.height/1120});
  const valid=old&&Number.isFinite(old.x)&&Number.isFinite(old.y);
  const point=valid?(walkable(old.x,old.y)?old:nearestWalkable(old.x,old.y)):null;
  const spawn=walkable(s.x,s.y)?s:nearestWalkable(s.x,s.y);
  return{id:i,species:s.species,name:s.name,x:point?point.x:spawn.x,y:point?point.y:spawn.y,
   facing:i%2?-1:1,turnIntent:0,turnTime:0,state:'idle',idle:.2+i*.23,path:[],
   hoverLift:s.species===5?12:0,walked:0,walkStart:0,vx:0,vy:0,motionSpeed:0,poseMix:0,baseSpeed:[72,49,91,54,76,66][s.species],
   expression:Object.keys(EMOTES).includes(saved?.expressions?.[i])?saved.expressions[i]:null,emote:null,emoteUntil:0,goalKind:'roam',stuck:0,arrived:false};
 });
 const CELL=12,COLS=Math.ceil(WORLD.width/CELL),ROWS=Math.ceil(WORLD.height/CELL),grid=[];
 for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)grid[y*COLS+x]=walkable(x*CELL+CELL/2,y*CELL+CELL/2);
 function nearestCell(x,y){
  const gx=Math.floor(x/CELL),gy=Math.floor(y/CELL),candidates=[];
  for(let yy=Math.max(0,gy-4);yy<=Math.min(ROWS-1,gy+4);yy++){
   for(let xx=Math.max(0,gx-4);xx<=Math.min(COLS-1,gx+4);xx++){
    if(grid[yy*COLS+xx])candidates.push({xx,yy,x:xx*CELL+CELL/2,y:yy*CELL+CELL/2});
   }
  }
  candidates.sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y));
  const cell=candidates.find(c=>lineClear({x,y},c));
  return cell?[cell.xx,cell.yy]:null;
 }
 function smoothPath(origin,raw){
  const path=[];let from=origin,index=0;
  while(index<raw.length){
   let next=raw.length-1;
   while(next>index&&!lineClear(from,raw[next],22))next--;
   path.push(raw[next]);from=raw[next];index=next+1;
  }
  return path;
 }
 function findPath(actor,x,y){
  if(!walkable(x,y))return null;
  if(lineClear(actor,{x,y},22))return[{x,y}];
  const start=nearestCell(actor.x,actor.y),end=nearestCell(x,y);
  if(!start||!end)return null;
  const a=start[1]*COLS+start[0],b=end[1]*COLS+end[0],queue=[a];
  const prev=new Int32Array(COLS*ROWS).fill(-2);prev[a]=-1;
  for(let i=0;i<queue.length;i++){
   const n=queue[i];if(n===b)break;
   const xx=n%COLS,yy=Math.floor(n/COLS);
   for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){
    const nx=xx+dx,ny=yy+dy,nn=ny*COLS+nx;
    if(nx>=0&&ny>=0&&nx<COLS&&ny<ROWS&&grid[nn]&&prev[nn]===-2&&
      lineClear({x:xx*CELL+CELL/2,y:yy*CELL+CELL/2},{x:nx*CELL+CELL/2,y:ny*CELL+CELL/2})){
     prev[nn]=n;queue.push(nn);
    }
   }
  }
  if(prev[b]===-2)return null;
  const raw=[];let n=b;
  while(n>=0){raw.unshift({x:n%COLS*CELL+CELL/2,y:Math.floor(n/COLS)*CELL+CELL/2});n=prev[n];}
  raw.push({x,y});return smoothPath(actor,raw);
 }
 function setGoal(actor,x,y,kind='roam'){
  const path=findPath(actor,x,y);if(!path)return false;
  actor.emote=null;actor.path=path;actor.idle=0;actor.goalKind=kind;actor.arrived=false;actor.stuck=0;
  return true;
 }
 function randomGoal(actor){
  // Regularly explore the paved fountain/garden loops as well as the large central plaza.
  if(random()<.6)for(let i=0;i<16;i++){
   const point=MAP.promenadePoints[Math.floor(random()*MAP.promenadePoints.length)];
   if(point&&Math.hypot(point.x-actor.x,point.y-actor.y)>120&&walkable(point.x,point.y)&&setGoal(actor,point.x,point.y))return true;
  }
  for(let i=0;i<30;i++){
   const angle=random()*Math.PI*2,dist=150+random()*430;
   const x=actor.x+Math.cos(angle)*dist,y=actor.y+Math.sin(angle)*dist;
   if(walkable(x,y)&&setGoal(actor,x,y))return true;
  }
  actor.idle=.8;return false;
 }
 function select(id){if(Number.isInteger(id)&&id>=0&&id<actors.length)selected=id;return actors[selected];}
 function goTo(x,y){return walkable(x,y)&&setGoal(actors[selected],x,y,'point');}
 function regroup(){
  mode='gather';actors.forEach((a,i)=>{
   const angle=i*Math.PI/3;setGoal(a,MAP.gather.x+Math.cos(angle)*MAP.gather.rx,MAP.gather.y+Math.sin(angle)*MAP.gather.ry,'gather');
  });
 }
 function releaseAll(){mode='roam';actors.forEach(a=>{a.arrived=false;randomGoal(a);});}
 function careSpot(id){
  const actor=actors[id];if(!actor)return null;
  const zone=MAP.careZone,dx=actor.x-zone.x,dy=actor.y-zone.y,distance=Math.hypot(dx,dy);
  if(distance<=zone.r)return{x:actor.x,y:actor.y};
  for(let radius=zone.r-3;radius>=0;radius=Math.max(0,radius-24)){
   const target={x:zone.x+dx/distance*radius,y:zone.y+dy/distance*radius};
   if(walkable(target.x,target.y,28)&&findPath(actor,target.x,target.y))return target;
   if(radius===0)break;
  }
  return null;
 }
 function holdActor(id){
  const actor=actors[id];if(!actor)return false;
  actor.emote=null;actor.path=[];actor.vx=0;actor.vy=0;actor.goalKind='care';actor.arrived=false;
  return true;
 }
 function guideActor(id,x,y){
  return !!actors[id]&&setGoal(actors[id],x,y,'care');
 }
 function resumeActor(id){
  const actor=actors[id];if(!actor||actor.goalKind!=='care')return false;
  actor.path=[];actor.vx=0;actor.vy=0;actor.goalKind='roam';actor.arrived=false;actor.idle=.7;
  return true;
 }
 function react(actorId,id){
  if(!Object.keys(EMOTES).includes(id))return false;
  const a=actors[actorId];if(!a||a.goalKind==='care')return false;
  a.emote=id;a.emoteStarted=time;a.emoteUntil=time+3.2;a.vx=0;a.vy=0;a.state='playing';return true;
 }
 function emote(id){if(!react(selected,id))return false;emoteCount++;return true;}
 function setExpression(id){if(!emote(id))return false;actors[selected].expression=id;return true;}

 function arrive(a){
  a.path=[];a.vx=0;a.vy=0;a.idle=1.2+random()*3.5;a.arrived=true;
  if(a.goalKind!=='gather'&&a.goalKind!=='care')a.goalKind='roam';
 }
 function updatePose(a,delta,mx=0,my=0){
  const distance=Math.hypot(mx,my);a.motionSpeed=distance/delta;
  const moving=distance>.0001;
  if(moving&&a.state!=='walking')a.walkStart=a.walked-distance;
  a.state=moving?'walking':a.emote?'playing':'idle';
  const target=moving?1:0,rate=moving?8:6;
  a.poseMix+=Math.max(-rate*delta,Math.min(rate*delta,target-a.poseMix));
  // Tiny sideways corrections on a near-vertical route must not flip the artwork.
  const horizontal=moving?mx/distance:0,intent=Math.abs(horizontal)>.28?Math.sign(horizontal):0;
  if(intent&&intent!==a.facing){
   if(a.turnIntent===intent)a.turnTime+=delta;else{a.turnIntent=intent;a.turnTime=delta;}
   if(a.turnTime>=.12){a.facing=intent;a.turnTime=0;a.turnIntent=0;}
  }else{a.turnIntent=0;a.turnTime=0;}
 }
 function update(dt){
  dt=Math.min(.05,Math.max(0,Number.isFinite(dt)?dt:0));if(paused||!dt)return;
  const delta=dt*speed;time+=delta;elapsed+=delta;
  for(const a of actors){
   if(soloId!==null&&a.id!==soloId)continue;
   // Ground coordinates remain the navigation/shadow projection. The whole robot floats above it.
   if(a.species===5)a.hoverLift=12+Math.sin(time*2.2)*2;
   if(a.emote&&time>=a.emoteUntil)a.emote=null;
   // A facial reaction holds the pose briefly, preserving the route for a natural restart.
   if(a.emote){a.vx=0;a.vy=0;updatePose(a,delta);continue;}
   if(!a.path.length){
    a.vx=0;a.vy=0;updatePose(a,delta);
    if(a.goalKind==='care'||a.goalKind==='gather'&&a.arrived)continue;
    a.idle-=delta;if(a.idle<=0)randomGoal(a);continue;
   }
   // Look ahead whenever a safe direct segment opens up around a corner.
   while(a.path.length>1&&lineClear(a,a.path[1],24))a.path.shift();
   let target=a.path[0],dx=target.x-a.x,dy=target.y-a.y,d=Math.hypot(dx,dy);
   if(d<1.2){
    a.path.shift();
    if(!a.path.length){arrive(a);updatePose(a,delta);continue;}
    target=a.path[0];dx=target.x-a.x;dy=target.y-a.y;d=Math.hypot(dx,dy);
   }
   const final=a.path.length===1,maxSpeed=a.baseSpeed;
   // Braking uses remaining distance; intermediate waypoints keep their momentum.
   const desiredSpeed=final?Math.min(maxSpeed,Math.sqrt(2*150*Math.max(0,d-.5))):maxSpeed;
   let ux=dx/(d||1),uy=dy/(d||1);
   for(const b of actors){
    if(a===b||soloId!==null&&b.id!==soloId)continue;
    const bx=a.x-b.x,by=a.y-b.y,dist=Math.hypot(bx,by);
    if(dist>0&&dist<65){
     const fade=final?Math.min(1,d/45):1,f=(65-dist)/65*.8*fade;
     ux+=bx/dist*f;uy+=by/dist*f;
    }
   }
   const look=Math.min(d,Math.max(14,desiredSpeed*.3)),steerLength=Math.hypot(ux,uy)||1;
   if(!lineClear(a,{x:a.x+ux/steerLength*look,y:a.y+uy/steerLength*look})){ux=dx/(d||1);uy=dy/(d||1);}
   const norm=Math.hypot(ux,uy)||1,wantX=ux/norm*desiredSpeed,wantY=uy/norm*desiredSpeed;
   const dvx=wantX-a.vx,dvy=wantY-a.vy,dv=Math.hypot(dvx,dvy),limit=260*delta;
   const change=dv?Math.min(1,limit/dv):0;a.vx+=dvx*change;a.vy+=dvy*change;
   let sx=a.vx*delta,sy=a.vy*delta;
   // Cap to the remaining distance, including redirected commands at close range.
   const step=Math.hypot(sx,sy);if(step>d){sx*=d/step;sy*=d/step;}
   let mx=0,my=0;
   if(lineClear(a,{x:a.x+sx,y:a.y+sy})){mx=sx;my=sy;}
   else if(lineClear(a,{x:a.x+sx,y:a.y})){mx=sx;a.vy=0;}
   else if(lineClear(a,{x:a.x,y:a.y+sy})){my=sy;a.vx=0;}
   else{a.vx=0;a.vy=0;}
   const moved=Math.hypot(mx,my);
   if(moved>.0001){a.x+=mx;a.y+=my;a.walked+=moved;a.stuck=0;}else a.stuck+=delta;
   updatePose(a,delta,mx,my);
   if(a.stuck>1.2){
    const end=a.path[a.path.length-1],kind=a.goalKind;a.path=[];
    if(end&&kind!=='roam')setGoal(a,end.x,end.y,kind);else randomGoal(a);
    a.stuck=0;
   }
  }
 }
 function snapshot(){return{world:WORLD,paused,speed,selected,mode,time,elapsed,emoteCount,actors:actors.map(a=>({...a,path:a.path.map(p=>({...p}))}))};}
 function serialize(){return{version:1,mapId:WORLD.id,speed,selected,elapsed,emoteCount,expressions:actors.map(a=>a.expression),positions:actors.map(a=>({x:Math.round(a.x*100)/100,y:Math.round(a.y*100)/100}))};}
 return{actors,world:WORLD,obstacles:OBSTACLES,update,select,goTo,regroup,releaseAll,emote,setExpression,react,walkable,findPath,snapshot,serialize,
  holdActor,guideActor,resumeActor,careSpot,restSpot:id=>walkable(MAP.restSpots[id].x,MAP.restSpots[id].y)?({...MAP.restSpots[id]}):nearestWalkable(MAP.restSpots[id].x,MAP.restSpots[id].y),
  setPaused(value){paused=!!value;return paused;},
  setSpeed(value){if([.75,1,1.5].includes(value))speed=value;return speed;}};
}
root.ParkEngine={create,world:WORLD,obstacles:OBSTACLES,spawns:SPAWNS,emotes:EMOTES,walkable,lineClear,nearestWalkable,onRoad:MAP.onRoad};
if(typeof module==='object'&&module.exports)module.exports=root.ParkEngine;
})(typeof window!=='undefined'?window:globalThis);
