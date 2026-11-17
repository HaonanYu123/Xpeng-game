'use strict';
(function(root){
 const keys=root.PetDesign.pets.map(p=>p.key);
 function stateFor(record){return record?.game||null;}
 function poseFor(actor,record){
  const game=stateFor(record),pose=game&&record.job.stage==='doing'?game.pose:!record?.job&&actor.state!=='walking'&&!actor.path?.length?record?.danceReaction?.pose:null;
  const atlas=root.ParkRhythmAssets,data=atlas?.characters[keys[actor.species]];if(!pose||!data)return null;
  const frame=data.poses[pose],info=atlas.frameData[frame];
  return{key:'rhythm-atlas',kind:'dance',emotion:pose,frame,flip:(actor.facing<0?-1:1)*(data.facing||-1),metadata:{...atlas,contentHeight:data.contentHeight,anchorX:info.anchorX??atlas.frameWidth/2,anchorY:info.bounds[3],bounds:info.bounds}};
 }
 function motionFor(actor,record,time){
  const game=stateFor(record),t=game?.elapsed??time,r=root.ParkCare.danceRules;
  const active=game?.phase==='dancing'||game?.phase==='finale',move=game?.move||0;
  const phase=Math.max(0,t-r.leadIn)/r.interval,sway=Math.sin(phase*Math.PI*2),bounce=Math.sin(phase*Math.PI)**2;
  const boost=game?.flourishAge>=0&&game.flourishAge<.7?1.4:1,amp=active?([.85,1,1.15][move])*boost:.25;
  const styles=[{x:0,y:-3.2*bounce,rotation:.045*sway,sx:1+.02*bounce,sy:1-.035*bounce},{x:0,y:-5*bounce,rotation:.035*sway,sx:1+.035*bounce,sy:1-.05*bounce},{x:3*sway,y:-4*bounce,rotation:.055*sway,sx:1+.015*bounce,sy:1-.035*bounce},{x:1.4*sway,y:-1.5*bounce,rotation:.045*sway,sx:1+.02*bounce,sy:1-.03*bounce},{x:0,y:0,rotation:.012*sway,sx:1+.022*bounce,sy:1-.022*bounce},{x:3*sway,y:Math.sin(phase*Math.PI)*6,rotation:.075*sway,sx:1+.018*bounce,sy:1-.018*bounce}];
  const s=styles[actor.species];return{x:s.x*amp,y:s.y*amp,rotation:s.rotation*amp,scaleX:1+(s.sx-1)*amp,scaleY:1+(s.sy-1)*amp};
 }
 function centerFor(actor){return{x:actor.x,y:actor.y-root.ParkMotion.liftFor(actor)-root.ParkMotion.heights[actor.species]*.5};}
 function contains(actor,point){const c=centerFor(actor);return Math.hypot(point.x-c.x,point.y-c.y)<=96;}
 function draw(ctx,actor,record){
  const game=stateFor(record);if(!game||record.job.stage!=='doing'||game.phase==='ready')return;
  const c=centerFor(actor);ctx.save();
  for(let i=0;i<4;i++){
   const p=(game.elapsed*.45+i*.25)%1,x=c.x+(i%2?1:-1)*(61+Math.sin(game.elapsed*2+i)*9),y=c.y+35-p*94;
   ctx.globalAlpha=Math.sin(p*Math.PI)*.75;ctx.strokeStyle=i%2?'#dfb269':'#dba0a5';ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=2.4;ctx.beginPath();ctx.ellipse(x,y,4.5,3,-.3,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(x+3.5,y);ctx.lineTo(x+3.5,y-17);ctx.lineTo(x+11,y-13);ctx.stroke();
  }
  if(game.phase==='finale'||game.flourishAge<.7){
   ctx.globalAlpha=.8;for(let i=0;i<5;i++){const a=i*Math.PI*2/5+game.elapsed*.4,x=c.x+Math.cos(a)*92,y=c.y+Math.sin(a)*78;ctx.fillStyle=i%2?'#ffd788':'#e6b56d';ctx.beginPath();ctx.moveTo(x,y-5);ctx.lineTo(x+3,y-1);ctx.lineTo(x+6,y);ctx.lineTo(x+3,y+2);ctx.lineTo(x,y+5);ctx.lineTo(x-3,y+2);ctx.lineTo(x-6,y);ctx.lineTo(x-3,y-1);ctx.closePath();ctx.fill();}
  }ctx.restore();
 }
 function createAudio(){
  let context=null,last=-1,pet=-1,elapsed=-1;const melody=[523.25,659.25,783.99,659.25,587.33,698.46,880,698.46];
  function unlock(){try{const C=root.AudioContext||root.webkitAudioContext;if(C&&!context)context=new C();context?.resume?.().catch(()=>{});}catch(e){}}
  function update(id,game){
   if(!game||game.phase==='going'){last=-1;pet=-1;elapsed=-1;return;}if(id!==pet||game.elapsed<elapsed){last=-1;pet=id;}elapsed=game.elapsed;
   const r=root.ParkCare.danceRules,index=Math.floor((game.elapsed-r.leadIn)/(r.interval/2));if(index<0||index<=last)return;last=index;
   if(!context||context.state!=='running')return;
   try{const o=context.createOscillator(),g=context.createGain(),t=context.currentTime;o.type='sine';o.frequency.value=game.phase==='finale'?melody[index%2?0:2]:melody[index%melody.length];g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.026,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+.19);o.connect(g);g.connect(context.destination);o.start(t);o.stop(t+.2);}catch(e){}
  }return{unlock,update};
 }
 root.ParkDance={stateFor,poseFor,motionFor,centerFor,contains,draw,createAudio};
})(typeof window!=='undefined'?window:globalThis);
