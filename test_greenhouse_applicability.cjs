// The real form must transmit greenhouse limits even for the separate rice routine.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const nodes=new Map();
const element=id=>{
 if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',hidden:false,addEventListener(){},
  classList:{toggle(name,on){this[name]=on;}},removeAttribute(){},setAttribute(){}});
 return nodes.get(id);
};
const window={};
const context=vm.createContext({window,document:{getElementById:element,querySelectorAll:()=>[]},Date,Event});
vm.runInContext(fs.readFileSync(path.join(__dirname,'js/balance.js'),'utf8'),context);
for(const [key,value] of Object.entries({soilType:'loam',moistureCondition:'dry',growthDay:'20',
 greenhouseMedium:'substrate',greenhouseHeated:'yes',greenhouseEt0:'2.5'}))element(key).value=value;
window.SuBalance.sync('rice','greenhouse','en');
assert.equal(element('greenhouseBalance').classList.hidden,false,'rice must show greenhouse applicability controls');
const payload=window.SuBalance.payload();
assert.ok(payload,'valid form must produce a payload');
assert.deepEqual([payload.greenhouse_medium,payload.greenhouse_heated,payload.greenhouse_et0],['substrate','yes',2.5]);
window.SuBalance.sync('rice','open','en');
assert.equal(element('greenhouseBalance').classList.hidden,true);
assert.equal(window.SuBalance.payload().greenhouse_medium,undefined,'open fields do not transmit hidden greenhouse values');
console.log('PASS: rice greenhouse controls and payload');
