const test = require('node:test')
const assert = require('node:assert/strict')
const {buildOrder}=require('../api/order.cjs')
const product={id:'stock-item',name:'Test dish',price:100,is_available:true,stock_quantity:3,price_variants:[{label:'Small',price:100},{label:'Large',price:150}]}
const payload=items=>({customer:{name:'Test Customer',phone:'9000000000'},items,meta:{orderType:'pickup',payment:'cod'}})
test('stock limits aggregate quantities across different variants and duplicate cart lines',()=>{
 assert.throws(()=>buildOrder(payload([{id:'one',productId:product.id,quantity:2,selectedVariant:'Small'},{id:'two',productId:product.id,quantity:2,selectedVariant:'Large'}]),[product]),/Not enough stock/)
 const order=buildOrder(payload([{id:product.id,quantity:3,price:1}]),[product])
 assert.equal(order.subtotal,300)
})
test('zero stock, deleted products and out-of-schedule products cannot be purchased',()=>{
 const request=payload([{id:product.id,quantity:1}])
 for(const change of [{stock_quantity:0},{deleted_at:'2026-01-01'},{available_from:'2999-01-01'},{available_until:'2000-01-01'}])assert.throws(()=>buildOrder(request,[{...product,...change}]))
})
test('made-to-order products without inventory records remain purchasable',()=>{
 const {stock_quantity,...untracked}=product
 assert.equal(buildOrder(payload([{id:product.id,quantity:9}]),[untracked]).subtotal,900)
})
