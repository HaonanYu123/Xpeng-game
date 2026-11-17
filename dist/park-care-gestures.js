'use strict';
(function (root) {
  const clamp = value => Math.max(0, Math.min(1, value));
  const ease = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
  const foodColors = ['#bd8a48', '#8ac8ae', '#e49c54', '#d7a455', '#c68d49', '#79d9d3'];
  const foodWidths = [18, 17, 30, 22, 30, 36];

  // Small servings, with enough room for the fingers beyond the food and below the eyes.
  const servings = {
    0: { reach:12, y:6, gripX:14, gripY:2, handWidth:56 },
    1: { reach:12, y:2, gripX:36, gripY:12, handWidth:54 },
    3: { reach:13, y:3, gripX:16, gripY:3, handWidth:56 },
    4: { reach:18, y:2, gripX:18, gripY:4, handWidth:58 }
  };

  function planFor(actor, record) {
    const job = record?.job;
    if (!job || job.stage !== 'doing' || !['feed', 'pet'].includes(job.action)) return null;
    const duration = Number.isFinite(job.duration) && job.duration > 0 ? job.duration : 3.2;
    const progress = clamp((job.elapsed || 0) / duration);
    const enter = ease(progress / .22), exit = ease((progress - .82) / .18);
    const opacity = Math.min(1, progress / .05, (1 - progress) / .10);
    const direction = actor.facing < 0 ? -1 : 1;
    if (job.action === 'pet') {
      const head = root.ParkMotion.headFor(actor);
      const stroke = clamp((progress - .22) / .58) * Math.PI * 4;
      return {
        action: 'pet', progress, opacity, direction,
        touching: progress >= .22 && progress <= .82,
        hand: { x: head.x + direction * ((1-enter)*40 + exit*38 + Math.sin(stroke)*12), y: head.y - (1-enter)*52 - exit*48 + Math.sin(stroke*2)*2 },
        angle: Math.sin(stroke) * .06
      };
    }
    const mouth = root.ParkMotion.mouthFor(actor, record);
    const remaining = progress < .4 ? 1 : progress < .6 ? .67 : progress < .8 ? .36 : 0;
    const serving=servings[actor.species];
    if(serving){
      const food={x:mouth.x+direction*(serving.reach-(1-remaining)*3.5+(1-enter)*90+exit*65),y:mouth.y+serving.y+(1-enter)*14+exit*15};
      return {action:'feed',progress,opacity,direction,mouth,food,
        hand:{x:food.x+direction*serving.gripX,y:food.y+serving.gripY},
        foodAngle:0,handWidth:serving.handWidth,handAngle:.04,remaining,
        bite:remaining===1?0:remaining===.67?1:remaining===.36?2:3,charging:false};
    }
    const biteAdvance = actor.species === 5 ? 0 : (1 - remaining) * (actor.species === 2 ? 4 : 20);
    const rabbit=actor.species===2,foodAngle=rabbit ? .18 : 0;
    // The carrot's tip meets the lip; the stem and smaller glove stay outside the face.
    const food = { x: mouth.x + direction * ((rabbit?16:10) - biteAdvance + (1-enter)*90 + exit*65), y: mouth.y + (rabbit?3+(1-enter)*12:-(1-enter)*20) + exit*15 };
    const grip=rabbit?22*foodWidths[2]/48:foodWidths[actor.species]*.30;
    return {
      action: 'feed', progress, opacity, direction, mouth, food,
      hand: { x: food.x + direction * grip*Math.cos(foodAngle), y: food.y + (rabbit?grip*Math.sin(foodAngle):1) },
      foodAngle,handWidth:rabbit?64:88,handAngle:rabbit ? .08 : 0,
      remaining: actor.species === 5 ? 1 : remaining,
      bite: remaining === 1 ? 0 : remaining === .67 ? 1 : remaining === .36 ? 2 : 3,
      charging: actor.species === 5 && progress >= .22 && progress <= .82
    };
  }
  function ellipse(ctx, x, y, rx, ry, color) {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
  }
  function roundRect(ctx, x, y, width, height, radius, color) {
    ctx.beginPath(); ctx.roundRect(x, y, width, height, radius); ctx.fillStyle = color; ctx.fill();
  }
  function drawHand(ctx, key, position, width, direction, opacity, angle, images) {
    const asset = root.ParkCareProps?.[key], image = images?.[key];
    if (!asset || !image?.naturalWidth) return;
    const scale = width / asset.contentWidth;
    ctx.save(); ctx.translate(position.x, position.y); ctx.rotate(angle * direction); ctx.scale(scale * direction, scale); ctx.globalAlpha = opacity;
    ctx.drawImage(image, -asset.contact[0], -asset.contact[1], asset.width, asset.height); ctx.restore();
  }
  function foodShape(ctx, species, images) {
    if (species === 0) {
      ctx.beginPath();
      for (let index = 0; index < 32; index++) {
        const angle = index * Math.PI / 16, radius = index % 2 ? 20 : 22;
        const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
        if (index) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.closePath(); ctx.fillStyle = '#dda85b'; ctx.fill(); ctx.strokeStyle = '#b78947'; ctx.lineWidth = 1; ctx.stroke();
      for (const [x,y] of [[0,0],[-10,-7],[9,-9],[-9,10],[10,9]]) ellipse(ctx,x,y,1.8,1.8,'#a5783c');
      ellipse(ctx,-5,-14,3.5,1.5,'#f1d5a3'); ellipse(ctx,7,15,3.5,1.5,'#f1d5a3');
    }
    if (species === 1) {
      const fill = ctx.createLinearGradient(-18,-22,18,22); fill.addColorStop(0,'#e1f2cf'); fill.addColorStop(1,'#89c9af');
      ctx.beginPath(); ctx.moveTo(0,-24); ctx.bezierCurveTo(-5,-12,-25,2,-19,15); ctx.bezierCurveTo(-14,28,18,28,21,11); ctx.bezierCurveTo(23,-1,7,-17,0,-24); ctx.fillStyle=fill;ctx.fill();
      ellipse(ctx,-7,1,3,9,'#f1ffdfb0');
    }
    if (species === 2) {
      // One small carrot, tip to the left and leafy stem held on the right.
      ctx.beginPath();ctx.moveTo(-24,0);ctx.quadraticCurveTo(-9,-8,15,-7);
      ctx.quadraticCurveTo(24,0,15,7);ctx.quadraticCurveTo(-9,8,-24,0);ctx.closePath();
      ctx.fillStyle='#eaa153';ctx.fill();ctx.strokeStyle='#c48242';ctx.lineWidth=1.2;
      for(const x of [-7,2,10]){ctx.beginPath();ctx.moveTo(x,-4);ctx.lineTo(x-2,1);ctx.stroke();}
      ctx.save();ctx.translate(18,0);ctx.rotate(-.35);ellipse(ctx,5,-3,3,8,'#8da36a');ctx.restore();
      ctx.save();ctx.translate(18,0);ctx.rotate(.5);ellipse(ctx,5,2,3,7,'#a3b477');ctx.restore();
    }
    if (species === 3) {
      ellipse(ctx,0,3,23,8,'#c69351');ellipse(ctx,0,0,23,7,'#e6ba72');
      ellipse(ctx,0,-1,13,4,'#c38c3f');roundRect(ctx,-5,-8,10,6,2,'#f5dc8b');
    }
    if (species === 4) {
      const asset=root.ParkCareProps?.['care-dog-biscuit'],image=images?.['care-dog-biscuit'];
      if(asset&&image?.naturalWidth){const scale=48/asset.contentWidth;ctx.drawImage(image,-asset.width*scale/2,-asset.height*scale/2,asset.width*scale,asset.height*scale);}
    }
    if (species === 5) {
      roundRect(ctx,-22,-14,44,28,8,'#d7ddd4');roundRect(ctx,-13,-11,27,22,5,'#6b9a99');roundRect(ctx,-10,-9,21,18,4,'#81e2d5');
      roundRect(ctx,-25,-7,4,14,2,'#cbb980');roundRect(ctx,21,-7,4,14,2,'#cbb980');roundRect(ctx,-6,-7,4,14,2,'#d5fff1');
    }
  }
  function drawFood(ctx, actor, plan, images) {
    if (plan.remaining <= 0) return;
    const scale = foodWidths[actor.species] / 48;
    ctx.save(); ctx.translate(plan.food.x,plan.food.y); ctx.scale(plan.direction*scale,scale); ctx.rotate(plan.foodAngle||0); ctx.globalAlpha=plan.opacity;
    if (actor.species !== 5 && plan.remaining < 1) {
      const edge=-25+(1-plan.remaining)*50;
      ctx.beginPath();ctx.moveTo(edge,-28);ctx.lineTo(28,-28);ctx.lineTo(28,28);ctx.lineTo(edge,28);
      for(let y=28;y>-28;y-=8)ctx.quadraticCurveTo(edge+4,y-4,edge,y-8);
      ctx.closePath();ctx.clip();
    }
    foodShape(ctx,actor.species,images);ctx.restore();
  }
  function drawServingSpoon(ctx,plan){
    ctx.save();ctx.globalAlpha=plan.opacity;ctx.strokeStyle='#a2bdbc';ctx.lineWidth=3;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(plan.food.x+plan.direction*5,plan.food.y+10);ctx.lineTo(plan.hand.x,plan.hand.y);ctx.stroke();
    ellipse(ctx,plan.food.x,plan.food.y+10,11,4,'#a2bdbc');ellipse(ctx,plan.food.x,plan.food.y+8.7,8.5,2.7,'#e7f1e4');ctx.restore();
  }
  function drawFeed(ctx,actor,plan,images) {
    drawHand(ctx,'care-hand-offer',plan.hand,plan.handWidth,plan.direction,plan.opacity,plan.handAngle,images);
    if(actor.species===1)drawServingSpoon(ctx,plan);
    drawFood(ctx,actor,plan,images);
    if(actor.species===5&&plan.charging){
      ctx.save();ctx.strokeStyle='#a4efda';ctx.lineWidth=2;ctx.globalAlpha=.65;
      ctx.beginPath();ctx.ellipse(plan.mouth.x,plan.mouth.y,28,22,0,0,Math.PI*2);ctx.stroke();ctx.restore();
    }
    if(actor.species!==5&&plan.bite>0&&plan.progress<.9){
      for(let index=0;index<4;index++){
        const phase=(plan.progress*4+index*.23)%1;
        ctx.save();ctx.globalAlpha=(1-phase)*.85;
        ellipse(ctx,plan.mouth.x+plan.direction*(7+index*3),plan.mouth.y+5+phase*22,1.7+index%2,1.7,foodColors[actor.species]);ctx.restore();
      }
    }
  }
  function draw(ctx,actor,record,images) {
    const plan=planFor(actor,record);
    if(!plan)return;
    if(plan.action==='pet')drawHand(ctx,'care-hand-pat',plan.hand,92,plan.direction,plan.opacity,plan.angle,images);
    else drawFeed(ctx,actor,plan,images);
  }
  root.ParkCareGestures = { draw, planFor };
})(typeof window !== 'undefined' ? window : globalThis);
