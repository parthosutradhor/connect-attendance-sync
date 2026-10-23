const {test}=require('node:test');
const assert=require('node:assert/strict');
const core=require('../core.js');
test('class dates use day-month-year without timezone shifts',()=>{
  assert.equal(core.date('Regular Class - 10-06-2026 02:00 PM - 03:20 PM'),'2026-06-10');
  assert.equal(core.date('29-02-2024'),'2024-02-29');
  assert.throws(()=>core.date('29-02-2026'));
  assert.throws(()=>core.date('31-04-2026'));
  assert.throws(()=>core.date('Class'));
});
test('extract course code rather than title or section',()=>{
  assert.equal(core.course('MAT215 - MATHEMATICS III: COMPLEX VARIABLES & LAPLACE TRANSFORMATIONS'),'MAT215');
  assert.equal(core.course('mat 216 - Mathematics'),'MAT216');
  assert.throws(()=>core.course('Course'));
});
test('only explicit A/P results can change attendance',()=>{
  for(const body of ['P','"P"','{"status":"P"}','{"data":{"status":"P"}}'])assert.equal(core.status(body),'P');
  assert.equal(core.status(' A\n'),'A');
  for(const body of ['','null','true','{"error":"not found"}','<html>Error</html>','Present','{"status":"unknown"}'])assert.throws(()=>core.status(body));
});
