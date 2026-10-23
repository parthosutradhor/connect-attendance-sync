const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function setup({key='test-key',response='P',http=200}={}){
  let listener,calls=[];
  const context={AttendanceCore:require('../core.js'),URL,URLSearchParams,AbortSignal,importScripts(){},
    fetch:async(url,options)=>{calls.push({url,options});return{ok:http===200,status:http,text:async()=>response};},
    chrome:{storage:{local:{setAccessLevel(){},get:async()=>({apiKey:key})}},action:{onClicked:{addListener(){}}},runtime:{id:'extension',openOptionsPage(){},onMessage:{addListener(fn){listener=fn;}}}}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../background.js'),'utf8'),context);
  const sender={id:'extension',tab:{url:'https://connect.bracu.ac.bd/app/exam-controller/attendance/entry'}};
  const message={type:'lookup',id:'12345678',course:'MAT215',date:'2026-06-10'};
  return{calls,listener,sender,message,send:(m=message)=>new Promise(resolve=>listener(m,sender,resolve))};
}
test('request uses fixed destination, encoded parameters, and no cookies',async()=>{
  const app=setup();assert.equal((await app.send()).status,'P');
  const {url,options}=app.calls[0];
  assert.equal(url.origin,'https://bracu.partho.org');
  assert.equal(url.searchParams.get('student_id'),'12345678');
  assert.equal(url.searchParams.get('date'),'2026-06-10');
  assert.equal(url.searchParams.get('api_key'),'test-key');
  assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');
});
test('missing key and malformed IDs never make requests',async()=>{
  const missing=setup({key:''});assert.match((await missing.send()).error,/API key/);assert.equal(missing.calls.length,0);
  const invalid=setup();assert.match((await invalid.send({...invalid.message,id:'bad'})).error,/Invalid/);assert.equal(invalid.calls.length,0);
});
test('HTTP errors and ambiguous responses remain errors',async()=>{
  assert.match((await setup({http:401}).send()).error,/401/);
  assert.match((await setup({response:'{"error":"missing"}'}).send()).error,/A or P/);
});
test('unrelated pages cannot perform lookups',()=>{
  const app=setup();assert.equal(app.listener(app.message,{id:'extension',tab:{url:'https://example.com'}},()=>assert.fail()),undefined);assert.equal(app.calls.length,0);
});
