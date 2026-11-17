'use strict';
(function(root){
  const keys=root.PetDesign.pets.map(p=>p.key);
  const ids=['joy','surprise','sad','angry'];
  function assetFor(species){return root.ParkExpressionAssets?.characters[keys[species]];}
  function faceFor(actor,record){
    const metadata=assetFor(actor.species),emotion=ids.includes(actor.emote)?actor.emote:actor.expression;
    if(!metadata||!ids.includes(emotion)||record?.job?.stage==='doing')return null;
    return {key:keys[actor.species]+'-expressions',kind:'expression',emotion,frame:metadata.poses[emotion],metadata,flip:(actor.facing<0?-1:1)*(metadata.facing||-1)};
  }
  function poseFor(actor,record){
    if(!actor.emote&&actor.species!==5&&(actor.state==='walking'||actor.poseMix>0))return null;
    return faceFor(actor,record);
  }
  function previewFor(species,id,size=128){
    const metadata=assetFor(species);if(!metadata||!ids.includes(id))return null;
    const frame=metadata.poses[id];
    return {image:metadata.image,frame,backgroundSize:`${size*2}px ${size*2}px`,backgroundPosition:`-${frame%2*size}px -${Math.floor(frame/2)*size}px`};
  }
  root.ParkExpressions={ids,keys,assetFor,faceFor,poseFor,previewFor};
})(typeof window!=='undefined'?window:globalThis);
