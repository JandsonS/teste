self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : { title: 'Novo Agendamento', body: 'Verifique o painel!' };
  
  const options = {
    body: data.body,
    
    // 1. O TRUQUE DA LOGO GRANDE
    // O Android usa o 'icon' como a "Foto do Perfil" (igual ao WhatsApp)
    icon: '/logo.png', 
    
    // 2. A IMAGEM DE DESTAQUE (OPCIONAL)
    // Se quiser, pode mandar uma imagem de banner também. Se não, deixe sem.
    // image: '/banner-promocional.png',

    // 3. REMOVEMOS O BADGE (BOLINHA PEQUENA)
    // Ao não colocar badge, o Android usa o ícone do App instalado (se for PWA) ou limpa a visualização.
    // badge: '/icon-monocromatico.png', 

    vibrate: [500, 100, 500], // Vibração Forte: Vrummm... Vrummm...
    
    // 4. IGUAL WHATSAPP: NÃO SOME SOZINHA
    requireInteraction: true, 
    
    // 5. MARCAÇÃO DE MENSAGEM
    tag: 'booking-notification', // Agrupa mensagens para não lotar a barra
    renotify: true, // Toca o som de novo mesmo se já tiver outra notificação lá
    
    data: {
      url: data.url || '/admin'
    },

    // 6. BOTÕES DE AÇÃO (ESTILO IPHONE/ANDROID PRO)
    actions: [
      {
        action: 'open',
        title: '👀 Ver Detalhes'
      },
      {
        action: 'close',
        title: '✖ Fechar'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// CLIQUE NA NOTIFICAÇÃO OU NO BOTÃO
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'close') return;

  // Abre o Admin direto
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