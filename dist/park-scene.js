'use strict';
(function(root){
function create(canvas,images){
 const map=root.ParkMap,W=map.world.width,H=map.world.height,c=canvas.getContext('2d');canvas.width=W;canvas.height=H;
 const ground=document.createElement('canvas');ground.width=W;ground.height=H;const g=ground.getContext('2d'),background=images[map.background.key];
 const el=(q,x,y,rx,ry,fill,stroke)=>{q.beginPath();q.ellipse(x,y,rx,ry,0,0,Math.PI*2);if(fill){q.fillStyle=fill;q.fill();}if(stroke){q.strokeStyle=stroke;q.lineWidth=2;q.stroke();}};
 function star(q,x,y,r,fill,rotation=0){q.beginPath();for(let i=0;i<10;i++){const a=rotation-Math.PI/2+i*Math.PI/5,size=i%2?r*.46:r,xx=x+Math.cos(a)*size,yy=y+Math.sin(a)*size;if(i)q.lineTo(xx,yy);else q.moveTo(xx,yy);}q.closePath();q.fillStyle=fill;q.fill();}
 function cloud(q,x,y,size,fill){el(q,x-size*.29,y,size*.46,size*.28,fill);el(q,x+size*.2,y,size*.48,size*.3,fill);el(q,x-size*.03,y-size*.2,size*.32,size*.33,fill);}
 g.save();g.beginPath();g.arc(W/2,H/2,W/2-2,0,Math.PI*2);g.clip();
 if(background?.naturalWidth)g.drawImage(background,0,0,W,H);else{g.fillStyle='#c8dfa2';g.fillRect(0,0,W,H);}g.restore();
 // Repaint the same map pixels above pets behind a facility. The source artwork remains unchanged.
 const facilities=[];
 function foreground(depth,box,outline){
  if(!background?.naturalWidth)return;
  const [x,y,w,h]=box,layer=document.createElement('canvas');layer.width=w;layer.height=h;const q=layer.getContext('2d');
  q.translate(-x,-y);q.beginPath();outline(q);q.clip();q.drawImage(background,0,0,W,H);
  facilities.push({depth,paint:ctx=>ctx.drawImage(layer,x,y)});
 }
 if(map.world.id==='round-road-garden-v2'){
 foreground(343,[505,150,270,200],q=>{q.ellipse(640,282,121,54,0,0,Math.PI*2);q.rect(555,200,170,84);q.ellipse(640,190,62,35,0,0,Math.PI*2);});
 foreground(439,[827,170,280,278],q=>{q.moveTo(850,325);q.bezierCurveTo(850,255,934,210,992,212);q.lineTo(992,190);q.lineTo(1021,192);q.lineTo(1019,224);q.bezierCurveTo(1097,253,1090,313,1079,344);q.lineTo(1079,408);q.lineTo(1045,433);q.lineTo(852,419);q.closePath();});
 foreground(696,[60,482,273,226],q=>{q.moveTo(69,666);q.lineTo(75,594);q.lineTo(116,573);q.lineTo(147,516);q.lineTo(146,496);q.lineTo(204,478);q.lineTo(255,502);q.lineTo(270,555);q.lineTo(316,561);q.lineTo(325,607);q.lineTo(290,633);q.lineTo(289,679);q.lineTo(236,700);q.lineTo(180,646);q.lineTo(122,682);q.closePath();});
 foreground(983,[380,843,239,145],q=>{q.moveTo(390,932);q.bezierCurveTo(421,881,465,858,478,854);q.bezierCurveTo(540,874,589,895,611,932);q.lineTo(591,953);q.lineTo(517,954);q.lineTo(517,982);q.lineTo(500,982);q.lineTo(500,954);q.lineTo(405,953);q.closePath();});
 foreground(1042,[441,964,180,88],q=>{q.moveTo(447,990);q.lineTo(561,966);q.lineTo(610,987);q.lineTo(607,1024);q.lineTo(583,1035);q.lineTo(476,1040);q.lineTo(453,1025);q.closePath();});
 for(const lamp of map.obstacles.filter(o=>o.id.startsWith('lamp-'))){
  foreground(lamp.y+2,[lamp.x-25,lamp.y-68,50,77],q=>{q.ellipse(lamp.x,lamp.y-45,18,23,0,0,Math.PI*2);q.roundRect(lamp.x-17,lamp.y-30,34,36,9);});
 }
 }
 function pet(q,a,snapshot,hover){const selected=a.id===snapshot.selected,p=root.ParkMotion.characters[a.species],time=snapshot.time;
 const height=root.ParkMotion.heights[a.species],bob=root.ParkMotion.liftFor(a);
 el(q,a.x+9,a.y+7,a.species===5?33-(bob-12)*.25:a.species===4?55:34+a.species*2,11,'#3e6d4e20');el(q,a.x,a.y+4,a.species===4?40:22+a.species*2,6,'#315a4220');if(selected||hover===a.id){q.save();q.strokeStyle=selected?'#83a66a':'#afc198';q.lineWidth=3;q.setLineDash(selected?[5,6]:[]);q.beginPath();q.ellipse(a.x,a.y+3,42,15,0,0,Math.PI*2);q.stroke();q.restore();}
 if(!root.ParkMotion.draw(q,a,images,snapshot))cloud(q,a.x,a.y-45,40,p.color);
 if(root.ParkCareArt&&snapshot.care)root.ParkCareArt.draw(q,a,snapshot.care.pets[a.id],time,images);
 if(a.emote){
  const e=root.ParkEngine.emotes[a.emote];q.save();q.fillStyle=e.color;q.strokeStyle=e.color;q.textAlign='center';q.lineWidth=2;
  const headY=a.y-bob-height;
  for(let i=0;i<3;i++){
   const phase=(time*.8+i*.33)%1,px=a.x-45+i*45,py=headY+30-phase*45;q.globalAlpha=Math.sin(phase*Math.PI)*.8;
   if(a.emote==='joy')star(q,px,py,7,e.color,time*.2);
   if(a.emote==='surprise'){q.font='bold 23px sans-serif';q.fillText('!',px,py);}
   if(a.emote==='sad'){q.beginPath();q.moveTo(px,py);q.quadraticCurveTo(px-8,py+12,px,py+14);q.quadraticCurveTo(px+8,py+12,px,py);q.fill();}
   if(a.emote==='angry'){q.beginPath();q.arc(px,py,6,0,Math.PI*1.5);q.stroke();}
  }q.restore();
 }
 }
 function monster(q,m,time){
  const image=images[m.imageKey||'monsters'];if(!image?.naturalWidth)return;
  const fw=image.naturalWidth/(m.columns||4),box=m.imageKey?root.ParkExtraMonsterBounds[m.id]:root.ParkMonsterBounds[m.frame],height=m.height||148,width=height*box.w/box.h;
  el(q,m.x,m.y+5,width*.3,9,'#69533b22');const bob=0;
  q.drawImage(image,m.frame*fw+box.x,box.y,box.w,box.h,m.x-width/2,m.y-height+bob,width,height);
 }
 function render(snapshot,camera,hover=-1,destination=null){
  c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,W,H);c.save();c.beginPath();c.arc(W/2,H/2,W/2-2,0,Math.PI*2);c.clip();
  const z=camera.zoom;c.setTransform(z,0,0,z,W/2-camera.x*z,H/2-camera.y*z);c.drawImage(ground,0,0);
  const layers=[...facilities,...(snapshot.encounters||[]).map(m=>({depth:m.y,paint:()=>monster(c,m,snapshot.time)})),...snapshot.actors.map(a=>({depth:snapshot.care?.pets[a.id].game?.phase&&snapshot.care.pets[a.id].job.stage==='doing'?10000:a.y,paint:()=>pet(c,a,snapshot,hover)}))];layers.sort((a,b)=>a.depth-b.depth);layers.forEach(layer=>layer.paint(c,snapshot.time));
  if(destination&&destination.until>snapshot.time){const phase=(snapshot.time*1.7)%1;c.save();c.strokeStyle='#e6bc69';c.lineWidth=3;c.globalAlpha=1-phase;c.beginPath();c.ellipse(destination.x,destination.y,12+phase*18,5+phase*10,0,0,Math.PI*2);c.stroke();c.restore();}
  c.save();for(let i=0;i<10;i++){const x=300+(i*137+snapshot.time*4)%700,y=400+(i*83+Math.sin(snapshot.time*.3+i)*16)%580;c.globalAlpha=.25+Math.sin(snapshot.time+i)*.12;el(c,x,y,2,2,'#fff9d4');}c.restore();c.restore();c.setTransform(1,0,0,1,0,0);
 }
 return{render,ground};
}
root.ParkScene={create};
})(typeof window!=='undefined'?window:globalThis);
