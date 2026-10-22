// Open the app with playwright-cli, then run-code --filename=frontend/test_button_motion.js.
async page => {
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.setViewportSize({width:1280,height:900});
 const gps=page.locator('.gps-button');await gps.scrollIntoViewIfNeeded();await page.mouse.move(0,0);
 await gps.evaluate(async el=>{for(let node=el;node;node=node.parentElement)await Promise.all(node.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));});
 const baseFill=await gps.evaluate(el=>getComputedStyle(el).backgroundImage);
 const frames=await Promise.all([
  page.evaluate(()=>new Promise(resolve=>{const frames=[],start=performance.now(),el=document.querySelector('.gps-button');function sample(){const r=el.getBoundingClientRect();frames.push({x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height});if(performance.now()-start<650)requestAnimationFrame(sample);else resolve(frames);}requestAnimationFrame(sample);})),
  gps.hover()
 ]).then(x=>x[0]);
 const span=key=>Math.max(...frames.map(x=>x[key]))-Math.min(...frames.map(x=>x[key]));
 const drift={x:span('x'),y:span('y'),width:span('width'),height:span('height')};
 if(Object.values(drift).some(x=>x>.5))throw new Error('GPS moves while hovering: '+JSON.stringify(drift));
 if(!baseFill.includes('linear-gradient')||await gps.evaluate(el=>getComputedStyle(el).backgroundImage)!==baseFill)throw new Error('GPS hover replaces its gradient with a legacy fill');
 const shine=await gps.evaluate(el=>{const c=getComputedStyle(el,'::after');return {name:c.animationName,iterations:c.animationIterationCount,duration:c.animationDuration};});
 if(shine.name!=='su-button-sheen'||shine.iterations!=='1')throw new Error('Expected one passing sheen: '+JSON.stringify(shine));
 if(await gps.evaluate(el=>getComputedStyle(el,'::after').pointerEvents)!=='none')throw new Error('Shine intercepts button input');
 for(let i=0;i<8;i++){await page.mouse.move(0,0);await gps.hover();await page.evaluate(()=>new Promise(requestAnimationFrame));}
 await page.mouse.move(0,0);
 await gps.evaluate(el=>el.disabled=true);await gps.hover({force:true});
 if(await gps.evaluate(el=>getComputedStyle(el,'::after').animationName)!=='none')throw new Error('Disabled GPS animates');
 await gps.evaluate(el=>el.disabled=false);
 await gps.evaluate(el=>el.setAttribute('aria-busy','true'));await page.mouse.move(0,0);await gps.hover();
 if(await gps.evaluate(el=>getComputedStyle(el,'::after').animationName)!=='none')throw new Error('Busy GPS animates');
 await gps.evaluate(el=>el.removeAttribute('aria-busy'));
 await page.emulateMedia({reducedMotion:'reduce'});await page.mouse.move(0,0);await gps.hover();
 if(await gps.evaluate(el=>getComputedStyle(el,'::after').animationName)!=='none')throw new Error('Reduced motion is ignored');
 return {gpsStable:true,singleShine:true,rapidHover:true,disabledSafe:true,busySafe:true,reducedMotion:true,drift};
}
