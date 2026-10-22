// Run in playwright-cli against either the preview or published Mini App.
async page => {
  await page.setViewportSize({width:390,height:960});
  await page.emulateMedia({reducedMotion:'no-preference'});
  const snapshots = {};
  for (const theme of ['light','dark']) {
    await page.emulateMedia({colorScheme:theme});
    await page.waitForFunction(t=>document.documentElement.dataset.theme===t,theme);
    await page.locator('#fieldTypeBtn_open').click();
    await page.locator('#salinityBtn_no').click();
    await page.mouse.move(0,0);
    await page.waitForFunction(()=>!document.querySelector('.segmented-toggle__indicator').getAnimations().some(a=>a.playState==='running'));
    snapshots[theme] = await page.evaluate(()=>{
      const motion = e => {
        const properties=['animationName','animationDuration','animationDelay','animationTimingFunction','animationIterationCount','transitionProperty','transitionDuration','transitionDelay','transitionTimingFunction','borderRadius','borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth'];
        return [null,'::before','::after'].map(p=>{const s=getComputedStyle(e,p);return Object.fromEntries(properties.map(k=>[k,s[k]]));});
      };
      const controls=[...document.querySelectorAll('.segmented-toggle button,.language-switch button,.gps-button,.hero-cta,.submit-button,.crop-card,.irrig-card')];
      const layers=[...document.querySelectorAll('#block3 .segmented-toggle button,.basemap-switch button')].map(e=>{
        const s=getComputedStyle(e);return {id:e.id,fill:s.backgroundColor,image:s.backgroundImage,border:s.borderTopColor,shadow:s.boxShadow};
      });
      return {motion:controls.map(e=>({id:e.id||e.className,motion:motion(e)})),layers};
    });
    for (const layer of snapshots[theme].layers) {
      if(layer.fill!=='rgba(0, 0, 0, 0)'||layer.image!=='none'||layer.border!=='rgba(0, 0, 0, 0)'||layer.shadow!=='none')
        throw Error('Separate button frame covers sliding indicator in '+theme+': '+JSON.stringify(layer));
    }
    const indicator=page.locator('#fieldTypeBtn_greenhouse').locator('..').locator('.segmented-toggle__indicator');
    const initial=await indicator.evaluate(e=>getComputedStyle(e).transform);
    await page.locator('#fieldTypeBtn_greenhouse').click();
    const moving=await indicator.evaluate(e=>({transform:getComputedStyle(e).transform,duration:getComputedStyle(e).transitionDuration,animations:e.getAnimations().length}));
    if(moving.animations===0||!moving.duration.includes('0.46s'))throw Error('Sliding selection missing in '+theme+': '+JSON.stringify(moving));
    await indicator.evaluate(async e=>{await Promise.all(e.getAnimations().map(a=>a.finished));});
    if(initial===await indicator.evaluate(e=>getComputedStyle(e).transform))throw Error('Indicator did not move in '+theme);
    await page.screenshot({path:`output/screenshots/theme-motion-${theme}.png`});
  }
  if(JSON.stringify(snapshots.light.motion)!==JSON.stringify(snapshots.dark.motion))throw Error('Motion or button geometry differs between themes');
  return {sameMotion:true,sameButtonGeometry:true,transparentLayers:true,slidingBothThemes:true};
}
