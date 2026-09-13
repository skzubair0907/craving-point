const test = require('node:test')
const assert = require('node:assert/strict')

test('notifications keep the newest first and expose unread counts', async () => {
  const notificationsModule = await import('../src/lib/notifications.mjs')

  const initial = [
    {
      id: 'n-1',
      title: 'Welcome back',
      message: 'Your next order is ready to begin.',
      createdAt: '2026-09-12T10:00:00.000Z',
      read: true,
    },
  ]

  const next = notificationsModule.addNotification(initial, {
    id: 'n-2',
    title: 'Order placed',
    message: 'Your order has been received.',
  })

  assert.equal(next.length, 2)
  assert.equal(next[0].title, 'Order placed')
  assert.equal(next[0].read, false)
  assert.equal(notificationsModule.getUnreadCount(next), 1)

  const marked = notificationsModule.markNotificationAsRead(next, 'n-2')
  assert.equal(marked[0].read, true)
  assert.equal(marked[1].read, true)
})
