self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : { title: 'Novo Agendamento', body: 'Verifique o painel!', icon: '/logo.png' };
  
  const origin = self.location.origin;
  
  // Tratamento da Imagem
  let imageIcon = data.icon; 
  if (imageIcon && !imageIcon.startsWith('http')) {
    const cleanPath = imageIcon.startsWith('/') ? imageIcon : '/' + imageIcon;
    imageIcon = origin + cleanPath;
  }

  const options = {
    body: data.body,
    
    // ÍCONE GRANDE (Foto do lado direito)
    icon: imageIcon,
    
    // BADGE: O ícone pequeno da barra de status.
    // DICA DE OURO: Se você deixar 'undefined', o Android tenta usar o ícone do App.
    // Se você colocar uma imagem colorida aqui, ele transforma em quadrado branco ou sino.
    badge: undefined, 
    
    // 🌊 MODO CASCATA (HEADS-UP) 🌊
    // Para descer na tela, PRECISA vibrar e ter prioridade máxima
    vibrate: [500, 100, 500, 100, 500], // Vibração longa e irritante para chamar atenção
    priority: 'high',
    
    // 👻 MODO SUSPENSO (Some sozinha)
    requireInteraction: false, 
    
    // Agrupamento inteligente
    tag: 'booking-' + Date.now(), // Cria uma tag única para cada notificação (evita agrupar)
    renotify: true, // Toca o som SEMPRE
    
    data: {
      url: data.url || '/admin'
    },
    
    actions: [
      { action: 'open', title: '👀 Ver Detalhes' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  // ... (mesmo código de abrir janela anterior) ...
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.includes(event.notification.data.url) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(event.notification.data.url);
    })
  );
});