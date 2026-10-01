const assert = require('node:assert/strict');
const {createHandler} = require('./api/weather.js');
const now = Date.parse('2026-10-01T15:00:00Z');
const fixture = () => ({utc_offset_seconds:18000,timezone:'Asia/Qyzylorda',
  daily_units:{et0_fao_evapotranspiration:'mm',precipitation_sum:'mm'},
  daily:{time:['2026-10-01'],et0_fao_evapotranspiration:[4.06],precipitation_sum:[0]}});
const response = () => ({headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(value){this.body=value;return this;}});
const req = {method:'GET',query:{latitude:'44.85',longitude:'65.5'}};
(async()=>{
  let calls=0,clock=now;
  const handler=createHandler(async url=>{calls++;assert.equal(url.hostname,'api.open-meteo.com');return {ok:true,json:async()=>fixture()};},()=>clock);
  const res=response(); await handler(req,res); assert.equal(res.code,200);assert.equal(res.body.daily.et0_fao_evapotranspiration[0],4.06);
  await handler(req,response());assert.equal(calls,1,'Repeated weather must use cache');
  for (const q of [{latitude:'NaN',longitude:'65'},{latitude:'',longitude:'65'},{latitude:['44'],longitude:'65'},{latitude:'91',longitude:'65'}]) {
    const out=response();await handler({...req,query:q},out);assert.equal(out.code,400);
  }
  assert.equal(calls,1,'Invalid inputs must never reach provider');
  let out=response();await handler({...req,method:'POST'},out);assert.equal(out.code,405);
  clock+=900001;await handler(req,response());assert.equal(calls,2,'Expired weather must refresh');
  for (const data of [{...fixture(),daily:{...fixture().daily,time:['2000-01-01']}},
      {...fixture(),daily:{...fixture().daily,et0_fao_evapotranspiration:[null]}},
      {...fixture(),daily_units:{precipitation_sum:'inch'}}]) {
    out=response();await createHandler(async()=>({ok:true,json:async()=>data}),()=>now)(req,out);
    assert.equal(out.code,503);assert.equal(out.headers['Cache-Control'],'no-store');
  }
  out=response();await createHandler(async()=>({ok:false}),()=>now)(req,out);assert.equal(out.code,503);
  console.log('PASS: weather validation, caching, expiry, methods and provider failures');
})().catch(e=>{console.error(e);process.exitCode=1;});
