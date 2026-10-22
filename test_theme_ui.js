// Open the local or deployed site, then playwright-cli run-code --filename=frontend/test_theme_ui.js.
async page => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const base = await page.evaluate(() => location.origin + '/');
  const results = [];
  for (const width of [390,1440]) {
    await page.setViewportSize({width,height:960});
    for (const scheme of ['dark','light']) {
      await page.emulateMedia({colorScheme:scheme,reducedMotion:'reduce'});
      await page.goto(base+'?lang=ru&v=5.10.70');
      await page.waitForFunction(expected=>document.documentElement.dataset.theme===expected,scheme);
      await page.locator('[data-crop="tomato"]').click();
      for (const lang of ['kz','en','ru']) {
        await page.evaluate(lang=>setLanguage(lang),lang);
        const state=await page.evaluate(()=>({
          overflow:document.documentElement.scrollWidth>innerWidth,
          theme:document.documentElement.dataset.theme,
          controls:['.app-header','.map-panel','#fieldAreaInput','.balance-form input','.irrig-card[aria-checked="false"]','.crop-card[aria-checked="false"]','.summary-card']
            .map(selector=>{const s=getComputedStyle(document.querySelector(selector));return {selector,bg:s.backgroundColor,color:s.color,image:s.backgroundImage};})
        }));
        if(state.overflow)throw Error('Overflow '+width+' '+lang+' '+scheme);
        if(state.theme!==scheme)throw Error('Wrong theme');
        if(scheme==='dark'&&state.controls.some(x=>/rgb\((?:25[0-5]|24\d), (?:25[0-5]|24\d), (?:25[0-5]|24\d)\)/.test(x.bg+' '+x.image)))throw Error('White surface '+JSON.stringify(state));
      }
      await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
      await page.screenshot({path:`output/screenshots/theme-${scheme}-${width}.png`});
      await page.locator('#block2').scrollIntoViewIfNeeded();
      await page.screenshot({path:`output/screenshots/theme-${scheme}-${width}-controls.png`});
      results.push({width,scheme,languages:3,noOverflow:true});
    }
  }
  await page.setViewportSize({width:390,height:960});
  await page.emulateMedia({colorScheme:'dark',reducedMotion:'no-preference'});
  await page.goto(base+'?lang=ru&v=5.10.70');
  await page.evaluate(()=>{
    tg={initData:'theme-ui-test',platform:'tdesktop',HapticFeedback:{notificationOccurred(){},impactOccurred(){}}};
    window.__focusCalls=[];window.__scrollCalls=[];
    const focus=HTMLElement.prototype.focus,scroll=Element.prototype.scrollIntoView;
    HTMLElement.prototype.focus=function(options){window.__focusCalls.push({id:this.id,options});return focus.call(this,options);};
    Element.prototype.scrollIntoView=function(options){window.__scrollCalls.push({id:this.id,options});return scroll.call(this,options);};
    scrollTo({top:document.body.scrollHeight,behavior:'instant'});
  });
  const position=await page.evaluate(()=>{const before=scrollY;submitFinalCalculation();return {before,after:scrollY};});
  if(Math.abs(position.after-position.before)>2)throw Error('Validation still jumps before smooth scroll '+JSON.stringify(position));
  await page.locator('#locationPrompt').waitFor({state:'visible'});
  await page.waitForFunction(()=>document.querySelector('#locationPrompt').getBoundingClientRect().top>0&&document.querySelector('#locationPrompt').getBoundingClientRect().bottom<innerHeight);
  const behavior=await page.evaluate(()=>({focus:window.__focusCalls,scroll:window.__scrollCalls,prompt:document.querySelector('#locationPrompt').textContent}));
  if(behavior.focus[0]?.options?.preventScroll!==true||behavior.scroll[0]?.options?.behavior!=='smooth')throw Error('Focus/scroll ordering wrong '+JSON.stringify(behavior));
  for(const lang of ['kz','en','ru']) {
    await page.evaluate(lang=>setLanguage(lang),lang);
    const text=await page.locator('#locationPrompt').textContent();
    if(!text.includes(lang==='kz'?'Алқаптың':lang==='en'?'Set your':'Укажите'))throw Error('Untranslated prompt');
  }
  await page.screenshot({path:'output/screenshots/theme-location-prompt.png'});
  await page.selectOption('#regionSelect','atyrau');
  if(!await page.locator('#locationPrompt').isHidden())throw Error('Prompt not cleared after location');
  await page.evaluate(()=>{window.__focusCalls=[];window.__scrollCalls=[];document.querySelector('#fieldAreaInput').value='';submitFinalCalculation();});
  let next=await page.evaluate(()=>({focus:window.__focusCalls,scroll:window.__scrollCalls}));
  if(next.focus[0]?.id!=='fieldAreaInput'||next.focus[0]?.options?.preventScroll!==true||next.scroll[0]?.options?.behavior!=='smooth')throw Error('Area validation jumps '+JSON.stringify(next));
  await page.evaluate(()=>{window.__focusCalls=[];window.__scrollCalls=[];document.querySelector('#fieldAreaInput').value='0.1';submitFinalCalculation();});
  next=await page.evaluate(()=>({focus:window.__focusCalls,scroll:window.__scrollCalls}));
  if(next.focus[0]?.id!=='growthDay'||next.focus[0]?.options?.preventScroll!==true||next.scroll[0]?.options?.behavior!=='smooth')throw Error('Growth day validation jumps '+JSON.stringify(next));
  await page.emulateMedia({colorScheme:'light'});
  await page.waitForFunction(()=>document.documentElement.dataset.theme==='light');
  await page.emulateMedia({colorScheme:'dark'});
  await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
  if(errors.length)throw Error(JSON.stringify(errors));
  return {results,validation:behavior,liveThemeSwitch:true,errors};
}
