const {chromium}=require('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const base=process.argv[2]||'http://127.0.0.1:8771';const errors=[];try{
 const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
 for(const [width,language] of [[360,'kz'],[390,'ru'],[768,'en'],[1024,'kz'],[1440,'ru'],[1920,'en']]){
  await page.setViewportSize({width,height:900});await page.goto(`${base}/?lang=${language}`,{waitUntil:'domcontentloaded'});
  await page.locator('[data-copy=studioStepPlan]').waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`Overflow ${width}/${language}`);
  assert.ok((await page.locator('[data-copy=studioGraphicCaption]').innerText()).trim());
  assert.equal(await page.locator('.studio-field').getAttribute('aria-hidden'),'true');
  const dimensions=await page.evaluate(()=>{const w=document.querySelector('.workspace'),h=document.querySelector('.eco-hero'),v=document.querySelector('.studio-landscape');const r=h.getBoundingClientRect(),a=v.getBoundingClientRect();return {workspace:w.clientWidth,inside:a.left>=r.left&&a.right<=r.right,layout:getComputedStyle(document.querySelector('.workspace-grid')).display};});
  assert.ok(dimensions.inside,'Hero illustration must fit inside the banner');
  if(width>=1100){assert.ok(dimensions.workspace>1100);assert.equal(dimensions.layout,'grid');}
  await page.locator('#regionSelect').selectOption('kyzylorda');await page.locator('#fieldAreaInput').fill('0.1');
  await page.locator('#cropCard_corn').click();assert.equal(await page.locator('#cropCard_corn').getAttribute('aria-checked'),'true');
  await page.locator('#summaryCard').scrollIntoViewIfNeeded();await page.locator('#btnSubmitAll').waitFor({state:'visible'});
  await page.locator('#langBtnEn').click();assert.equal(await page.locator('[data-copy=studioStepField]').innerText(),'Choose your field');
 }
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.studio-scan').evaluate(e=>getComputedStyle(e).animationName),'none');
 assert.deepEqual(errors,[]);console.log('PASS: Field Studio layout, 360–1920px, localization, inputs and reduced motion');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
