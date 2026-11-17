 'use strict';
(function(root){
 const map=root.ParkMap||(typeof module==='object'&&module.exports?require('./park-map.js'):null);
 const original={...map,world:{...map.world},obstacles:map.obstacles.slice(),spawns:map.spawns.map(p=>({...p}))};
 const scenes=[{id:'forest',name:'森林树屋',image:'assets/maps/forest.png'},{id:'snow',name:'冰雪营地',image:'assets/maps/snow.png'},{id:'desert',name:'沙漠遗迹',image:'assets/maps/desert.png'},{id:'lava',name:'熔岩山谷',image:'assets/maps/lava.png'}];
 const arena={id:'arena',name:'竞技场',image:'assets/maps/arena.png'};
 function segmentDistance(x,y,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);}
 let roads=[[[640,790],[640,1090],54]];
 const branches={
  forest:[[[640,440],[620,320],43],[[620,320],[620,230],40],[[350,650],[230,615],38],[[230,615],[145,600],32],[[930,640],[1080,620],43],[[1080,620],[1190,615],40]],
  snow:[[[640,440],[620,320],43],[[620,320],[650,230],40],[[350,650],[230,650],40],[[230,650],[145,640],32],[[930,640],[1080,640],43],[[1080,640],[1190,635],40]],
  desert:[[[640,440],[615,360],43],[[615,360],[600,280],38],[[600,280],[640,210],35],[[350,650],[230,665],45],[[230,665],[145,665],40],[[930,640],[1080,640],45],[[1080,640],[1190,640],40]],
  lava:[[[640,440],[640,320],43],[[640,320],[650,240],40],[[350,650],[230,650],40],[[230,650],[145,640],32],[[930,640],[1080,640],43],[[1080,640],[1190,640],38]]
 };
 function clearance(x,y){
  const normalized=Math.hypot((x-640)/290,(y-640)/220);let value=(1-normalized)*220;
  for(const [a,b,width]of roads)value=Math.max(value,width-segmentDistance(x,y,a,b));
  return Math.max(0,value);
 }
 function use(id,ready=true){
  const scene=scenes.find(s=>s.id===id)||scenes[0];
  if(!ready){
   const {world,obstacles,spawns,...rest}=original;Object.assign(map,rest);Object.assign(map.world,world);map.obstacles.splice(0,map.obstacles.length,...original.obstacles);map.background=original.background;return scene;
  }
  roads=[[[640,790],[640,1090],54],...branches[scene.id]];
  map.world.id='adventure-'+scene.id+'-v23';
  map.obstacles.splice(0,map.obstacles.length,...[[430,430],[845,430],[408,813],[885,813]].map(([x,y],i)=>({id:'lamp-'+i,type:'ellipse',x,y,rx:21,ry:18})));
  map.onRoad=(x,y,pad=0)=>Number.isFinite(x)&&Number.isFinite(y)&&clearance(x,y)>pad;
  map.roadClearance=clearance;map.roadPoints=[];
  for(let y=6;y<1280;y+=12)for(let x=6;x<1280;x+=12)if(map.onRoad(x,y,12))map.roadPoints.push({x,y});
  map.promenadePoints=map.roadPoints.filter(p=>p.y<450||p.y>830||p.x<410||p.x>880);
  map.careZone={x:640,y:650,r:225};map.gather={x:640,y:640,rx:130,ry:90};
  map.background={key:'scene-'+scene.id,image:scene.image};return scene;
 }
 root.ParkWorlds={scenes,arena,use};if(typeof module==='object'&&module.exports)module.exports=root.ParkWorlds;
})(typeof window!=='undefined'?window:globalThis);
