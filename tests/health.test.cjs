const test=require('node:test'),assert=require('node:assert/strict')
const {health}=require('../api/health.cjs')
test('health checks report dependency failure without exposing server details',async()=>{
 assert.equal((await health({ready:()=>true,query:async()=>[]})).statusCode,200)
 const failed=await health({ready:()=>true,query:async()=>{throw Error('private credentials')}})
 assert.equal(failed.statusCode,503);assert.equal(failed.body,'{"status":"unavailable"}')
 assert.equal((await health({ready:()=>false})).statusCode,503)
})
