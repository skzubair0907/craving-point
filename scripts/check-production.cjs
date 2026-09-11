// Read-only deployment readiness checks. No credentials or customer records are printed.
try { process.loadEnvFile() } catch {}
async function main(){
 let failures=0
 const check=(name,ok)=>{console.log((ok?'PASS':'FAIL')+' '+name);if(!ok)failures++}
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY
 check('Server database configuration',Boolean(url?.startsWith('https://')&&key&&!/your_|placeholder/i.test(key)))
 check('Browser and server use the same database',Boolean(url&&url===process.env.VITE_SUPABASE_URL))
 check('No private key in browser environment',!Object.entries(process.env).some(([k,v])=>k.startsWith('VITE_')&&(/SECRET|SERVICE_ROLE|PASSWORD/.test(k)||v?.startsWith('sb_secret_'))))
 check('Canonical HTTPS site URL',Boolean(process.env.SITE_URL?.startsWith('https://')))
 if(url&&key){try{
 const res=await fetch(url+'/rest/v1/',{headers:{apikey:key,Authorization:'Bearer '+key},signal:AbortSignal.timeout(15000)})
 check('Database API accepts server credentials',res.ok)
 if(res.ok){const schema=await res.json();for(const name of ['admin_can','set_order_status','record_cash_collection','admin_sales_report'])check('Database function '+name,Boolean(schema.paths?.['/rpc/'+name]))}
 }catch{check('Database API reachable',false)}}
 console.log('Key rotation, RLS, backups, restore drills and real staging orders require separate verification.')
 process.exitCode=failures?1:0
}
main().catch(()=>{console.error('Readiness check failed. No secrets were logged.');process.exitCode=1})
