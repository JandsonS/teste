self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : { title: 'Novo Agendamento', body: 'Verifique o painel!' };
  
  // Pega a URL base do site automaticamente (Ex: https://seu-site.vercel.app)
  const origin = self.location.origin;

  // ⚠️ GARANTIA: Define o caminho absoluto da imagem
  // Se sua logo for "icon.png" ou "logo.png", ajuste o nome abaixo:
  const iconUrl = `${origin}/logo.png`; 

  const options = {
    body: data.body,
    
    // Ícone Grande (A "Foto do Perfil" da notificação)
    icon: iconUrl,
    
    // Imagem de Conteúdo (Opcional, estilo banner)
    // image: iconUrl, 

    // Badge: No Android, deixe null ou undefined se não tiver um ícone 100% branco transparente.
    // Se colocar a logo colorida aqui, vira uma bola branca.
    badge: undefined,

    vibrate: [500, 200, 500],
    tag: 'new-booking',
    renotify: true, // Toca o som mesmo se já tiver outra notificação
    requireInteraction: true, // Não some sozinha da tela
    
    data: {
      url: data.url || '/admin'
    },
    
    actions: [
      { action: 'open', title: 'Abrir Painel' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  if (event.action === 'close') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Tenta focar numa aba já aberta
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.includes(event.notification.data.url) && 'focus' in client) {
          return client.focus();
        }
      }
      // Se não tiver, abre uma nova
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});