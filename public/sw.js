self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Milpa', {
      body: data.body ?? '',
      icon: '/milpa-whatsapp-logo.png',
      badge: '/milpa-whatsapp-logo.png',
      tag: data.tag ?? 'milpa-msg',
      renotify: true,
      data: { url: data.url ?? '/bandeja' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/bandeja'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return clients.openWindow(url)
    })
  )
})
