self.addEventListener('push', function(event) {
  // Se vier vazio, usa texto padrão
  const data = event.data ? event.data.json() : { title: 'Novo Agendamento', body: 'Verifique o painel!', icon: '/logo.png' };
  
  const origin = self.location.origin;
  
  // Tratamento da Imagem Grande (Foto do Perfil)
  let imageIcon = data.icon; 
  if (imageIcon && !imageIcon.startsWith('http')) {
    const cleanPath = imageIcon.startsWith('/') ? imageIcon : '/' + imageIcon;
    imageIcon = origin + cleanPath;
  }

  const options = {
    body: data.body,
    
    // 1. ÍCONE GRANDE (A Foto Lateral)
    icon: imageIcon,
    
    // 2. CORRIGINDO O SINO (BADGE)
    // Deixamos undefined para o Android usar o ícone do App instalado.
    // Se não estiver instalado, ele usa o padrão do Chrome (não tem como fugir sem instalar).
    badge: undefined, 

    // 3. EFEITO CASCATA (Heads-up) 🌊
    // Para "descer" do topo, precisa vibrar!
    vibrate: [200, 100, 200], 
    
    // 4. MODO SUSPENSO (Desaparece sozinha) 👻
    // requireInteraction: false -> Faz ela sumir depois de alguns segundos (padrão do sistema)
    requireInteraction: false,
    
    // Prioridade máxima para tentar furar o "não perturbe" e aparecer no topo
    priority: 'high',
    
    tag: 'booking-notification',
    renotify: true, // Toca o som sempre, para chamar atenção
    
    data: {
      url: data.url || '/admin'
    },
    
    actions: [
      { action: 'open', title: '👀 Ver Detalhes' }
      // Removi o "Fechar" porque ela já vai sumir sozinha agora
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Clique na notificação
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

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