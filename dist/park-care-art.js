'use strict';
(function (root) {
  function ellipse(ctx, x, y, rx, ry, color) {
    ctx.beginPath(); ctx.fillStyle = color; ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  }
  function heart(ctx, x, y, size) {
    ctx.beginPath(); ctx.moveTo(x, y + size * .75);
    ctx.bezierCurveTo(x - size * 1.7, y - size * .3, x - size * .8, y - size * 1.35, x, y - size * .55);
    ctx.bezierCurveTo(x + size * .8, y - size * 1.35, x + size * 1.7, y - size * .3, x, y + size * .75);
    ctx.fillStyle = '#dda4b6'; ctx.fill();
  }
  function draw(ctx, actor, record, time, images) {
    if (!record) return;
    const height = root.ParkMotion.heights[actor.species], job = record.job;
    const bodyY = actor.y - root.ParkMotion.liftFor(actor);
    ctx.save();
    if (job?.stage === 'doing') {
      if(root.ParkCareGestures)root.ParkCareGestures.draw(ctx,actor,record,images);
      if (job.action === 'bath') {
        for (let index = 0; index < 9; index++) {
          const phase = (job.elapsed * .3 + index * .117) % 1;
          const x = actor.x + Math.sin(index * 2.3 + phase) * 52, y = bodyY - phase * (height + 22);
          ellipse(ctx, x, y, 8 + index % 3 * 3, 8 + index % 3 * 3, '#eaf9f6a8');
          ellipse(ctx, x - 3, y - 4, 2.5, 2.5, '#ffffffc9');
        }
        for (let index = 0; index < 5; index++) ellipse(ctx, actor.x - 34 + index * 17, bodyY - 3, 13, 8, '#edf8e7cc');
      }
      if (job.action === 'pet') {
        const phase=job.elapsed/job.duration;
        if(phase>.22&&phase<.85)for(let index=0;index<3;index++){
          const head=root.ParkMotion.headFor(actor);
          heart(ctx,head.x-35+index*35,head.y-21-Math.sin(phase*4+index)*8,5.5);
        }
      }
    }
    if(root.ParkDance)root.ParkDance.draw(ctx,actor,record);
    ctx.restore();
  }
  root.ParkCareArt = { draw };
})(typeof window !== 'undefined' ? window : globalThis);
