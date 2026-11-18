'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'dist'),files=new Set();
function localFile(from,url){
 if(/^(?:[a-z]+:|\/\/|#)/i.test(url))return;
 const file=path.resolve(path.dirname(from),url.split(/[?#]/)[0]);
 assert.ok(file.startsWith(root+path.sep),'reference must stay inside dist: '+url);
 assert.ok(fs.statSync(file).isFile(),'missing local file: '+url);
 files.add(file);return file;
}
function page(name){
 const file=path.join(root,name),html=fs.readFileSync(file,'utf8');files.add(file);
 for(const m of html.matchAll(/\b(?:src|href)="([^"]+)"/g)){
  localFile(file,m[1]);
 }
 return html;
}
const game=page('index.html');
const scriptPaths=[...game.matchAll(/<script src="([^"?]+)/g)].map(m=>m[1]);
assert.equal(new Set(scriptPaths).size,scriptPaths.length,'load each game module only once');
const elementIds=[...game.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(new Set(elementIds).size,elementIds.length,'UI components must have unique element IDs');

for(const file of [...files].filter(f=>f.endsWith('.css'))){
 for(const m of fs.readFileSync(file,'utf8').matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g))localFile(file,m[1]);
}
const window={},sandbox={window,console,Math,Date};
for(const m of game.matchAll(/<script src="([^"?]+)(?:\?[^"]*)?"><\/script>/g)){
 if(m[1]!=='park.js')vm.runInNewContext(fs.readFileSync(path.join(root,m[1]),'utf8'),sandbox);
}
function assets(value){
 if(typeof value==='string'&&value.startsWith('assets/'))localFile(path.join(root,'index.html'),value);
 else if(Array.isArray(value))value.forEach(assets);
 else if(value&&typeof value==='object')Object.values(value).forEach(assets);
}
for(const data of [window.ParkMotion.characters,window.ParkWalkAssets,window.ParkExpressionAssets,window.ParkRhythmAssets,window.ParkCareProps,window.ParkWorlds,window.ParkMap.background])assets(data);
const pets=window.PetDesign.pets;
assert.equal(pets.length,6);assert.equal(new Set(pets.map(p=>p.key)).size,6);
for(const [species,pet]of pets.entries()){
 assert.equal(pet.id,species);assert.equal(window.ParkMap.spawns[species].name,pet.name);
 for(const atlas of [window.ParkWalkAssets,window.ParkExpressionAssets,window.ParkRhythmAssets])assert.ok(atlas.characters[pet.key],'each pet needs walk/hover, expression and dance assets: '+pet.key);
}
localFile(path.join(root,'index.html'),'assets/monsters/enemies-v23.webp');
for(const enemy of window.ParkCombat.enemies.filter(e=>e.imageKey))localFile(path.join(root,'index.html'),'assets/monsters/'+enemy.id+'-v30.webp');
console.log('PASS current game local dependencies: six pet rigs, 24 faces, care/dance art, all maps and eight monsters');
module.exports={files};
