const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const catalog = JSON.parse(fs.readFileSync('data/catalog.json', 'utf8'));
const media = JSON.parse(fs.readFileSync('src/data/generatedMenuMedia.ts', 'utf8').match(/= (\{[\s\S]*\})\s*$/)[1]);
const report = { checks: [], pageErrors: [], failedRequests: [], catalog: {} };
async function main() {
 const browser = await chromium.launch({ headless: true });
 const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
 page.on('pageerror', e => report.pageErrors.push(e.message));
 page.on('response', r => { if (r.status() >= 400 && r.url().includes('127.0.0.1')) report.failedRequests.push({url:r.url(), status:r.status()}); });
 // Prevent all order/payment writes during this read-only audit.
 await page.route('**/api/**', route => route.request().url().endsWith('/paymentConfig') ? route.continue() : route.fulfill({ status: 503, contentType:'application/json', body: JSON.stringify({error:'Test intercepted request; no order submitted.'}) }));
 async function check(name, fn) { try { const details = await fn(); report.checks.push({name,status:'pass',details}); } catch(e) { report.checks.push({name,status:'fail',error:e.message}); } }
 const go = async route => { await page.goto('http://127.0.0.1:5173'+route,{waitUntil:'networkidle'}); };
 report.catalog = { total:catalog.menuItems.length, missingRawImages:catalog.menuItems.filter(i=>!fs.existsSync('public'+i.image_url)).map(i=>i.id), missingRenderedImages:catalog.menuItems.filter(i=>!fs.existsSync('public'+(media[i.id]||i.image_url))).map(i=>i.id), reusedImages:Object.entries(media).filter(([id,url])=>!url.includes('/'+id+'-')).map(([id,url])=>({id,url})) };
 for (const category of catalog.categories.filter(c=>c.menu_type && c.is_active)) await check('Category: '+category.name, async()=>{
   await go('/menu#cat-'+category.id);
   const expected = catalog.menuItems.filter(i=>i.category_id===category.id && i.is_available).length;
   await page.waitForFunction(n=>document.querySelectorAll('.editorial-food-card').length===n,expected);
   const cards=page.locator('.editorial-food-card'); assert.equal(await cards.locator('img').count(),expected);
   await cards.locator('img').evaluateAll(images=>Promise.all(images.map(async img=>{img.loading='eager';await img.decode()})));
   return {cards:expected};
 });
 for (const route of ['/','/offers','/about','/location','/contact','/account','/cart','/checkout','/order-confirmation','/order-tracking','/menu/not-a-product','/not-a-page','/admin','/admin/menu','/admin/categories','/admin/orders','/admin/customers','/admin/coupons','/admin/reviews','/admin/settings']) await check('Route '+route,async()=>{
   await go(route); await page.waitForTimeout(350);
   const text=await page.locator('body').innerText(); assert.ok(text.length>50);
   if(route.startsWith('/admin')) assert.ok(await page.getByRole('heading',{name:'Admin access',exact:true}).isVisible());
   if(route==='/menu/not-a-product') assert.ok(await page.getByRole('heading',{name:'Item not found',exact:true}).isVisible());
   if(route==='/not-a-page') assert.ok(await page.getByRole('heading',{name:'Page not found',exact:true}).isVisible());
   return text.slice(0,160);
 });
 await check('Favorite persistence and removal',async()=>{
   await go('/menu/waffle-chocolate-classic'); await page.getByRole('button',{name:'Save favorite',exact:true}).click();
   await go('/account'); assert.ok(await page.getByRole('link',{name:'Waffle Chocolate Classic',exact:true}).isVisible());
   await page.getByRole('button',{name:'Remove Waffle Chocolate Classic from favorites'}).click(); assert.ok(await page.getByText('No favorites saved yet.',{exact:false}).isVisible());
 });
 await check('Profile saves and prefills checkout',async()=>{
   await go('/account'); await page.getByLabel('Full name',{exact:true}).fill('Website QA'); await page.getByLabel('Phone number').fill('9000000000');
   await page.getByLabel('Email',{exact:true}).fill('qa@example.test'); await page.getByLabel('Delivery address').fill('Test address, local browser only');
   await page.getByRole('button',{name:'Save details'}).click(); await page.reload(); assert.equal(await page.getByLabel('Full name',{exact:true}).inputValue(),'Website QA');
   await go('/menu/waffle-chocolate-classic'); await page.getByRole('button',{name:/Slice 2/}).click(); await page.getByRole('button',{name:'Increase quantity',exact:true}).click(); await page.getByRole('button',{name:'Add to cart',exact:true}).click();
   await go('/checkout'); assert.equal(await page.getByLabel('Full Name',{exact:true}).inputValue(),'Website QA');
 });
 await check('Cart persistence, quantity, coupons',async()=>{
   await go('/cart'); assert.ok((await page.locator('main').innerText()).includes('140')); await page.reload({waitUntil:'networkidle'}); assert.ok(await page.getByRole('heading',{name:/Waffle Chocolate Classic/}).isVisible());
   await page.getByRole('button',{name:/Increase Waffle Chocolate Classic.*quantity/}).click(); assert.ok((await page.locator('main').innerText()).includes('210'));
   await page.getByLabel('Coupon code').fill('INVALID'); await page.getByRole('button',{name:'Apply',exact:true}).click(); assert.ok(await page.getByText('Invalid coupon code').isVisible());
   await page.getByLabel('Coupon code').fill('SAVE20'); await page.getByRole('button',{name:'Apply',exact:true}).click(); assert.ok(await page.getByText('Coupon applied successfully!').isVisible());
 });
 await check('Checkout pickup and required fields',async()=>{
   await go('/checkout'); assert.ok(await page.getByLabel('Full Address',{exact:true}).isVisible());
   await page.getByRole('button',{name:'Self Pickup',exact:true}).click(); assert.equal(await page.getByLabel('Full Address',{exact:true}).count(),0);
   assert.ok(await page.getByText('Pay at Pickup',{exact:true}).isVisible()); assert.ok((await page.locator('main').innerText()).includes('FREE'));
   await page.getByLabel('Full Name',{exact:true}).fill(''); await page.getByRole('button',{name:'Place Order Now'}).click(); assert.equal(await page.locator('#name').evaluate(e=>e.validity.valueMissing),true);
   await page.getByLabel('Full Name',{exact:true}).fill('Website QA'); await page.getByLabel('Mobile Number').fill('abc'); assert.equal(await page.locator('#phone').evaluate(e=>e.validity.patternMismatch),true);
 });
 await check('Add-ons and product total',async()=>{
   const item=catalog.menuItems.find(i=>i.addons?.length); await go('/menu/'+item.slug); await page.getByRole('button',{name:new RegExp(item.addons[0].name)}).click();
   assert.ok((await page.locator('main').innerText()).includes('Estimated total: ₹'+(item.price+item.addons[0].price)));
 });
 await check('Cart removal and empty state',async()=>{await go('/cart');await page.getByRole('button',{name:/^Remove Waffle Chocolate Classic/}).click();await page.getByText('Your cart is empty',{exact:true}).waitFor();});
 for(const width of [390,768,1440]) for(const route of ['/menu#cat-shawarma-bowls','/menu#cat-momos','/account','/offers','/menu/chicken-shawarma']) await check('Layout '+width+' '+route,async()=>{
   await page.setViewportSize({width,height:960});await go(route); await page.waitForTimeout(200); assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Horizontal overflow');
 });
 await check('Mobile navigation and Escape',async()=>{await page.setViewportSize({width:390,height:960});await go('/');await page.getByRole('button',{name:'Open navigation'}).click();assert.ok(await page.getByRole('navigation',{name:'Mobile navigation'}).isVisible());await page.keyboard.press('Escape');assert.equal(await page.getByRole('navigation',{name:'Mobile navigation'}).count(),0);});
 await check('Video autoplay and loop',async()=>{await page.setViewportSize({width:1440,height:960});await go('/');await page.waitForTimeout(1500);const video=page.locator('video').first();await video.scrollIntoViewIfNeeded();await page.waitForTimeout(1200);const state=await video.evaluate(v=>({muted:v.muted,loop:v.loop,paused:v.paused,ready:v.readyState,time:v.currentTime}));assert.ok(state.muted&&state.loop&&!state.paused&&state.time>0);return state;});
 await check('Reduced motion stops autoplay',async()=>{await page.emulateMedia({reducedMotion:'reduce'});await go('/');await page.waitForTimeout(1200);assert.equal(await page.locator('video').first().evaluate(v=>v.paused),true);await page.emulateMedia({reducedMotion:'no-preference'});});
 await go('/menu#cat-momos');await page.screenshot({path:'artifacts/redesign/feature-audit-momos.png'});
 fs.writeFileSync('artifacts/redesign/feature-audit.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2)); await browser.close();
}
main().catch(e=>{console.error(e);process.exitCode=1});
