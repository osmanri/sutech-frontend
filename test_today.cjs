const { chromium } = require('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

(async()=>{
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const errors=[];const base=process.argv[2]||'http://127.0.0.1:8771';
  const fixture=()=>[
    {id:1,name:'Тестовый участок',crop:'tomato',area_ha:.1,status:'critical',date:'2026-10-03',timezone:'Asia/Qyzylorda',deficit:20,threshold:8,raw:16,volume_m3:22.222222,rain_mm:0,etc_mm:4},
    {id:2,name:'',crop:'corn',area_ha:2,status:'deferred',date:'2026-10-03',timezone:'Asia/Qyzylorda',deficit:3,threshold:8,raw:20,volume_m3:0,rain_mm:8,etc_mm:4}
  ];
  try{
    for(const [width,lang] of [[1440,'ru'],[390,'ru'],[360,'kz'],[390,'en']]){
      const page=await browser.newPage({viewport:{width,height:900}});page.on('pageerror',e=>errors.push(e.message));
      let cards=fixture(),post=null,calls=0,waterCalls=0,fail=false,conflict=false;
      let release;const firstLoad=new Promise(resolve=>release=resolve);
      await page.route('**/telegram.org/js/telegram-web-app.js',route=>route.fulfill({body:'',contentType:'application/javascript'}));
      await page.addInitScript(()=>{window.Telegram={WebApp:{initData:'isolated-test-auth',ready(){},expand(){},close(){},openTelegramLink(){}}};});
      await page.route('**/api/fields/today',async route=>{
        calls++;assert.equal(route.request().postDataJSON().init_data,'isolated-test-auth');
        if(calls===1)await firstLoad;
        await route.fulfill({status:fail?503:200,json:fail?{}:{ok:true,fields:cards}});
      });
      await page.route('**/api/fields/water',async route=>{
        waterCalls++;post=route.request().postDataJSON();
        if(conflict){await route.fulfill({status:409,json:{ok:false,error:'balance_changed'}});return;}
        cards[0]={...cards[0],status:'deferred',deficit:0,volume_m3:0};
        await route.fulfill({json:{ok:true,field:cards[0]}});
      });
      await page.goto(`${base}/?lang=${lang}`,{waitUntil:'domcontentloaded'});
      await page.locator('#todayPanel[aria-busy=true]').waitFor();
      assert.equal(await page.locator('.today-empty').count(),0);
      release();
      await page.locator('.today-card').first().waitFor();
      assert.equal(await page.locator('.today-card').count(),2);
      assert.equal(await page.locator('.today-card button').count(),1);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      assert.ok(await page.locator('#todayTitle').innerText());
      await page.locator('#todayPanel').scrollIntoViewIfNeeded();
      fs.mkdirSync('output/screenshots',{recursive:true});
      await page.locator('#todayPanel').screenshot({path:`output/screenshots/today-fixture-${width}-${lang}.png`});
      await page.locator('.today-card button').click();
      await page.locator('#waterDialog[open]').waitFor();
      await page.locator('#waterVolume').fill('1');
      await page.locator('#waterCancel').click();assert.equal(waterCalls,0);
      await page.locator('.today-card button').click();
      await page.locator('#waterSave').click();
      await page.waitForFunction(()=>!document.getElementById('waterDialog').open);
      assert.equal(waterCalls,1);assert.equal(post.field_id,1);assert.equal(post.expected_deficit,20);
      assert.equal(await page.locator('.today-card button').count(),0);
      assert.equal(await page.locator('#todayRefresh').isDisabled(),false);
      cards=fixture();await page.locator('#todayRefresh').click();await page.locator('.today-card button').waitFor();
      conflict=true;await page.locator('.today-card button').click();await page.locator('#waterSave').click();
      await page.waitForFunction(()=>!document.getElementById('waterDialog').open&&!document.getElementById('todayRefresh').disabled);
      assert.equal(calls,3);assert.ok((await page.locator('#todayState').innerText()).length>20);
      fail=true;await page.locator('#todayRefresh').click();await page.waitForFunction(()=>!document.getElementById('todayRefresh').disabled);
      assert.equal(await page.locator('.today-card').count(),0);
      fail=false;cards=[];await page.locator('#todayRefresh').click();await page.locator('.today-empty').waitFor();
      assert.equal(await page.locator('.today-empty a').getAttribute('href'),'#block1');
      await page.close();
    }
    const page=await browser.newPage({viewport:{width:390,height:850}});
    let requests=0;
    await page.route('**/api/fields/**',r=>{requests++;return r.abort();});
    await page.goto(`${base}/?lang=kz`,{waitUntil:'domcontentloaded'});
    await page.locator('.today-empty').waitFor();
    assert.equal(await page.locator('#todayRefresh').isVisible(),false);
    assert.equal(await page.locator('.today-empty a').getAttribute('href'),'https://t.me/Su_Tech_bot?start=app_kz');
    await page.locator('#langBtnEn').click();
    assert.equal(await page.locator('.today-empty a').getAttribute('href'),'https://t.me/Su_Tech_bot?start=app_en');
    assert.equal(await page.locator('#todayTitle').innerText(),'My fields today');
    assert.equal(requests,0);
    await page.locator('#todayPanel').screenshot({path:'output/screenshots/today-public-mobile.png'});
    assert.deepEqual(errors,[]);
    console.log('PASS: desktop/mobile, RU/KZ/EN, irrigation confirmation/cancel, conflict refresh, failures, empty state, public login and no overflow');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
