const fs = require('fs');
const { handle } = require('./api/service.cjs');
const { repository } = require('./api/repository.cjs');

const menu = JSON.parse(fs.readFileSync('./data/menu.json', 'utf8'));
const repo = repository(true);

(async () => {
  const request = {
    customer: { name: 'QA User', phone: '9000000000', address: 'Test address' },
    items: [{ id: menu[0].id, quantity: 1 }],
    meta: { orderType: 'delivery', payment: 'cod' },
  };

  const created = await handle('createOrder', request, { local: true, repo });
  console.log('CREATE_OK', !!created?.success, created?.order?.id, !!created?.order?.trackingToken);

  const status = await handle('orderStatus', { orderId: created.order.id, token: created.order.trackingToken }, { local: true, repo });
  console.log('STATUS_OK', status.order.id, status.order.trackingToken, !!status.order.restaurantLocation || !!status.order.customerLocation);

  try {
    await handle('orderStatus', { orderId: created.order.id, token: 'badtoken' }, { local: true, repo });
    console.log('INVALID_TOKEN_UNEXPECTED_SUCCESS');
  } catch (error) {
    console.log('INVALID_TOKEN_FAIL', error.message);
  }

  try {
    await handle('orderStatus', { orderId: 'NOT_REAL', token: 'a'.repeat(64) }, { local: true, repo });
    console.log('MISSING_ORDER_UNEXPECTED_SUCCESS');
  } catch (error) {
    console.log('MISSING_ORDER_FAIL', error.message);
  }

  const parsedHash = new URLSearchParams('order=' + encodeURIComponent(created.order.id) + '&token=' + encodeURIComponent(created.order.trackingToken));
  console.log('URL_PARSE_OK', parsedHash.get('order') === created.order.id, parsedHash.get('token') === created.order.trackingToken);
})();
