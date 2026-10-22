// Run in playwright-cli against a local or published Mini App.
async page => {
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.emulateMedia({colorScheme:'light',reducedMotion:'reduce'});
  await page.evaluate(()=>{localStorage.removeItem('sutech:theme:v1');});
  await page.reload();
  for(const width of [320,360,390,1440]) {
    await page.setViewportSize({width,height:960});
    for(const lang of ['ru','kz','en']) {
      await page.evaluate(lang=>setLanguage(lang),lang);
      const toggle=page.locator('#themeToggle');
      await toggle.click();
      const menu=page.locator('#themeOptions');
      await menu.waitFor({state:'visible'});
      const positions=await page.evaluate(()=>{
        const b=document.querySelector('.brand').getBoundingClientRect(),l=document.querySelector('.language-switch').getBoundingClientRect(),t=document.querySelector('#themeToggle').getBoundingClientRect(),m=document.querySelector('#themeOptions').getBoundingClientRect();
        return {overlap:b.right>l.left||l.right>t.left,overflow:document.documentElement.scrollWidth>innerWidth,menuOutside:m.left<0||m.right>innerWidth};
      });
      if(Object.values(positions).some(Boolean))throw Error('Header overlap '+width+' '+lang+' '+JSON.stringify(positions));
      if(!(await toggle.getAttribute('aria-label')).includes(lang==='ru'?'Тема':lang==='kz'?'Тақырып':'Theme'))throw Error('Untranslated theme control');
      await page.locator('[data-theme-choice="dark"]').click();
      if(await toggle.getAttribute('aria-expanded')!=='false')throw Error('Menu not closed');
      if(await page.evaluate(()=>document.documentElement.dataset.theme)!=='dark')throw Error('Manual dark failed');
      await toggle.click(); await page.locator('[data-theme-choice="light"]').click();
      if(await page.evaluate(()=>document.documentElement.dataset.theme)!=='light')throw Error('Manual light failed');
      await toggle.click(); await page.locator('[data-theme-choice="auto"]').click();
      if(await page.evaluate(()=>localStorage.getItem('sutech:theme:v1'))!==null)throw Error('Auto not restored');
    }
  }
  await page.setViewportSize({width:390,height:960});
  await page.evaluate(()=>setLanguage('ru'));
  await page.locator('#themeToggle').click();
  await page.locator('[data-theme-choice="dark"]').click();
  await page.reload();
  await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
  await page.locator('#themeToggle').click();
  await page.screenshot({path:'output/screenshots/theme-choice-dark.png'});
  await page.keyboard.press('Escape');
  if(await page.locator('#themeToggle').getAttribute('aria-expanded')!=='false')throw Error('Escape did not close');
  await page.keyboard.press('Enter');
  await page.locator('#heroTitle').click();
  if(!await page.locator('#themeOptions').isHidden())throw Error('Outside click did not close');
  await page.locator('#themeToggle').click();
  await page.locator('[data-theme-choice="auto"]').click();
  await page.emulateMedia({colorScheme:'dark'});
  await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
  await page.emulateMedia({colorScheme:'light'});
  await page.waitForFunction(()=>document.documentElement.dataset.theme==='light');
  if(errors.length)throw Error(JSON.stringify(errors));
  return {widths:4,languages:3,manualChoices:true,persistsAfterReload:true,automaticRestored:true,keyboardAndDismiss:true,errors};
}
