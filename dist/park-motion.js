'use strict';
(function (root) {
  const characters = root.PetDesign.pets.slice();
  const strides = [48, 38, 60, 52, 64, 54];
  const heights = [132, 125, 136, 147, 142, 155];
  function frameFor(actor) {
    const metadata = root.ParkWalkAssets?.characters[characters[actor.species]?.key];
    if (!metadata || metadata.gait === 'hover') return 0;
    const distance = Math.max(0, (Number.isFinite(actor.walked) ? actor.walked : 0) - (actor.walkStart || 0));
    return Math.floor((distance / strides[actor.species] % 1) * metadata.frames) % metadata.frames;
  }
  function liftFor(actor) {
    return actor.species === 5 ? (Number.isFinite(actor.hoverLift) ? actor.hoverLift : 12) : 0;
  }
  function settleFrameFor(actor) {
    if (actor.species === 5) return 0;
    const frame = frameFor(actor), contact = Math.round(frame / 4) * 4;
    const progress = Math.min(1, (1 - Math.max(0, Math.min(1, actor.poseMix || 0))) * 1.7);
    return (frame + Math.round((contact - frame) * progress) + 8) % 8;
  }
  function poseFor(actor, careRecord) {
    const character = characters[actor.species];
    if (!character) return null;
    const metadata = root.ParkWalkAssets?.characters[character.key];
    const job = careRecord?.job;
    const rhythm=root.ParkDance?.poseFor(actor,careRecord);
    if(rhythm)return rhythm;
    const expression=root.ParkExpressions?.poseFor(actor,careRecord);
    if(expression)return expression;
    if (metadata?.gait === 'hover') return { key: character.key, kind: 'hover', frame: 0, metadata, flip: actor.facing > 0 ? -1 : 1 };
    if (metadata?.gait === 'quadruped' && metadata.actions && job?.stage === 'doing') {
      const name = { feed: 'feed', pet: 'stand', bath: 'stand' }[job.action];
      if (name) return { key: character.key + '-actions', kind: name, frame: metadata.actions.poses[name], metadata: metadata.actions, flip: actor.facing < 0 ? -1 : 1 };
    }
    const settling = actor.state !== 'walking' && actor.poseMix > 0;
    if (metadata && (actor.state === 'walking' || settling)) {
      return { key: character.key + '-walk', kind: 'walk', frame: settling ? settleFrameFor(actor) : frameFor(actor), metadata, flip: actor.facing < 0 ? -1 : 1 };
    }
    return { key: character.key, kind: 'idle', frame: 0, metadata: metadata?.idle, flip: actor.facing > 0 ? -1 : 1 };
  }
  function mouthFor(actor, careRecord) {
    const pose = poseFor(actor, careRecord), metadata = pose?.metadata;
    const mouth = metadata?.frameData?.[pose.frame]?.mouth || metadata?.mouth;
    if (!mouth) {
      const offsets=[[12,.54],[0,.50],[4,.60],[8,.64],[28,.58],[15,.45]];
      const [x,y]=offsets[actor.species];
      return { x:actor.x+actor.facing*x,y:actor.y-liftFor(actor)-heights[actor.species]*y };
    }
    const scale = heights[actor.species] / metadata.contentHeight;
    return { x: actor.x + (mouth[0] - metadata.anchorX) * scale * pose.flip, y: actor.y - liftFor(actor) + (mouth[1] - metadata.anchorY) * scale };
  }
  function headFor(actor) {
    const offsets=[[5,.90],[5,.90],[2,.81],[3,.83],[28,.95],[4,1.0]];
    const [x,y]=offsets[actor.species];
    return { x:actor.x+actor.facing*x,y:actor.y-liftFor(actor)-heights[actor.species]*y };
  }
  function hitBounds(actor, careRecord) {
    const pose = poseFor(actor, careRecord), metadata = pose?.metadata;
    const bounds = metadata?.frameData?.[pose.frame]?.bounds || metadata?.bounds;
    if ((!['expression','dance'].includes(pose?.kind)&&![4,5].includes(actor.species)) || !bounds) return { left: actor.x - 59, right: actor.x + 59, top: actor.y - 145, bottom: actor.y + 17 };
    const scale = heights[actor.species] / metadata.contentHeight;
    const left = (bounds[0] - metadata.anchorX) * scale * pose.flip, right = (bounds[2] - metadata.anchorX) * scale * pose.flip;
    return { left: actor.x + Math.min(left, right) - 7, right: actor.x + Math.max(left, right) + 7, top: actor.y - liftFor(actor) + (bounds[1] - metadata.anchorY) * scale - 7, bottom: actor.y - liftFor(actor) + (bounds[3] - metadata.anchorY) * scale + 12 };
  }
  function draw(ctx, actor, images, snapshot) {
    let pose = poseFor(actor, snapshot?.care?.pets?.[actor.id]);
    if (!pose) return false;
    let image = images[pose.key];
    if (!image?.naturalWidth) {
      const character = characters[actor.species];
      image = images[character.key];
      if (!image?.naturalWidth) return false;
      pose = { key: character.key, kind: 'idle', frame: 0, metadata: root.ParkWalkAssets?.characters[character.key]?.idle, flip: actor.facing > 0 ? -1 : 1 };
    }
    const metadata = pose.metadata || { anchorX: image.naturalWidth / 2, anchorY: image.naturalHeight, contentHeight: image.naturalHeight };
    const scale = heights[actor.species] / metadata.contentHeight;
    const motion=pose.kind==='dance'?root.ParkDance.motionFor(actor,snapshot?.care?.pets?.[actor.id],snapshot?.time||0):{x:0,y:0};
    ctx.save(); ctx.translate(actor.x+motion.x, actor.y-liftFor(actor)+motion.y); ctx.imageSmoothingEnabled = true; ctx.rotate?.(motion.rotation||0);ctx.scale(pose.flip*(motion.scaleX||1),motion.scaleY||1);
    const face=pose.kind==='walk'?root.ParkExpressions?.faceFor(actor,snapshot?.care?.pets?.[actor.id]):null;
    const faceImage=face&&images[face.key];
    if (metadata.frameWidth) {
      const crop=metadata.frameData?.[pose.frame]?.drawBounds||[0,0,metadata.frameWidth,metadata.frameHeight],sw=crop[2]-crop[0],sh=crop[3]-crop[1];
      ctx.drawImage(image, pose.frame % metadata.columns * metadata.frameWidth+crop[0], Math.floor(pose.frame / metadata.columns) * metadata.frameHeight+crop[1],
        sw,sh,(crop[0]-metadata.anchorX)*scale,(crop[1]-metadata.anchorY)*scale,sw*scale,sh*scale);
    } else {
      ctx.drawImage(image, -metadata.anchorX * scale, -metadata.anchorY * scale, image.naturalWidth * scale, image.naturalHeight * scale);
    }
    if(faceImage?.naturalWidth){
      const m=face.metadata,s=heights[actor.species]/m.contentHeight;
      const [cx,cy,rx,ry]=[[223,223,124,96],[240,247,145,96],[210,228,83,57],[234,201,103,69],[371,234,109,94]][actor.species];
      ctx.save();ctx.scale(face.flip/pose.flip,1);
      for(const [edge,alpha]of [[1.08,.2],[1,.5],[.93,1]]){
        ctx.save();ctx.beginPath();ctx.ellipse((cx-m.anchorX)*s,(cy-m.anchorY)*s,rx*s*edge,ry*s*edge,0,0,Math.PI*2);ctx.clip();ctx.globalAlpha=alpha;
        ctx.drawImage(faceImage,face.frame%m.columns*m.frameWidth,Math.floor(face.frame/m.columns)*m.frameHeight,m.frameWidth,m.frameHeight,-m.anchorX*s,-m.anchorY*s,m.frameWidth*s,m.frameHeight*s);ctx.restore();
      }
      ctx.restore();
    }
    ctx.restore(); return true;
  }
  root.ParkMotion = { characters, strides, heights, liftFor, frameFor, settleFrameFor, poseFor, mouthFor, headFor, hitBounds, draw };
})(typeof window !== 'undefined' ? window : globalThis);
