'use strict';
(function(root){
  const profiles = [
    { food: '谷物小饼', feed: '喂小饼', fed: '把小饼啄得干干净净，蓝翅膀开心地抖了抖。' },
    { food: '露珠布丁', feed: '喂布丁', fed: '捧着露珠布丁，脸颊变得粉扑扑。' },
    { food: '胡萝卜脆片', feed: '喂脆片', fed: '抱着脆片嚼得咔嚓响，长耳朵轻轻摆动。' },
    { food: '蜂蜜松饼', feed: '喂松饼', fed: '慢慢吃完松饼，满足地拍拍小肚子。' },
    { food: '骨头饼干', feed: '喂饼干', fed: '吃完饼干，摇着尾巴蹭了蹭你的手。' },
    { food: '能量电池', feed: '补充能量', fed: '面屏亮起青色小爱心，补给完成。' }
  ];
  const danceRules=Object.freeze({leadIn:.6,interval:.75,duration:10.8,finale:1.8,tapCooldown:.65});
  const actions={feed:{duration:3.2,cooldown:10,xp:0},pet:{duration:3,cooldown:12,xp:0},bath:{duration:4.5,cooldown:15,xp:0},dance:{duration:danceRules.duration,cooldown:12,xp:0}};
  const rules=Object.freeze({minLevel:1,maxLevel:10,xpPerLevel:40,maxXp:360,needMin:1,needMax:100,battleMin:30,decaySeconds:24*60*60,decayPerSecond:99/(24*60*60)});
  const needKeys=['food','mood','clean','energy'];
  const clamp=(v,min=0,max=100)=>Math.max(min,Math.min(max,v));
  const number=(v,fallback,min=0,max=100)=>Number.isFinite(v)?clamp(v,min,max):fallback;
  const clampNeed=v=>clamp(v,1,100);
  function needValue(v){return Math.round(clampNeed(number(v,1,1,100)));}
  function growth(xp){const total=Math.floor(number(xp,0,0,rules.maxXp)),maxed=total>=rules.maxXp;return{level:Math.min(10,1+Math.floor(total/40)),current:maxed?40:total%40,next:40,maxed};}
  function danceFor(record){
    const job=record?.job;if(job?.action!=='dance')return null;
    const phase=job.stage==='going'?'going':job.elapsed<danceRules.leadIn?'ready':job.elapsed>=danceRules.duration-danceRules.finale?'finale':'dancing';
    const d=job.dance,flourishAge=job.elapsed-d.lastTap,beat=Math.max(0,Math.floor((job.elapsed-danceRules.leadIn)/danceRules.interval));
    const pose=phase==='going'||phase==='ready'?'focus':phase==='finale'||flourishAge<.7||beat%4===3?'proud':'groove';
    return{phase,pose,elapsed:job.elapsed,progress:Math.min(1,job.elapsed/danceRules.duration),taps:d.taps,move:(Math.floor(beat/4)+d.taps)%3,flourishAge};
  }
  function create(options={}){
    const now=options.now||Date.now,saved=options.saved?.version===1?options.saved:null;
    const oldRefillRevision=Math.floor(number(saved?.needsRefillRevision,0,0,Number.MAX_SAFE_INTEGER)),requestedRefillRevision=Math.floor(number(options.refillRevision,0,0,Number.MAX_SAFE_INTEGER));
    const refillNeeds=requestedRefillRevision>oldRefillRevision,needsRefillRevision=Math.max(oldRefillRevision,requestedRefillRevision);
    const readTime=()=>number(now(),Date.now(),0,Number.MAX_SAFE_INTEGER);
    const startedAt=readTime(),savedAt=saved?number(saved.savedAt,startedAt,0,Number.MAX_SAFE_INTEGER):startedAt,offline=Math.max(0,(startedAt-savedAt)/1000);
    let lastNeedsAt=Math.max(startedAt,savedAt),clock=0,battleTicket=0;
    const pets=profiles.map((profile,id)=>{
      const old=saved?.pets?.[id],needs={},defaults={food:64+id*3,mood:68-id*2,clean:72+id,energy:74-id*3},cooldowns={};
      for(const k of needKeys)needs[k]=refillNeeds?100:clampNeed(number(old?.needs?.[k],defaults[k],1,100)-offline*rules.decayPerSecond);
      for(const a of Object.keys(actions))cooldowns[a]=Math.max(0,number(old?.cooldowns?.[a],0,0,60)-offline);
      return{id,needs,xp:Math.floor(number(old?.xp,0,0,360)),cooldowns,job:null,battle:null,reaction:null,danceReaction:null};
    });
    function syncTime(){const at=readTime();if(at<=lastNeedsAt)return;const elapsed=(at-lastNeedsAt)/1000;lastNeedsAt=at;clock+=elapsed;for(const p of pets){for(const k of needKeys)p.needs[k]=clampNeed(p.needs[k]-elapsed*rules.decayPerSecond);if(p.reaction&&clock>=p.reaction.until)p.reaction=null;if(p.danceReaction&&clock>=p.danceReaction.until)p.danceReaction=null;}}
    function available(id,action){
      syncTime();const p=pets[id],config=actions[action];
      if(!p||!config)return{ok:false,message:'没有找到这个互动。'};
      if(p.job||p.battle)return{ok:false,message:'它正在互动中。'};
      if(p.cooldowns[action]>clock)return{ok:false,message:'再等 '+Math.ceil(p.cooldowns[action]-clock)+' 秒。'};
      if(action==='feed'&&p.needs.food>=94)return{ok:false,message:'已经吃饱啦。'};
      if(action==='bath'&&p.needs.clean>=96)return{ok:false,message:'现在已经很干净啦。'};
      return{ok:true,message:''};
    }
    function cancel(engine,id){const p=pets[id];if(!p?.job)return false;p.job=null;p.danceReaction=null;engine.resumeActor(id);return true;}
    function act(engine,id,action){
      const allowed=available(id,action);if(!allowed.ok)return allowed;
      const p=pets[id],a=engine.actors[id],config=actions[action],safe=engine.careSpot(id);
      if(!safe)return{ok:false,message:'先带它到开阔的道路上。'};
      const target=Math.hypot(safe.x-a.x,safe.y-a.y)>2?safe:null;
      if(target&&!engine.guideActor(id,target.x,target.y))return{ok:false,message:'这里过不去，换一段道路。'};
      if(!target)engine.holdActor(id);
      p.job={action,stage:target?'going':'doing',target,origin:{x:a.x,y:a.y},elapsed:0,travel:0,duration:config.duration};
      if(action==='dance')p.job.dance={taps:0,lastTap:-10};
      p.reaction=null;p.danceReaction=null;engine.setPaused(false);
      return{ok:true,message:action==='dance'?'一起跳舞，轻点伙伴可以换个舞步。':action==='feed'?'准备享用'+profiles[id].food:action==='bath'?'泡泡澡开始啦。':'轻轻摸摸头。'};
    }
    function tap(engine,id){
      syncTime();const p=pets[id],j=p?.job;
      if(j?.action!=='dance'||j.stage!=='doing'||j.elapsed<danceRules.leadIn||j.elapsed>=danceRules.duration-danceRules.finale||engine.snapshot().paused)return{ok:false};
      if(j.elapsed-j.dance.lastTap<danceRules.tapCooldown)return{ok:false};
      j.dance.lastTap=j.elapsed;j.dance.taps++;
      return{ok:true,move:danceFor(p).move};
    }
    function finish(engine,p){
      const j=p.job,c=actions[j.action],before=growth(p.xp).level;let xp=c.xp,text;
      if(j.action==='feed'){p.needs.food+=30;p.needs.energy+=10;text=profiles[p.id].fed;}
      if(j.action==='pet'){p.needs.mood+=10;p.needs.energy+=8;text='开心地蹭蹭你的手。';}
      if(j.action==='bath'){p.needs.clean+=40;p.needs.mood+=7;text='变得干干净净啦。';}
      if(j.action==='dance'){
        p.needs.mood+=16;p.needs.energy+=8;p.danceReaction={pose:'proud',until:clock+2.2};text='一起跳完了一段开心的舞。';
      }
      for(const k of needKeys)p.needs[k]=clampNeed(p.needs[k]);p.xp=Math.min(360,p.xp+xp);p.cooldowns[j.action]=clock+c.cooldown;
      const leveled=growth(p.xp).level>before;p.reaction={text,until:clock+4};p.job=null;engine.resumeActor(p.id);
      return{id:p.id,action:j.action,message:text,leveled};
    }
    function update(dt,engine){
      syncTime();if(engine.snapshot().paused||!Number.isFinite(dt)||dt<=0)return[];const seconds=Math.min(.05,dt),events=[];
      for(const p of pets){const j=p.job;if(!j)continue;if(engine.actors[p.id].goalKind!=='care'){cancel(engine,p.id);continue;}
        if(j.stage==='going'){
          j.travel+=seconds;if(engine.actors[p.id].arrived&&!engine.actors[p.id].path.length){j.stage='doing';j.elapsed=0;}else if(j.travel>60){cancel(engine,p.id);events.push({id:p.id,message:'换一个开阔的位置再玩。'});}continue;
        }
        j.elapsed+=seconds;
        if(j.elapsed>=j.duration)events.push(finish(engine,p));
      }return events;
    }
    function snapshot(){syncTime();return{clock,pets:pets.map(p=>({...p,needs:{...p.needs},profile:profiles[p.id],growth:growth(p.xp),cooldowns:Object.fromEntries(Object.entries(p.cooldowns).map(([k,end])=>[k,Math.max(0,end-clock)])),job:p.job?{...p.job,target:p.job.target?{...p.job.target}:null,origin:{...p.job.origin},dance:p.job.dance?{...p.job.dance}:undefined}:null,reaction:p.reaction?{...p.reaction}:null,danceReaction:p.danceReaction?{...p.danceReaction}:null,game:danceFor(p)}))};}
    function battleAllowed(id){
      const p=pets[id];if(!p)return{ok:false,reason:'missing',low:[]};
      if(p.job||p.battle)return{ok:false,reason:'busy',low:[]};
      const low=needKeys.filter(k=>needValue(p.needs[k])<rules.battleMin),blocked=low.length===needKeys.length;return{ok:!blocked,reason:blocked?'needs':null,low};
    }
    function battleAvailable(id){syncTime();return battleAllowed(id);}
    function reserveBattle(id){
      const p=pets[id],ticket=++battleTicket;p.battle=ticket;p.reaction=null;p.danceReaction=null;
      for(const [key,cost]of Object.entries({food:6,mood:3,clean:5,energy:10}))p.needs[key]=clampNeed(p.needs[key]-cost);
      return{ok:true,ticket,level:growth(p.xp).level};
    }
    function beginBattle(id){syncTime();const allowed=battleAllowed(id);return allowed.ok?reserveBattle(id):allowed;}
    function beginDuel(first,second){
      syncTime();if(!Number.isInteger(first)||!Number.isInteger(second)||first===second)return{ok:false,reason:'opponent'};
      for(const id of [first,second]){const allowed=battleAllowed(id);if(!allowed.ok)return{...allowed,id};}
      return{ok:true,first:reserveBattle(first),second:reserveBattle(second)};
    }
    function settleBattle(id,ticket,won,reward){
      syncTime();const p=pets[id];if(!p||p.battle!==ticket)return{ok:false,xp:0};
      p.battle=null;const before=growth(p.xp).level,previous=p.xp;
      if(won){p.xp=Math.min(rules.maxXp,p.xp+number(reward,0,0,40));}
      return{ok:true,xp:p.xp-previous,leveled:growth(p.xp).level>before,level:growth(p.xp).level};
    }
    function serialize(){syncTime();return{version:1,needsRefillRevision,savedAt:lastNeedsAt,pets:pets.map(p=>({needs:{...p.needs},xp:p.xp,cooldowns:Object.fromEntries(Object.entries(p.cooldowns).map(([k,end])=>[k,Math.max(0,end-clock)]))}))};}
    return{profiles,actions,act,tap,available,cancel,update,snapshot,serialize,battleAvailable,beginBattle,beginDuel,settleBattle};
  }
  root.ParkCare={create,profiles,actions,rules,danceRules,danceFor,needValue};
  if(typeof module==='object'&&module.exports)module.exports=root.ParkCare;
})(typeof window!=='undefined'?window:globalThis);
