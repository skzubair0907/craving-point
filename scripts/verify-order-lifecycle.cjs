// Isolated browser lifecycle test: all database and order requests stay in memory.
const fs=require('node:fs'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto')
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright')
const {handle}=require('../api/service.cjs')
try{process.loadEnvFile()}catch{}
const catalog=JSON.parse(fs.readFileSync('data/catalog.json','utf8'))
catalog.restaurantSettings.online_ordering_enabled=true
catalog.restaurantSettings.delivery_available=true
catalog.restaurantSettings.pickup_available=true
const host=new URL(process.env.VITE_SUPABASE_URL).hostname
const user={id:randomUUID(),email:'test@example.invalid',aud:'authenticated',role:'authenticated'}
const token='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})).toString('base64url')+'.test'
const rows=[],details=new Map(),history=[],errors=[]
const repo={catalog:async()=>structuredClone(catalog),find:async(field,value)=>rows.find(r=>r[field]===value),insert:async row=>{const saved={...row,id:randomUUID(),created_at:new Date().toISOString()};rows.push(saved);return saved},review:async()=>{}}
let failNext=false
async function routes(context){await context.route('**/*',async route=>{
 const request=route.request(),url=new URL(request.url());let result=[]
 if(url.hostname==='localhost'){
  if(!url.pathname.startsWith('/api/'))return route.continue()
  if(url.pathname.endsWith('/paymentConfig'))return route.fulfill({json:{onlineAvailable:false}})
  try{if(failNext&&url.pathname.endsWith('/createOrder')){failNext=false;throw Error('Test service temporarily unavailable')}
   result=await handle(url.pathname.split('/').pop(),request.postDataJSON(),{repo,local:true})
   return route.fulfill({json:result})
  }catch(e){return route.fulfill({status:e.statusCode||503,json:{error:e.message}})}
 }
 if(url.hostname!==host)return route.abort()
 if(request.method()==='OPTIONS')return route.fulfill({status:200,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'},body:''})
 const name=url.pathname.split('/').pop(),body=request.method()==='GET'?null:request.postDataJSON()
 if(name==='admin_can')result=true
 if(name==='storefront')result={data:catalog,revision:1}
 if(name==='order_requests')result=rows.slice().reverse()
 if(name==='order_admin_details'){if(body){details.set(body.order_id,body);result=body}else result=details.get(url.searchParams.get('order_id')?.replace('eq.',''))||null}
 if(name==='order_history')result=history.filter(h=>h.order_id===url.searchParams.get('order_id')?.replace('eq.',''))
 if(name==='set_order_status'){const row=rows.find(r=>r.id===body.p_id);row.payload.status=body.p_status;history.push({id:randomUUID(),order_id:row.id,status:body.p_status,reason:body.p_reason,created_at:new Date().toISOString()});result=null}
 if(name==='record_cash_collection'){rows.find(r=>r.id===body.p_id).payload.payment_status='paid';result=null}
 return route.fulfill({json:result})
})}
async function main(){const browser=await chromium.launch({headless:true});try{
 const adminContext=await browser.newContext({viewport:{width:1366,height:900}});await routes(adminContext)
 await adminContext.addInitScript(({key,session})=>localStorage.setItem(key,JSON.stringify(session)),{key:'sb-'+host.split('.')[0]+'-auth-token',session:{access_token:token,refresh_token:'test-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user}})
 const admin=await adminContext.newPage();admin.on('pageerror',e=>errors.push(e.message));await admin.goto('http://localhost:5173/admin/orders');await admin.getByText('No matching orders.').waitFor()
 for(const [type,width] of [['delivery',1366],['pickup',390]]){
  const context=await browser.newContext({viewport:{width,height:900}});await routes(context)
  const item=catalog.menuItems.find(i=>i.is_available&&!i.deleted_at&&!i.price_variants?.length)
  await context.addInitScript(item=>{if(!sessionStorage.getItem('seeded')){localStorage.setItem('craving-point-cart',JSON.stringify([{...item,quantity:1}]));sessionStorage.setItem('seeded','1')}},item)
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost:5173/checkout')
  await page.getByRole('heading',{name:'Complete Your Order'}).waitFor()
  await page.getByRole('button',{name:'Place Order Now'}).click();assert.equal(rows.length,type==='delivery'?0:1,'invalid form must not submit')
  if(type==='pickup')await page.getByRole('button',{name:'Self Pickup'}).click()
  await page.getByLabel('Full Name',{exact:true}).fill('Lifecycle '+type)
  await page.getByLabel('Mobile Number').fill('9000000000')
  if(type==='delivery')await page.getByLabel('Full Address').fill('Test address, Cheeta Camp')
  failNext=true;await page.getByRole('button',{name:'Place Order Now'}).click();await page.getByRole('alert').filter({hasText:'temporarily unavailable'}).waitFor()
  await page.getByRole('button',{name:'Place Order Now'}).click()
  // Accept a canonical price preview if live catalog/client settings differ.
  await page.waitForTimeout(500)
  const confirm=page.getByRole('button',{name:/Confirm.*order/i});if(await confirm.isVisible())await confirm.click()
  await page.waitForURL('**/order-confirmation');await page.getByRole('heading',{name:'Order received',exact:true}).waitFor()
  assert.equal(JSON.parse(await page.evaluate(()=>localStorage.getItem('craving-point-cart'))).length,0)
  const row=rows.at(-1);assert.equal(row.payload.meta.orderType,type);if(type==='pickup')assert.equal(row.payload.delivery,0)
  // Admin must discover the new order automatically, without page reload or Refresh.
  const card=admin.getByRole('article').filter({hasText:'Lifecycle '+type});await card.waitFor({timeout:12000})
  await card.getByRole('button',{name:'Details, notes & delivery'}).click()
  const href=await card.getByRole('link',{name:'Send WhatsApp update'}).getAttribute('href');assert.ok(href.startsWith('https://wa.me/919000000000?'))
  const popupPromise=admin.waitForEvent('popup');await card.getByRole('button',{name:'Print / save invoice'}).click();const invoice=await popupPromise;await invoice.waitForLoadState();assert.ok((await invoice.locator('body').innerText()).includes(row.order_number));await invoice.close()
  await card.getByLabel('Internal notes').fill('Keep this unsaved note')
  await page.getByRole('link',{name:'Track order',exact:true}).click();await page.getByRole('heading',{name:'Follow your craving'}).waitFor()
  const statuses=type==='delivery'?['confirmed','preparing','ready','out_for_delivery','delivered']:['confirmed','preparing','ready','picked_up']
  for(const status of statuses){await card.getByRole('button',{name:'Mark '+status.split('_').join(' '),exact:true}).click();await admin.getByRole('status').filter({hasText:'Order status updated'}).waitFor();if(status==='confirmed'){assert.equal(await card.getByLabel('Internal notes').inputValue(),'Keep this unsaved note');await card.getByRole('button',{name:'Save details',exact:true}).click();await card.getByText('Order notes and assignment saved.').waitFor()}}
  // Polling on the customer page must reach completion without pressing Refresh.
  await page.getByRole('heading',{name:'How was your order?'}).waitFor({timeout:20000})
  await admin.getByLabel('Filter orders').selectOption('all');admin.once('dialog',d=>d.accept());await card.getByRole('button',{name:'Record cash received'}).click();await card.getByText('Cash collection recorded.').waitFor()
  await page.getByRole('button',{name:'Refresh status'}).click();await page.getByText('Payment: Confirmed',{exact:true}).waitFor()
  await page.getByLabel('Your review').fill('Test review for isolated lifecycle');await page.getByRole('button',{name:'Submit review',exact:true}).click();await page.getByText('Thank you! Your review has been sent for approval.').waitFor()
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  await admin.getByLabel('Search orders').fill('not-a-real-match');await admin.getByText('No matching orders.').waitFor();await admin.getByLabel('Search orders').fill('');await admin.getByLabel('Filter orders').selectOption('active')
  console.log(type+': validation, error recovery, checkout, receipt, automatic admin discovery, status lifecycle, unsaved notes, automatic customer tracking, cash, review and search passed')
  await context.close()
 }
 await adminContext.route('**/rest/v1/rpc/admin_can',route=>route.fulfill({json:false}));await admin.goto('http://localhost:5173/admin/orders');await admin.getByRole('alert').filter({hasText:'does not have permission'}).waitFor();assert.equal(await admin.getByRole('article').count(),0)
 const guestContext=await browser.newContext();await routes(guestContext);const guest=await guestContext.newPage();await guest.goto('http://localhost:5173/admin/orders');await guest.waitForURL('**/admin/login');await guestContext.close();console.log('Invoice content, signed-out redirect and denied-staff UI checks passed')
 assert.deepEqual(errors,[]);assert.equal(rows.length,2);console.log('No live orders or messages sent. Database writes were intercepted; order pricing/tracking used the real service with an in-memory repository.')
}finally{await browser.close()}}
main().catch(e=>{console.error(e.stack);process.exitCode=1})
