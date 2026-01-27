self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : { title: 'Novo Agendamento', body: 'Verifique o painel!', icon: '/logo.png' };
  const origin = self.location.origin;

  // 1. TRATAMENTO DA IMAGEM (PERFIL)
  let imageIcon = data.icon; 
  if (imageIcon && !imageIcon.startsWith('http')) {
    const cleanPath = imageIcon.startsWith('/') ? imageIcon : '/' + imageIcon;
    imageIcon = origin + cleanPath;
  }

  const options = {
    body: data.body,
    
    // ÍCONE GRANDE (Foto Lateral - Colorida)
    icon: imageIcon,

    // 🔴 O SEGREDO DO SINO: 
    // O Android EXIGE um ícone monocromático (branco transparente) aqui.
    // Se você não tiver um ícone assim, deixe null/undefined.
    // Tente 'undefined' para ele pegar o ícone do App instalado.
    // badge: undefined, // <-- Apague ou comente a linha antiga
    badge: origin + '/icon-badge.png', // <-- Adicione esta linha nova

    // 🌊 FORÇAR MODO CASCATA (HEADS-UP) 🌊
    // 1. Vibração é OBRIGATÓRIA para descer na tela
    vibrate: [500, 100, 500, 100, 500],
    
    // 2. Prioridade máxima
    priority: 'high', // Tentativa para navegadores antigos

    // 3. O TRUQUE DO NOVO CANAL
    // Mudamos a tag para 'urgente' para tentar resetar a prioridade no Android
    tag: 'agendamento-urgente-' + Date.now(), 
    
    // 4. Som
    renotify: true,

    // 5. MODO FANTASMA (Aparece e some sozinha depois de 5-10s)
    requireInteraction: false, 

    data: {
      url: data.url || '/admin'
    },
    
    actions: [
      { action: 'open', title: 'Ver Detalhes' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
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