// NestLocal service worker: notification-only. Never cache sensitive responses,
// intercept requests, store session tokens or display customer details.
self.addEventListener('push',event=>{
  event.waitUntil((async()=>{
    let payload={};
    try{payload=event.data?.json()||{}}catch{return}
    const data=payload.data||payload;
    if(!['test','task_due'].includes(data.kind))return;
    const language=['pt','en','es'].includes(data.locale)?data.locale:'pt';
    const text={
      pt:{test:['NestLocal · Notificação de teste','Seu aparelho recebeu a notificação de teste.'],task_due:['NestLocal · Retornos','Há atividades do NestLocal para revisar.']},
      en:{test:['NestLocal · Test notification','Your device received the test notification.'],task_due:['NestLocal · Follow-ups','There are NestLocal tasks to review.']},
      es:{test:['NestLocal · Notificación de prueba','Tu dispositivo recibió la notificación de prueba.'],task_due:['NestLocal · Seguimientos','Hay actividades de NestLocal para revisar.']}
    };
    const [title,body]=text[language][data.kind];
    await self.registration.showNotification(title,{
      body,icon:'/favicon.svg',badge:'/favicon.svg',tag:'nestlocal-'+data.kind,
      data:{destination:'/?view=today'},renotify:false
    });
  })());
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil((async()=>{
    const destination=new URL('/?view=today',self.location.origin).href;
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const matched=windows.find(client=>new URL(client.url).origin===self.location.origin);
    if(matched){await matched.focus();if(matched.navigate)await matched.navigate(destination)}
    else if(self.clients.openWindow)await self.clients.openWindow(destination);
  })());
});
