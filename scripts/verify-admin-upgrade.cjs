const fs=require('node:fs'),assert=require('node:assert/strict')
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright')
try{process.loadEnvFile()}catch{}
const catalog=JSON.parse(fs.readFileSync('data/catalog.json','utf8'))
const host=new URL(process.env.VITE_SUPABASE_URL).hostname
const user={id:'00000000-0000-4000-8000-000000000099',email:'test@example.invalid',aud:'authenticated',role:'authenticated'}
const token='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})).toString('base64url')+'.test'
const order={id:'00000000-0000-4000-8000-000000000001',order_number:'TEST-ORDER',created_at:new Date().toISOString(),payload:{customer:{name:'Test Customer',phone:'9000000000'},items:[{name:'Test Dish',price:100,quantity:1}],meta:{orderType:'delivery',payment:'cod'},status:'placed',payment_status:'pending',subtotal:100,total:145,discount:0,delivery:40,tax:5}}
async function main(){const browser=await chromium.launch({headless:true});try{
 for(const width of [1366,390]){
 const page=await browser.newPage({viewport:{width,height:900}}),writes=[]
 page.on('pageerror',e=>console.error(e.message))
 await page.addInitScript(({key,session})=>localStorage.setItem(key,JSON.stringify(session)),{key:'sb-'+host.split('.')[0]+'-auth-token',session:{access_token:token,refresh_token:'test-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user}})
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url())
  if(url.hostname==='localhost'){if(url.pathname.startsWith('/api/'))return route.fulfill({status:503,contentType:'application/json',body:'{"error":"Test blocked live order submission"}'});return route.continue()}
  if(url.hostname!==host)return route.abort()
  const name=url.pathname.split('/').pop();let data=[]
  if(route.request().method!=='GET')writes.push({name,body:route.request().postDataJSON()})
  if(name==='admin_can')data=true
  if(name==='storefront')data={data:catalog,revision:1}
  if(name==='order_requests')data=[order]
  if(name==='order_admin_details')data={notes:'',delivery_staff_id:null}
  if(name==='delivery_staff')data=[{id:'00000000-0000-4000-8000-000000000002',name:'Test Driver'}]
  if(name==='set_order_status'){order.payload.status=route.request().postDataJSON().p_status;data=null}
  if(name==='admin_sales_report')data={orders:1,revenue:100,cancelled:0,refunded:0,average:100,daily:[{day:'2026-09-10',orders:1,revenue:100}],products:[],methods:[],coupons:[]}
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)})
 })
 order.payload.status='placed'
 await page.goto('http://localhost:5173/admin/orders')
 await page.getByRole('button',{name:'Details, notes & delivery'}).click()
 await page.getByLabel('Internal notes').fill('Test note')
 await page.getByLabel('Delivery person').selectOption('00000000-0000-4000-8000-000000000002')
 await page.getByRole('button',{name:'Save details',exact:true}).click()
 await page.getByText('Order notes and assignment saved.').waitFor()
 assert.ok(writes.some(w=>w.name==='order_admin_details'&&w.body?.notes==='Test note'))
 page.once('dialog',d=>d.accept('Customer requested cancellation'))
 await page.getByRole('button',{name:'Cancel order',exact:true}).click()
 await page.getByText('No matching orders.').waitFor()
 assert.ok(writes.some(w=>w.name==='set_order_status'&&w.body?.p_reason==='Customer requested cancellation'))
 order.payload.status='ready'
 await page.goto('http://localhost:5173/admin/delivery')
 await page.getByRole('heading',{name:'Delivery dispatch',exact:true}).waitFor()
 await page.getByRole('button',{name:'Dispatch order',exact:true}).click()
 await page.getByRole('button',{name:/On the way/}).click()
 await page.getByRole('button',{name:'Mark delivered',exact:true}).waitFor()
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
 await page.goto('http://localhost:5173/admin/reports')
 await page.getByRole('button',{name:'Generate report',exact:true}).click()
 await page.getByRole('heading',{name:'Daily collections',exact:true}).waitFor()
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
 console.log(width+': admin notes, delivery assignment, cancellation reason, report rendering and responsive layout passed (intercepted database).')
 await page.close()
 }
}finally{await browser.close()}}
main().catch(e=>{console.error(e.message);process.exitCode=1})
