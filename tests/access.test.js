import test from 'node:test';
import assert from 'node:assert/strict';
// Pure allocation policy shared by registration and visit controls.
const {allocationIssue}=await import('../src/access-policy.js');
test('unapproved users are blocked and free access is one patient, three visits',()=>{
 const access={approved:false,patient_limit:1,visit_limit:3};assert.match(allocationIssue(access,[]),/승인/);access.approved=true;assert.equal(allocationIssue(access,[]),'');
 const docs=[{id:'p',archived:true,visits:[{},{},{}]}];assert.match(allocationIssue(access,docs),/1명/);assert.match(allocationIssue(access,docs,'p'),/3회차/);
 access.patient_limit=2;access.visit_limit=5;assert.equal(allocationIssue(access,docs),'');assert.equal(allocationIssue(access,docs,'p'),'');
});
