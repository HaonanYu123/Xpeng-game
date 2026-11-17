'use strict';
(function(root){
 const formations={
  forest:{hero:[395,900],foe:[870,600]},snow:{hero:[420,885],foe:[850,595]},
  desert:{hero:[390,875],foe:[885,620]},lava:{hero:[425,910],foe:[845,605]},
  arena:{hero:[405,900],foe:[865,600]}
 };
 const petEffects=[
  {color:'#559dff',light:'#d4efff',particle:'feather',style:'gale'},
  {color:'#71e5c7',light:'#effff7',particle:'bubble',style:'cloud'},
  {color:'#c38aff',light:'#f8e4ff',particle:'petal',style:'blossom'},
  {color:'#ffb83e',light:'#fff3b6',particle:'star',style:'sun'},
  {color:'#62c9f0',light:'#e0f9ff',particle:'paw',style:'paw'},
  {color:'#48e9ff',light:'#e8ffff',particle:'hex',style:'laser'}
 ];
 const wildEffects={
  forest:{color:'#8bd153',light:'#f1ffcf',particle:'leaf'},
  snow:{color:'#71cafa',light:'#efffff',particle:'crystal'},
  desert:{color:'#e8ac51',light:'#fff0bd',particle:'crystal'},
  lava:{color:'#ff7138',light:'#ffe8a1',particle:'ember'}
 };
 const clamp=v=>Math.max(0,Math.min(1,v));
 function effectFor(b,actor,opponent){
  if(!b?.animation||!['hero','enemy'].includes(b.phase))return null;
  const formation=formations[b.originScene]||formations.arena,fromHero=b.animation.side==='hero';
  const hero={...actor,x:formation.hero[0],y:formation.hero[1],facing:1,hoverLift:12+Math.sin(b.time*2.4)*2};
  const foe=opponent?{...opponent,x:formation.foe[0],y:formation.foe[1],facing:-1,hoverLift:12+Math.sin(b.time*2.4)*2}:null;
  const caster=fromHero?hero:foe,target=fromHero?foe:hero;
  const sourceGround=fromHero?formation.hero:formation.foe,targetGround=fromHero?formation.foe:formation.hero;
  const mouth=caster?root.ParkMotion.mouthFor(caster):{x:sourceGround[0]-34,y:sourceGround[1]-110};
  const direction=fromHero?1:-1;
  const source={x:mouth.x+direction*24,y:mouth.y};
  const impact={x:targetGround[0],y:target?target.y-root.ParkMotion.liftFor(target)-root.ParkMotion.heights[target.species]*.55:targetGround[1]-95};
  const profile=caster?petEffects[caster.species]:(wildEffects[b.enemy.theme]||wildEffects.forest);
  const u=clamp(b.elapsed/root.ParkCombat.rules.waveDuration),hitAt=root.ParkCombat.rules.impactPoint;
  const hit=u>=hitAt?clamp((u-hitAt)/(1-hitAt)):0;
  const level=fromHero?b.level:b.enemyLevel;
  return{u,hit,hitActive:u>=hitAt,flight:clamp((u-.22)/(hitAt-.22)),charge:clamp(u/.26),source,impact,sourceGround,targetGround,profile,
   strength:(b.animation.multiplier===1?1:.7)*(.86+.14*Math.min(10,level)/10),seed:(b.sequence||1)*7+(caster?.species||0),direction,
   recoil:u>=hitAt?Math.sin(hit*Math.PI*3)**2*6*(1-hit):0};
 }
 function create(canvas,images){
  const c=canvas.getContext('2d'),W=1280,TAU=Math.PI*2;
  function ellipse(x,y,rx,ry,color){c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fillStyle=color;c.fill();}
  function plate(x,y,w,h,fill='#382d2ac9'){c.beginPath();c.roundRect(x-w/2,y-h/2,w,h,h/2);c.fillStyle=fill;c.fill();c.strokeStyle='#fff3d25c';c.lineWidth=2;c.stroke();}
  function text(value,x,y,size=24,color='#fff5df',weight='500'){c.textAlign='center';c.textBaseline='middle';c.font=weight+' '+size+'px "Microsoft YaHei",sans-serif';c.fillStyle=color;c.fillText(value,x,y);}
  function health(side,value,color){
   const a=side==='hero'?Math.PI*.76:-Math.PI*.24,length=Math.PI*.48;
   c.save();c.lineCap='round';c.lineWidth=32;c.strokeStyle='#2d2b32bb';c.beginPath();c.arc(640,640,588,a,a+length);c.stroke();
   c.lineWidth=22;c.strokeStyle=color;c.shadowBlur=10;c.shadowColor=color;
   const ratio=Math.max(0,Math.min(1,value.hp/value.maxHp));if(ratio>0){c.beginPath();c.arc(640,640,588,a,a+length*ratio);c.stroke();}
   c.shadowBlur=0;c.lineWidth=2;c.strokeStyle='#fff5d68c';c.beginPath();c.arc(640,640,606,a,a+length);c.stroke();c.restore();
  }
  function drawMonster(b,x,y){
   const m=b.enemy,image=images[m.imageKey||'monsters'];if(!image?.naturalWidth)return;
   const fw=image.naturalWidth/(m.columns||4),box=m.imageKey?root.ParkExtraMonsterBounds?.[m.id]:root.ParkMonsterBounds?.[m.frame];
   if(!box)return;const h=185,w=h*box.w/box.h;
   ellipse(x,y+5,65,14,'#68442529');c.save();if(b.phase==='victory')c.globalAlpha=Math.max(.22,1-b.elapsed*.8);
   c.drawImage(image,m.frame*fw+box.x,box.y,box.w,box.h,x-w/2,y-h,w,h);c.restore();
  }
  const reduced=Boolean(root.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  function rgba(hex,a){const n=parseInt(hex.slice(1),16);return'rgba('+[(n>>16)&255,(n>>8)&255,n&255,clamp(a)].join(',')+')';}
  function glow(x,y,r,color,alpha=1){
   if(r<=0||alpha<=0)return;const g=c.createRadialGradient(x,y,0,x,y,r);
   g.addColorStop(0,rgba(color,alpha));g.addColorStop(.32,rgba(color,alpha*.55));g.addColorStop(1,rgba(color,0));ellipse(x,y,r,r,g);
  }
  function ring(x,y,r,color,width=3,squash=1,rotation=0){
   c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.ellipse(x,y,r,r*squash,rotation,0,TAU);c.stroke();
  }
  function particle(kind,x,y,size,rotation,color){
   c.save();c.translate(x,y);c.rotate(rotation);c.fillStyle=color;c.strokeStyle=color;c.lineWidth=1.6;
   if(kind==='bubble'){ring(0,0,size,color,2);ellipse(-size*.3,-size*.3,size*.2,size*.2,'#ffffff');}
   else if(kind==='paw'){ellipse(0,size*.25,size*.5,size*.4,color);for(let i=0;i<3;i++)ellipse((i-1)*size*.47,-size*.35,size*.22,size*.28,color);}
   else if(kind==='leaf'||kind==='feather'||kind==='petal'||kind==='ember'){
    c.beginPath();c.moveTo(-size,0);c.quadraticCurveTo(-size*.1,-size*(kind==='feather'?.5:.85),size,0);c.quadraticCurveTo(0,size*.65,-size,0);c.fill();
    if(kind==='feather'){c.beginPath();c.moveTo(-size,0);c.lineTo(size*.8,0);c.stroke();}
   }else{
    const points=kind==='star'?8:kind==='hex'?6:4;
    c.beginPath();for(let i=0;i<points;i++){const a=i*TAU/points,r=kind==='star'&&i%2?size*.28:size,px=Math.cos(a)*r,py=Math.sin(a)*r;if(i)c.lineTo(px,py);else c.moveTo(px,py);}c.closePath();
    if(kind==='hex')c.stroke();else c.fill();
   }
   c.restore();
  }
  function puff(x,y,r,p){
   glow(x,y,r*1.6,p.color,.3);ellipse(x-r*.5,y+r*.12,r*.62,r*.54,p.color);ellipse(x+r*.48,y+r*.12,r*.62,r*.54,p.color);
   ellipse(x,y-r*.22,r*.78,r*.72,p.light);ellipse(x-r*.24,y-r*.4,r*.27,r*.18,'#ffffff');
  }
  function crest(style,x,y,r,spin,p){
   c.save();c.translate(x,y);
   if(style==='gale'){
    c.rotate(spin);c.lineWidth=3;c.strokeStyle=p.light;
    for(let i=0;i<3;i++){c.save();c.rotate(i*TAU/3);c.beginPath();c.arc(0,0,r,-.1,1.8);c.quadraticCurveTo(r*.12,r*.15,r*.55,0);c.stroke();particle('feather',r*.55,r*.4,r*.25,.8,p.color);c.restore();}
   }else if(style==='cloud'){puff(0,0,r,p);ring(r*.8,-r*.7,r*.22,p.light,2);}
   else if(style==='blossom'){
    c.rotate(spin);for(let i=0;i<5;i++){c.save();c.rotate(i*TAU/5);ellipse(0,-r*.56,r*.32,r*.64,p.color);ellipse(0,-r*.5,r*.13,r*.35,p.light);c.restore();}ellipse(0,0,r*.23,r*.23,'#fff5d8');
   }else if(style==='sun'){
    c.rotate(spin);for(let i=0;i<12;i++){const a=i*TAU/12;c.strokeStyle=i%2?p.light:p.color;c.lineWidth=i%2?3:6;c.beginPath();c.moveTo(Math.cos(a)*r*.8,Math.sin(a)*r*.8);c.lineTo(Math.cos(a)*r*1.22,Math.sin(a)*r*1.22);c.stroke();}
    glow(0,0,r*1.65,p.color,.5);ellipse(0,0,r*.72,r*.72,p.color);ellipse(-r*.12,-r*.1,r*.46,r*.46,p.light);ellipse(-r*.24,-r*.24,r*.17,r*.12,'#ffffff');
   }else if(style==='paw'){
    glow(0,0,r*1.8,p.color,.3);ellipse(0,r*.28,r*.61,r*.48,p.color);ellipse(-r*.09,r*.26,r*.39,r*.29,p.light);
    for(let i=0;i<4;i++){const a=-2.5+i*.62,xx=Math.cos(a)*r*.83,yy=Math.sin(a)*r*.83;ellipse(xx,yy,r*.24,r*.3,p.color);ellipse(xx-r*.05,yy-r*.06,r*.11,r*.15,p.light);}
   }else if(style==='laser'){
    c.rotate(spin);for(let layer=0;layer<2;layer++){c.strokeStyle=layer?p.color:p.light;c.lineWidth=layer?2:4;c.beginPath();for(let i=0;i<=6;i++){const a=i*TAU/6,rr=r*(layer?.76:1);if(i)c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);else c.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);}c.stroke();}
   }
   c.restore();
  }
  function signatureProjectile(fx,l,k){
   const p=fx.profile,style=p.style;if(!style||style==='laser')return false;if(fx.hitActive)return true;
   const y=-(style==='cloud'?28:style==='blossom'?20:0)*Math.sin(fx.flight*Math.PI),r=(style==='paw'?36:style==='sun'?34:32)*k;
   if(style==='gale'){
    c.strokeStyle=rgba(p.color,.8);c.lineWidth=4;
    for(let i=0;i<3;i++){const start=Math.max(0,l-150-i*20);c.beginPath();c.moveTo(start,y+(i-1)*13);c.bezierCurveTo(start+40,y+(i-1)*36,l-35,y-(i-1)*20,l,y);c.stroke();}
   }
   const count=reduced?2:4;
   for(let i=count;i>=1;i--){
    const xx=l-i*(style==='paw'?45:36);if(xx<0)continue;
    c.save();c.globalAlpha*=.45*(1-i/(count+1));
    if(style==='cloud'){ring(xx,y+Math.sin(i+fx.u*8)*12,6+(count-i)*3,p.light,2);glow(xx,y,15,p.color,.35);}
    else if(style==='paw'){crest('paw',xx,y+(i%2?9:-9),r*.27,0,p);}
    else particle(p.particle,xx,y+Math.sin(i+fx.u*9)*15,4+(count-i)*2,fx.u*5+i,p.light);
    c.restore();
   }
   crest(style,l,y,r,fx.u*(style==='gale'?17:style==='blossom'?10:3),p);
   return true;
  }
  function signatureImpact(fx,r){
   const p=fx.profile,style=p.style;if(!style)return false;
   const {impact:t,hit:h,strength:k}=fx;
   if(style==='gale'){
    for(let i=0;i<4;i++){const y=t.y+48-i*29,rx=(22+i*17+h*28)*k;c.strokeStyle=i%2?p.light:p.color;c.lineWidth=4-i*.5;c.beginPath();c.ellipse(t.x+Math.sin(h*8+i)*9,y,rx,11*k,0,h*8+i,h*8+i+Math.PI*1.7);c.stroke();}
    for(let i=0;i<10;i++){const a=i*TAU/10+h*6,dist=(28+h*88)*k;particle('feather',t.x+Math.cos(a)*dist,t.y+Math.sin(a)*dist*.7,11*(1-h*.6)*k,a,p.light);}
   }else if(style==='cloud'){
    puff(t.x,t.y,(20+Math.sin(h*Math.PI)*32)*k,p);
    for(let i=0;i<9;i++){const a=i*TAU/9,dist=(20+h*107)*k;const x=t.x+Math.cos(a)*dist,y=t.y+Math.sin(a)*dist*.72-h*22;ring(x,y,(7+Math.sin(h*Math.PI)*9)*k,i%2?p.color:p.light,3);ellipse(x-3,y-3,2,2,'#ffffff');}
   }else if(style==='blossom'){
    crest('blossom',t.x,t.y,(25+Math.sin(h*Math.PI)*39)*k,h*2,p);
    for(let i=0;i<10;i++){const a=i*TAU/10+h*.8,dist=(30+h*91)*k;particle('petal',t.x+Math.cos(a)*dist,t.y+Math.sin(a)*dist*.8,13*(1-h*.5)*k,a+h*3,i%2?p.color:p.light);}
   }else if(style==='sun'){
    crest('sun',t.x,t.y,(28+Math.sin(h*Math.PI)*39)*k,h*.5,p);
    ring(t.x,t.y,(35+h*103)*k,p.color,5);ring(t.x,t.y,(25+h*78)*k,p.light,2);
    for(let i=0;i<8;i++){const a=i*TAU/8;particle('star',t.x+Math.cos(a)*(30+h*125)*k,t.y+Math.sin(a)*(30+h*100)*k,7*k,a,p.light);}
   }else if(style==='paw'){
    c.save();c.translate(t.x,t.y);c.rotate(-.2);crest('paw',0,0,(28+Math.sin(h*Math.PI)*34)*k,0,p);c.restore();
    ring(t.x,t.y,(35+h*90)*k,p.color,4,.75);
    c.save();c.globalAlpha*=.6;c.translate(fx.targetGround[0],fx.targetGround[1]+2);c.scale(1,.33);crest('paw',0,0,(45+h*25)*k,0,p);c.restore();
    for(let i=0;i<6;i++){const a=i*TAU/6;particle('paw',t.x+Math.cos(a)*(35+h*95)*k,t.y+Math.sin(a)*(35+h*95)*k,8*k,a,p.light);}
   }else if(style==='laser'){
    crest('laser',t.x,t.y,(27+h*95)*k,h,p);crest('laser',t.x,t.y,(18+h*62)*k,-h,p);
    for(let i=0;i<12;i++){const a=i*TAU/12,dist=(25+h*104)*k;const x=t.x+Math.cos(a)*dist,y=t.y+Math.sin(a)*dist*.8;c.strokeStyle=i%2?p.color:p.light;c.lineWidth=3;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(a)*12,y);c.lineTo(x+Math.cos(a)*12,y+Math.sin(a)*12);c.stroke();particle('hex',x,y,5*k,h+i,p.light);}
    ellipse(t.x,t.y,20*(1-h)*k,20*(1-h)*k,p.light);ellipse(t.x,t.y,9*(1-h)*k,9*(1-h)*k,'#ffffff');
   }
   if(style!=='paw'){c.save();c.globalAlpha*=.5;ring(fx.targetGround[0],fx.targetGround[1]+3,(30+h*88)*k,p.color,2,.25);c.restore();}
   return true;
  }
  function floorAura(fx){
   if(!fx||fx.u>.58)return;const {sourceGround:g,profile:p}=fx,fade=fx.u<.28?fx.charge:clamp((.58-fx.u)/.3),r=(28+fx.charge*48)*fx.strength;
   c.save();c.globalAlpha=fade*.7;c.globalCompositeOperation='source-over';
   glow(g[0],g[1],r,p.color,.2);ring(g[0],g[1]+3,r,p.color,3,.28);ring(g[0],g[1]+3,r*.77,p.light,1.5,.28);
   for(let i=0;i<6;i++){const a=i*TAU/6+fx.u*2;particle(p.particle,g[0]+Math.cos(a)*r,g[1]+Math.sin(a)*r*.28,4,a,p.light);}
   c.restore();
  }
  function wave(fx){
   if(!fx)return;const {u,source:s,impact:t,profile:p,strength:k}=fx,dx=t.x-s.x,dy=t.y-s.y,length=Math.hypot(dx,dy),angle=Math.atan2(dy,dx);
   const noise=i=>{const n=Math.sin(i*127.1+fx.seed*31.7)*43758.5453;return n-Math.floor(n);};
   c.save();c.lineCap='round';c.lineJoin='round';c.globalCompositeOperation='source-over';
   // Ribbons orbit the emitter, then collapse into the charged orb.
   if(u<.45){
    const fade=u<.26?fx.charge:clamp((.45-u)/.19),r=(9+fx.charge*21)*k;
    glow(s.x,s.y,r*3.4,p.color,.52*fade);
    c.save();c.globalAlpha=fade;
    ring(s.x,s.y,r*1.65,p.color,3,.48,u*8);ring(s.x,s.y,r*1.35,p.light,2,.55,-u*10);
    for(let i=0;i<(reduced?6:12);i++){
     const a=i*TAU/12+u*11,rad=(55*(1-fx.charge)+18+noise(i)*22)*k;
     const x=s.x+Math.cos(a)*rad,y=s.y+Math.sin(a)*rad*.8;
     particle(p.particle,x,y,3+noise(i+20)*4,a,p.light);
     c.strokeStyle=rgba(p.color,.65);c.lineWidth=2;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(s.x+Math.cos(a+.8)*rad*.5,s.y+Math.sin(a+.8)*rad*.5,s.x,s.y);c.stroke();
    }
    const core=c.createRadialGradient(s.x-r*.2,s.y-r*.2,0,s.x,s.y,r);core.addColorStop(0,'#ffffff');core.addColorStop(.3,p.light);core.addColorStop(.65,p.color);core.addColorStop(1,rgba(p.color,0));
    ellipse(s.x,s.y,r,r,core);if(p.style)crest(p.style,s.x,s.y,r*1.3,u*8,p);c.restore();
   }
   // A tapered white-hot wave, coloured halo and two spiralling light strands.
   if(u>=.22&&u<.95){
    const travel=fx.flight**.9,l=Math.max(1,length*travel),fade=u<.64?1:clamp((.95-u)/.31),w=(18+12*Math.sin(travel*Math.PI))*k;
    c.save();c.translate(s.x,s.y);c.rotate(angle);c.globalAlpha=fade;
    if(!signatureProjectile(fx,l,k)){
    const ribbon=(width,color)=>{
     c.fillStyle=color;c.beginPath();c.moveTo(0,-width*.18);c.bezierCurveTo(l*.3,-width,l*.75,-width,l+12,0);c.bezierCurveTo(l*.75,width,l*.3,width,0,width*.18);c.closePath();c.fill();
    };
    const beam=c.createLinearGradient(0,0,l,0);beam.addColorStop(0,rgba(p.color,.1));beam.addColorStop(.25,rgba(p.color,.65));beam.addColorStop(1,p.color);
    ribbon(w*2.6,rgba(p.color,.11));ribbon(w*1.65,rgba(p.color,.3));ribbon(w,beam);ribbon(w*.4,p.light);ribbon(w*.14,'#ffffff');
    for(let strand=0;strand<2;strand++){
     c.strokeStyle=strand?p.light:p.color;c.lineWidth=strand?2.2:4;c.beginPath();
     for(let j=0;j<=36;j++){const x=l*j/36,y=Math.sin(x/24-u*24+strand*Math.PI)*w*.9*Math.sin(j/36*Math.PI);if(j)c.lineTo(x,y);else c.moveTo(x,y);}c.stroke();
    }
    for(let i=0;i<8;i++){const x=l*noise(i+44),y=(noise(i+64)-.5)*w*4;particle(p.particle,x,y,3+noise(i+74)*5,u*8+i,p.light);}
    glow(l,0,45*k,p.color,.68);ellipse(l,0,25*k,16*k,p.color);ellipse(l-3,0,17*k,7*k,p.light);ellipse(l,0,9*k,3*k,'#ffffff');
    ring(l,0,31*k,p.light,2,.52,u*9);if(p.style==='laser')crest('laser',l,0,38*k,u*7,p);
    }c.restore();
   }
   // A contained magic burst and ground shock ring coincide with actual health loss.
   if(fx.hitActive){
    const h=fx.hit,fade=(1-h)**1.1,burst=Math.sin(Math.min(1,h*2.8)*Math.PI/2),r=(28+burst*83)*k;
    c.save();c.globalAlpha=fade;
    glow(t.x,t.y,r*1.42,p.color,.5);glow(t.x,t.y,r*.56,p.light,.65);
    if(!signatureImpact(fx,r)){
    const flare=c.createRadialGradient(t.x,t.y,0,t.x,t.y,r);
    flare.addColorStop(0,p.light);flare.addColorStop(.35,p.color);flare.addColorStop(1,rgba(p.color,.05));
    c.save();c.globalAlpha*=.82;c.fillStyle=flare;c.beginPath();
    for(let i=0;i<16;i++){const a=i*TAU/16+h*.25,rr=r*(i%2?.3:.88);const x=t.x+Math.cos(a)*rr,y=t.y+Math.sin(a)*rr;if(i)c.lineTo(x,y);else c.moveTo(x,y);}c.closePath();c.fill();c.restore();
    ring(t.x,t.y,18+h*125*k,p.color,5*(1-h)+1,.76,h*.6);
    ring(t.x,t.y,10+h*92*k,p.light,2.5,.9,-h);
    c.save();c.globalAlpha*=.65;ring(fx.targetGround[0],fx.targetGround[1]+3,(35+h*100)*k,p.color,3,.27);c.restore();
    const count=reduced?10:22;
    for(let i=0;i<count;i++){
     const a=i*TAU/count+noise(i+101)*.45,dist=(20+(h**.65)*(55+noise(i+120)*88))*k;
     const x=t.x+Math.cos(a)*dist,y=t.y+Math.sin(a)*dist*.85+h*h*24;
     const size=(4+noise(i+140)*8)*(1-h*.7)*k;
     c.strokeStyle=rgba(p.color,.6);c.lineWidth=2.5;c.beginPath();c.moveTo(t.x+Math.cos(a)*dist*.62,t.y+Math.sin(a)*dist*.62*.85);c.lineTo(x,y);c.stroke();
     particle(p.particle,x,y,size,a+u*5,i%3?p.color:p.light);
    }
    for(let i=0;i<8;i++){
     const a=i*TAU/8+h*.5,r1=(13+h*20)*k,r2=(55+Math.sin(h*Math.PI)*45)*k;
     c.fillStyle=i%2?p.color:p.light;c.beginPath();c.moveTo(t.x+Math.cos(a-.13)*r1,t.y+Math.sin(a-.13)*r1);c.lineTo(t.x+Math.cos(a)*r2,t.y+Math.sin(a)*r2);c.lineTo(t.x+Math.cos(a+.13)*r1,t.y+Math.sin(a+.13)*r1);c.closePath();c.fill();
    }
    ellipse(t.x,t.y,(9+25*(1-h))*k,(9+25*(1-h))*k,p.light);ellipse(t.x,t.y,11*(1-h)*k,11*(1-h)*k,'#ffffff');
    }
    c.restore();
   }
   c.restore();
  }
  function timing(b){
   const rules=root.ParkCombat.rules,locked=b.slider.locked,pos=Math.max(0,Math.min(1,b.slider.position));
   // A shallow arc follows the round screen; artwork and hit judging share the same normalized position.
   const point=t=>({x:395+490*t,y:1024+180*t*(1-t)});
   function rail(from=0,to=1){c.beginPath();for(let i=0;i<=40;i++){const p=point(from+(to-from)*i/40);if(i)c.lineTo(p.x,p.y);else c.moveTo(p.x,p.y);}}
   c.save();c.lineCap='round';c.lineJoin='round';
   c.shadowColor='#583c2860';c.shadowBlur=14;c.shadowOffsetY=5;
   const rim=c.createLinearGradient(0,1010,0,1090);rim.addColorStop(0,'#fff4ca');rim.addColorStop(.45,'#e2bd72');rim.addColorStop(1,'#9e7341');
   rail();c.lineWidth=29;c.strokeStyle=rim;c.stroke();
   c.shadowBlur=0;c.shadowOffsetY=0;rail();c.lineWidth=22;c.strokeStyle='#9a7c4c';c.stroke();
   const inlay=c.createLinearGradient(395,0,885,0);inlay.addColorStop(0,'#bd995e');inlay.addColorStop(.5,'#edcf8e');inlay.addColorStop(1,'#bd995e');
   rail();c.lineWidth=14;c.strokeStyle=inlay;c.stroke();
   // A softly illuminated sweet spot replaces boxed multiplier labels.
   c.shadowColor='#ffe9a5';c.shadowBlur=18+(locked?0:Math.sin(b.time*2)*3);
   rail(rules.zoneStart,rules.zoneEnd);c.lineWidth=18;c.strokeStyle='#ffedac';c.stroke();
   c.shadowBlur=0;rail(rules.zoneStart,rules.zoneEnd);c.lineWidth=8;c.strokeStyle='#fff9dc';c.stroke();
   for(const t of [rules.zoneStart,rules.zoneEnd]){const p=point(t);ellipse(p.x,p.y,3,3,'#fffce5');}
   if(!locked){
    const direction=(b.sliderTime/rules.sliderPeriod%1)<.5?1:-1;
    for(let i=3;i>0;i--){const t=pos-direction*i*.028;if(t<0||t>1)continue;const p=point(t);ellipse(p.x,p.y,5-i,5-i,'#fff7d8'+['','a0','65','35'][i]);}
   }
   const cursor=point(pos);
   c.shadowColor=locked&&b.slider.multiplier===1?'#ffe695':'#fff6dc';c.shadowBlur=locked?23:12;
   const pearl=c.createRadialGradient(cursor.x-5,cursor.y-6,1,cursor.x,cursor.y,18);
   pearl.addColorStop(0,'#ffffff');pearl.addColorStop(.45,'#fff9df');pearl.addColorStop(.8,'#f0d494');pearl.addColorStop(1,'#ba8a44');
   ellipse(cursor.x,cursor.y,17,17,pearl);c.shadowBlur=0;
   c.strokeStyle='#fff8db';c.lineWidth=2;c.beginPath();c.arc(cursor.x,cursor.y,17,0,TAU);c.stroke();
   ellipse(cursor.x-5,cursor.y-6,4,3,'#ffffff');
   if(locked&&b.slider.multiplier===1&&b.phase===(b.activeSide==='hero'?'hero':'enemy')){
    c.save();c.globalAlpha=Math.max(0,1-b.elapsed/.6);c.strokeStyle='#fff4c2';c.lineWidth=2;
    c.beginPath();c.arc(cursor.x,cursor.y,22+Math.min(.6,b.elapsed)*24,0,TAU);c.stroke();c.restore();
   }
   c.shadowColor='#513a27';c.shadowBlur=4;c.shadowOffsetY=1;text(b.skillName||'光波',640,961,24,'#fff6dd');
   c.restore();
  }
  function render(b,actor,opponent){
   c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,W,W);c.save();c.beginPath();c.arc(640,640,638,0,TAU);c.clip();
   if(images.arena?.naturalWidth)c.drawImage(images.arena,0,0,W,W);else{c.fillStyle='#d9ba91';c.fillRect(0,0,W,W);ellipse(640,680,470,330,'#efd8b6');}
   const shade=c.createRadialGradient(640,650,290,640,650,670);shade.addColorStop(0,'#332b2000');shade.addColorStop(1,'#211c285e');c.fillStyle=shade;c.fillRect(0,0,W,W);
   const formation=formations[b.originScene]||formations.arena,[hx,hy]=formation.hero,[fx,fy]=formation.foe,fxState=effectFor(b,actor,opponent);
   floorAura(fxState);
   if(b.phase==='player'){const x=b.activeSide==='hero'?hx:fx,y=b.activeSide==='hero'?hy:fy;ellipse(x,y+5,68,18,b.activeSide==='hero'?'#d4f2a078':'#ffd5a878');}
   const hero={...actor,x:hx-(fxState?.direction===-1?fxState.recoil:0),y:hy,facing:1,state:'idle',walked:0,poseMix:0,motionSpeed:0,hoverLift:12+Math.sin(b.time*2.4)*2,emote:b.winnerId===actor.id&&!actor.expression?'joy':null,emoteUntil:1e10,goalKind:'care'};
   ellipse(hero.x,hy+5,60,14,'#68442529');root.ParkMotion.draw(c,hero,images,{time:b.time,care:null});
   if(b.mode==='pvp'&&opponent){
    const foe={...opponent,x:fx+(fxState?.direction===1?fxState.recoil:0),y:fy,facing:-1,state:'idle',walked:0,poseMix:0,motionSpeed:0,hoverLift:12+Math.sin(b.time*2.4)*2,emote:b.winnerId===opponent.id&&!opponent.expression?'joy':null,emoteUntil:1e10,goalKind:'care'};
    ellipse(foe.x,fy+5,60,14,'#68442529');root.ParkMotion.draw(c,foe,images,{time:b.time,care:null});
   }else drawMonster(b,fx+(fxState?.direction===1?fxState.recoil:0),fy);
   wave(fxState);
   health('hero',b.hero,'#b9db87');health('foe',b.foe,'#f3a296');
   plate(640,148,182,76);text(String(Math.ceil(b.remaining)).padStart(2,'0'),640,150,58,b.remaining<=10?'#ffc3ab':'#fff2d2','600');
   if(!root.ParkCombat.ended(b.phase)){
    timing(b);
   }else{
    c.save();c.beginPath();c.roundRect(347,478,586,285,44);c.fillStyle='#fff3def2';c.fill();c.strokeStyle='#ffe8b8';c.lineWidth=3;c.stroke();
    const title=b.phase==='draw'?'平局':b.mode==='pvp'?(b.winnerId===actor.id?actor.name:b.enemy.name)+' 获胜':b.phase==='victory'?'挑战成功':'下次再来';
    text(title,640,558,42,'#8b5d32','600');
    text(b.winnerId!==null?(b.reward.level===10?'Lv.10 · 已满级':'经验 +'+b.reward.xp)+(b.reward.leveled?' · 升级！':''):'',640,628,28,'#ac7b44');
    if(b.finishedReason==='timeout')text('时间到 · 按剩余血量比例结算',640,701,21,'#9c8162');c.restore();
   }
   c.restore();
  }
  return{render,drawEffect:wave};
 }
 root.ParkBattleScene={create,formations,effectFor,petEffects,wildEffects};
})(typeof window!=='undefined'?window:globalThis);

