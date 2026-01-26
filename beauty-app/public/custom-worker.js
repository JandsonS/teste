// public/custom-worker.js

self.addEventListener('push', function(event) {
  // Se vier vazio, usa texto padrão
  const data = event.data ? event.data.json() : { title: 'Novo Agendamento', body: 'Verifique o painel!', icon: '/logo.png' };
  
  const origin = self.location.origin;
  
  // Pega o ícone que o servidor mandou (do info.ts)
  let imageIcon = data.icon; 

  // TRUQUE DO ANDROID:
  // Se o info.ts tiver apenas "/assets/logo.png", o Android ignora.
  // Precisamos transformar em "https://seu-site.com/assets/logo.png"
  if (imageIcon && !imageIcon.startsWith('http')) {
    // Garante que não fique com duas barras (//) ou sem barra
    const cleanPath = imageIcon.startsWith('/') ? imageIcon : '/' + imageIcon;
    imageIcon = origin + cleanPath;
  }

  const options = {
    body: data.body,
    
    // Mostra a logo do cliente GRANDE (como foto de perfil)
    icon: imageIcon,
    
    // Sem badge para não gerar a "bola branca"
    badge: undefined, 

    vibrate: [500, 100, 500],
    tag: 'booking-notification',
    renotify: true,
    requireInteraction: true,
    
    data: {
      url: data.url || '/admin'
    },
    
    actions: [
      { action: 'open', title: ' Ver' },
      { action: 'close', title: ' Fechar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ... (resto do código de clique igual ao anterior)
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  if (event.action === 'close') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.includes(event.notification.data.url) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});