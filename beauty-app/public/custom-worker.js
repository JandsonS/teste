self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : { title: 'Novo Agendamento', body: 'Verifique o painel!' };
  
  const options = {
    body: data.body,
    icon: '/logo.png', // Garanta que essa imagem existe
   // badge: '/logo.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/admin'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});