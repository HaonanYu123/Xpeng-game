'use strict';
(function(root){
 const pets=(root.PetDesign||(typeof module==='object'&&module.exports?require('./catalog.js'):null)).pets;
 const data=root.ParkRoadData||(typeof module==='object'&&module.exports?require('./assets/maps/road-navigation.js'):null);
 const {columns,rows,cellSize}=data,mask=new Uint8Array(columns*rows),distance=new Uint16Array(columns*rows);
 for(const [y,...spans] of data.runs)for(let i=0;i<spans.length;i+=2)mask.fill(1,y*columns+spans[i],y*columns+spans[i+1]);
 for(let i=0;i<mask.length;i++)distance[i]=mask[i]?4095:0;
 for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){
  const i=y*columns+x;if(!mask[i])continue;
  distance[i]=Math.min(distance[i],(x?distance[i-1]:0)+3,(y?distance[i-columns]:0)+3,(x&&y?distance[i-columns-1]:0)+4,(x+1<columns&&y?distance[i-columns+1]:0)+4);
 }
 for(let y=rows-1;y>=0;y--)for(let x=columns-1;x>=0;x--){
  const i=y*columns+x;if(!mask[i])continue;
  distance[i]=Math.min(distance[i],(x+1<columns?distance[i+1]:0)+3,(y+1<rows?distance[i+columns]:0)+3,(x+1<columns&&y+1<rows?distance[i+columns+1]:0)+4,(x&&y+1<rows?distance[i+columns-1]:0)+4);
 }
 function roadClearance(x,y){
  const xx=Math.floor(x/cellSize),yy=Math.floor(y/cellSize);if(xx<0||yy<0||xx>=columns||yy>=rows)return 0;
  const i=yy*columns+xx;return mask[i]?Math.max(0,distance[i]*cellSize/3-cellSize*.75):0;
 }
 function onRoad(x,y,pad=0){const clearance=roadClearance(x,y);return clearance>0&&clearance>=pad;}
 const roadPoints=[];for(let y=6;y<1280;y+=12)for(let x=6;x<1280;x+=12)if(onRoad(x,y,12))roadPoints.push({x,y});
 const world={id:'round-road-garden-v2',width:1280,height:1280,bounds:{type:'circle',x:640,y:640,r:638},viewport:{x:640,y:640,r:638}};
 const obstacles=[
  {id:'fountain',type:'ellipse',x:640,y:284,rx:122,ry:65},
  {id:'cottage',type:'rect',x:842,y:208,w:252,h:222,r:24},
  {id:'swing',type:'rect',x:215,y:228,w:218,h:186,r:18},
  {id:'slides',type:'rect',x:101,y:489,w:225,h:200,r:26},
  {id:'hoop-left',type:'ellipse',x:1035,y:610,rx:15,ry:16},
  {id:'hoop-right',type:'ellipse',x:1133,y:633,rx:15,ry:16},
  {id:'umbrella',type:'ellipse',x:506,y:913,rx:112,ry:65},
  {id:'picnic-table',type:'rect',x:450,y:972,w:160,h:78,r:14},
  {id:'vegetable-bed',type:'ellipse',x:740,y:1023,rx:105,ry:55},
  {id:'rock',type:'ellipse',x:785,y:1202,rx:48,ry:34},
  ...[[473,486],[804,486],[376,632],[902,632],[465,800],[818,800]].map(([x,y],id)=>({id:'lamp-'+id,type:'ellipse',x,y,rx:16,ry:12}))
 ];
 const spawns=[[470,665],[640,490],[830,650],[650,760],[760,740],[480,535]].map(([x,y],species)=>({species,name:pets[species].name,x,y}));
 const restSpots=[{x:850,y:475},{x:900,y:490},{x:950,y:490},{x:820,y:525},{x:865,y:535},{x:900,y:535}];
 root.ParkMap={world,obstacles,spawns,restSpots,onRoad,roadClearance,roadPoints,roadData:data,promenadePoints:roadPoints.filter(p=>p.y<400||p.y>850||p.x<330||p.x>950),careZone:{x:640,y:710,r:360},gather:{x:640,y:650,rx:132,ry:86},background:{key:'round-road-garden',image:'assets/maps/round-road-garden.png'}};
 if(typeof module==='object'&&module.exports)module.exports=root.ParkMap;
})(typeof window!=='undefined'?window:globalThis);
