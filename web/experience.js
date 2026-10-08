// NestLocal Experience 2.0 — fully synthetic, in-memory scenario engine.
// No auth, tenant lookup, cookies, localStorage, Firestore writes or provider calls.
const EL=document.getElementById('experienceRoot');
const LANG=document.getElementById('language');
const state={language:'pt',sector:null,step:0,slot:null,completed:false,entry:'whatsapp',view:'business'};
const labels={
pt:{demo:'Demonstração fictícia',eyebrow:'Viva a experiência antes de cadastrar',welcome:'O próximo serviço já começa organizado.',welcomeText:'Escolha seu setor e experimente como um pedido vira orçamento, agenda, execução e oportunidade de retorno. Sem conta, telefone, WhatsApp ou cartão.',sectorTitle:'Qual é o seu negócio?',sectorHelp:'Tudo aqui é simulado. Nenhum dado de cliente é acessado ou criado.',start:'Experimentar este setor',step1:'Pedido recebido',step2:'Orçamento preparado',step3:'Aprovação do cliente',step4:'Agendamento',step5:'Execução',step6:'Próximo serviço',request:'Solicitação',customer:'Cliente fictício',service:'Serviço',context:'O que aconteceu',source:'Origem',sourceValue:'Formulário fictício',action1:'Analisar pedido e preparar orçamento',quote:'Orçamento',scope:'Escopo do serviço',estimate:'Valor fictício calculado para o cenário',method:'Nesta demonstração, o valor vem de uma regra fixa do cenário, não de IA.',action2:'Preparar aprovação simulada',approval:'Aprovação',approvalHelp:'Agora você está no papel do cliente fictício. Escolha aprovar este orçamento.',approve:'Simular aprovação',schedule:'Agenda',scheduleHelp:'Estes horários são exemplos fictícios, não disponibilidade real.',chooseSlot:'Escolha um horário de exemplo',morning:'Próximo dia · 09:00',afternoon:'Próximo dia · 14:00',action4:'Confirmar agenda fictícia',execution:'Serviço em execução',executionHelp:'O cliente fictício aprovou e o agendamento foi simulado. Agora registre a conclusão.',action5:'Marcar execução simulada como concluída',return:'Retorno inteligente',returnHelp:'O serviço foi concluído. O NestLocal identifica uma próxima ação com base na regra de recorrência cadastrada neste exemplo. Nenhuma mensagem será enviada.',why:'Por que esta sugestão apareceu?',whyValue:'O cenário registra um serviço concluído e uma regra fictícia de retorno. Não é previsão de nova venda.',action6:'Preparar lembrete fictício',completeTitle:'Você acabou de organizar um ciclo completo.',completeText:'Da solicitação até o próximo contato, sem conectar canal algum. Estes resultados foram apenas uma simulação.',cta:'Quero usar no meu negócio',secondary:'Voltar ao início',back:'Voltar',reset:'Reiniciar experiência',progress:'Progresso',disclaimer:'Ambiente 100% fictício. Nenhuma ação real, envio, cobrança ou reserva é executada.',phase:'Etapa',of:'de',approved:'Aprovado no cenário',scheduled:'Agendado no cenário',done:'Concluído no cenário',draft:'Rascunho revisável',returnNote:'Sugestão apenas. Você decide se e quando entrar em contato.',time:'Tempo estimado',next:'Próxima etapa',price:'Valor do cenário'},
en:{demo:'Fictional demonstration',eyebrow:'Experience the value before signing up',welcome:'Your next service, already organized.',welcomeText:'Choose your trade and explore how a request turns into a quote, schedule, execution and repeat opportunity. No account, phone, WhatsApp or card.',sectorTitle:'What type of business?',sectorHelp:'Everything here is simulated. No actual customer record is accessed or created.',start:'Try this sector',step1:'New request',step2:'Quote prepared',step3:'Customer approval',step4:'Scheduling',step5:'Execution',step6:'Next service',request:'Request',customer:'Fictional customer',service:'Service',context:'What happened',source:'Source',sourceValue:'Fictional form',action1:'Review request and prepare quote',quote:'Quote',scope:'Service scope',estimate:'Fictional price calculated for this scenario',method:'The demo price follows a fixed scenario rule, not AI.',action2:'Prepare simulated approval',approval:'Approval',approvalHelp:'You are now the fictional customer. Approve this quote to continue.',approve:'Simulate approval',schedule:'Schedule',scheduleHelp:'These are example slots, not real availability.',chooseSlot:'Choose an example slot',morning:'Next day · 9:00 AM',afternoon:'Next day · 2:00 PM',action4:'Confirm fictional booking',execution:'Service in progress',executionHelp:'The fictional customer approved and the booking was simulated. Now record completion.',action5:'Mark simulated work complete',return:'Smart follow-up',returnHelp:'Work is complete. NestLocal suggests a next action using a recurrence rule in this sample. No message will be sent.',why:'Why am I seeing this?',whyValue:'This scenario records completed work and a fictional return rule. No future sale is predicted.',action6:'Prepare fictional reminder',completeTitle:'You organized a complete service cycle.',completeText:'From first request to next contact, without connecting any channel. Every outcome was simulated.',cta:'Use it for my business',secondary:'Start over',back:'Back',reset:'Reset demo',progress:'Progress',disclaimer:'100% fictional environment. No real action, message, charge or booking occurs.',phase:'Step',of:'of',approved:'Approved in simulation',scheduled:'Booked in simulation',done:'Completed in simulation',draft:'Reviewable draft',returnNote:'Suggestion only. You decide if and when to contact a customer.',time:'Estimated duration',next:'Next step',price:'Scenario price'},
es:{demo:'Demostración ficticia',eyebrow:'Descubre el valor antes de registrarte',welcome:'Tu próximo servicio, ya organizado.',welcomeText:'Elige tu sector y descubre cómo una solicitud se convierte en presupuesto, agenda, ejecución y oportunidad de retorno. Sin cuenta, teléfono, WhatsApp ni tarjeta.',sectorTitle:'¿Cuál es tu negocio?',sectorHelp:'Todo aquí es simulado. No se consulta ni se crea información de clientes reales.',start:'Probar este sector',step1:'Solicitud recibida',step2:'Presupuesto preparado',step3:'Aprobación del cliente',step4:'Agenda',step5:'Ejecución',step6:'Próximo servicio',request:'Solicitud',customer:'Cliente ficticio',service:'Servicio',context:'Qué ocurrió',source:'Origen',sourceValue:'Formulario ficticio',action1:'Revisar solicitud y preparar presupuesto',quote:'Presupuesto',scope:'Alcance del servicio',estimate:'Precio ficticio calculado para el escenario',method:'El precio de la demo sigue una regla fija, no IA.',action2:'Preparar aprobación simulada',approval:'Aprobación',approvalHelp:'Ahora eres el cliente ficticio. Aprueba este presupuesto para continuar.',approve:'Simular aprobación',schedule:'Agenda',scheduleHelp:'Estos horarios son ejemplos, no disponibilidad real.',chooseSlot:'Elige un horario de ejemplo',morning:'Día siguiente · 09:00',afternoon:'Día siguiente · 14:00',action4:'Confirmar agenda ficticia',execution:'Servicio en ejecución',executionHelp:'El cliente ficticio aprobó y se simuló la reserva. Ahora registra la finalización.',action5:'Marcar ejecución simulada como terminada',return:'Próximo contacto',returnHelp:'El servicio terminó. NestLocal sugiere una acción según una regla ficticia de recurrencia. No se enviará ningún mensaje.',why:'¿Por qué veo esta sugerencia?',whyValue:'Este escenario registra un servicio completado y una regla ficticia de retorno. No pronostica ventas.',action6:'Preparar recordatorio ficticio',completeTitle:'Organizaste un ciclo completo.',completeText:'Desde la solicitud hasta el próximo contacto, sin conectar canales. Todo fue una simulación.',cta:'Quiero usarlo en mi negocio',secondary:'Volver al inicio',back:'Volver',reset:'Reiniciar demo',progress:'Progreso',disclaimer:'Entorno 100% ficticio. No se realiza ninguna acción, envío, cobro ni reserva real.',phase:'Paso',of:'de',approved:'Aprobado en la demo',scheduled:'Agendado en la demo',done:'Finalizado en la demo',draft:'Borrador editable',returnNote:'Solo sugerencia. Tú decides si y cuándo contactar.',time:'Duración estimada',next:'Siguiente paso',price:'Precio del ejemplo'}
};
const explain={
pt:{
 hero:'Da primeira solicitação ao próximo serviço — sem perder o controle.',
 sub:'Veja uma empresa de serviços usando o NestLocal de verdade: onde o pedido aparece, quem aprova o orçamento, quem marca a visita e como funciona o retorno. Esta visita é 100% fictícia.',
 kicker:'NESTLOCAL NÃO É SÓ UMA AGENDA',
 promise:'É a central de operações da empresa. O cliente pede, o dono acompanha e cada etapa fica registrada.',
 whereTitle:'Antes de começar, entenda os 3 lugares',
 customerPlace:'1. Página do cliente',customerDesc:'Você divulga um link da sua página de serviços. O cliente faz o pedido e acompanha o orçamento e o andamento no próprio link.',
 businessPlace:'2. Painel da empresa',businessDesc:'O pedido entra na área Pedidos do NestLocal. O dono vê o que falta fazer, revisa o valor e organiza a agenda e a equipe.',
 channelsPlace:'3. Contato opcional',channelsDesc:'Não é obrigatório conectar WhatsApp. Quando necessário, o dono prepara uma mensagem e escolhe como falar com o cliente. Não há disparo real nesta visita.',
 bothRoles:'Nesta visita você verá dois lados do mesmo serviço.',
 customerRole:'O CLIENTE VÊ',ownerRole:'A EMPRESA VÊ',whatHappened:'Onde a informação aparece',automated:'O SISTEMA ORGANIZA',human:'UMA PESSOA DECIDE',
 scene1c:'A página de serviços recebeu uma solicitação com dados, serviço e região.',scene1b:'Um novo card aparece em Pedidos, com número e status Novo. Não chega como conversa inventada de WhatsApp.',auto1:'Entrada registrada no painel',human1:'A empresa verifica o pedido',
 scene2c:'O cliente consulta o orçamento na página de acompanhamento, quando o preço estiver pronto.',scene2b:'O valor é calculado pelas regras do catálogo ou revisado pela empresa. A proposta fica vinculada ao pedido.',auto2:'Cálculo por regras, quando aplicáveis',human2:'A empresa revisa o orçamento quando necessário',
 scene3c:'O cliente aprova a proposta pelo link de acompanhamento, não por uma mensagem falsa.',scene3b:'O pedido muda para Aprovado. O NestLocal mostra que é hora de marcar o serviço.',auto3:'Aprovação registrada no pedido',human3:'A empresa segue para a agenda',
 scene4c:'O cliente pode consultar o andamento e receber um link para confirmar detalhes, conforme o fluxo configurado.',scene4b:'O dono escolhe data, período e profissional. Esta tela simula uma escolha; o sistema real valida a capacidade disponível.',auto4:'Agenda e pedido ficam vinculados',human4:'A empresa confirma dia, período e responsável',
 scene5c:'O cliente acompanha o andamento pelo link de acompanhamento.',scene5b:'O profissional ou dono marca o serviço concluído, informa valor final, recebimento e observações.',auto5:'Histórico de execução e pagamento organizado',human5:'A empresa confirma execução e pagamento',
 scene6c:'O cliente não recebe mensagem nesta visita. Um contato futuro pode ser feito por um canal autorizado.',scene6b:'A tela Hoje/Pulse destaca quando um retorno está previsto. O NestLocal prepara a próxima ação, sem disparar conversa sozinho.',auto6:'Data de retorno e prioridade calculadas por regras',human6:'A empresa revisa e decide se entra em contato',
 scene7c:'O cliente ficou com uma página para acompanhar seu pedido, não com outra agenda para baixar.',scene7b:'A empresa ficou com solicitação, orçamento, aceite, compromisso, execução, pagamento e retorno no mesmo histórico.',auto7:'O histórico e as próximas ações ficam organizados',human7:'A empresa continua no controle',
 appLabel:'EXEMPLO DE TELA — NÃO É UM ENVIO REAL',customerMock:'Acompanhamento do pedido',businessMock:'NestLocal · Pedidos / Hoje',manualNote:'Nada é enviado ao WhatsApp automaticamente nesta demonstração.',
 checklist:'O QUE FICA PRONTO AO FINAL',check1:'Pedido registrado e rastreável',check2:'Orçamento e aprovação vinculados',check3:'Agenda do serviço organizada',check4:'Execução e pagamento acompanhados',check5:'Próximo contato sugerido no painel',
 faqTitle:'Perguntas que todo cliente faz',faq1:'Então é um bot de WhatsApp?',answer1:'Não. O NestLocal funciona sem WhatsApp. O canal é opcional; textos e links podem ser preparados, mas conexão oficial, envios e automações dependem de configuração e autorização. A demonstração não envia nada.',
 faq2:'Onde chegam os pedidos e as mensagens?',answer2:'O pedido enviado pela página entra em Pedidos, dentro do painel da empresa. O cliente acompanha pelo próprio link. As mensagens externas não viram automaticamente uma conversa no sistema.',
 faq3:'O sistema faz o orçamento?',answer3:'Sim, para serviços com preços e regras definidos. Quando falta informação, o pedido entra para análise e a empresa revisa a proposta. A IA pode auxiliar a redação, mas não inventa preço.',
 faq4:'Ele agenda e envia lembretes sozinho?',answer4:'A agenda registra horários e profissionais após confirmação da empresa. Datas de retorno e ações pendentes são destacadas. Envio automático de lembretes não está implícito; exige canal conectado, consentimento e recurso habilitado.',
 faq5:'Depois vira só uma agenda?',answer5:'Não. Vira um histórico comercial e operacional: cliente, pedido, orçamento, aprovação, agendamento, serviço realizado, pagamento e oportunidade de retorno.',
 aboveFlow:'Você vai acompanhar um serviço inteiro',flows:'Pedido → orçamento → aceite → agenda → execução → retorno',guide:'Troque mentalmente de papel: à esquerda o cliente; à direita o dono da empresa.',
 nextTitle:'Neste momento',onPhone:'No celular do cliente',inApp:'Dentro do NestLocal',withoutWA:'Funciona mesmo sem conectar WhatsApp.'
},
en:{
 hero:'From first request to repeat business — all in one place.',sub:'Watch a real-world workflow for a service business: where requests go, who approves quotes, who confirms appointments and how follow-ups work. All data in this tour is fictional.',kicker:'NESTLOCAL IS MORE THAN A CALENDAR',promise:'It is a service operations hub. Customers request, owners manage, and every step is tracked.',whereTitle:'First, understand the 3 places',
 customerPlace:'1. Customer service page',customerDesc:'Share a link to your services. Customers submit a request and track quotes and progress through their own link.',businessPlace:'2. Business dashboard',businessDesc:'New requests appear in NestLocal Requests. Owners see tasks, review prices and organize schedules and staff.',channelsPlace:'3. Optional messaging',channelsDesc:'No WhatsApp connection required. Owners can draft messages and choose how to reach customers. Nothing is sent during this tour.',bothRoles:'This tour shows both sides of the same job.',customerRole:'THE CUSTOMER SEES',ownerRole:'THE BUSINESS SEES',whatHappened:'Where the information appears',automated:'SYSTEM ORGANIZES',human:'A PERSON DECIDES',
 scene1c:'A service page captures the request, requested work and service area.',scene1b:'A new card appears under Requests, with an ID and New status. It is not a made-up WhatsApp conversation.',auto1:'The request is logged in the dashboard',human1:'The business checks the request',
 scene2c:'The customer can review the quote on their tracking page when it is ready.',scene2b:'The price comes from catalog rules or business review. The proposal stays attached to the request.',auto2:'Rule-based pricing where applicable',human2:'Business reviews when needed',
 scene3c:'The customer approves via the tracking link, not a fictional chat message.',scene3b:'Request status changes to Approved and NestLocal highlights scheduling as the next action.',auto3:'Approval is linked to the request',human3:'Business proceeds to schedule',
 scene4c:'The customer can check progress or confirm details via a link, depending on configuration.',scene4b:'The owner chooses a date, time window and team member. This is an example; the live system checks real capacity.',auto4:'Schedule and request stay linked',human4:'Business confirms time and assignee',
 scene5c:'Customer follows progress using the tracking link.',scene5b:'Owner or worker marks completion, final amount, payment and work notes.',auto5:'Execution and payment history is tracked',human5:'Business confirms work and payment',
 scene6c:'No message is sent during this tour. Any later contact uses an authorized channel.',scene6b:'Today/Pulse highlights returns as they become due. NestLocal prepares an action rather than sending a chat by itself.',auto6:'Rule-based due dates and priorities',human6:'Business reviews before contacting',
 scene7c:'Customers have a tracking page; they do not have to download another calendar.',scene7b:'The business has requests, quotes, approvals, appointments, execution, payment and follow-up in one history.',auto7:'Records and next actions stay organized',human7:'The business remains in control',
 appLabel:'ILLUSTRATIVE VIEW — NO REAL MESSAGE SENT',customerMock:'Request tracking',businessMock:'NestLocal · Requests / Today',manualNote:'This demo never sends WhatsApp messages automatically.',
 checklist:'WHAT YOU GET AT THE END',check1:'Trackable request',check2:'Linked quote and approval',check3:'Organized appointments',check4:'Work and payments tracked',check5:'Suggested next action',
 faqTitle:'Common questions',faq1:'Is this a WhatsApp bot?',answer1:'No. NestLocal works without WhatsApp. Messaging is optional; official connections and automation require configuration and permission. This tour sends nothing.',faq2:'Where do requests and messages go?',answer2:'Requests from your service page appear in the business dashboard under Requests. Customers track using their link. External chat messages are not automatically imported.',faq3:'Does it calculate quotes?',answer3:'Yes, for services with configured prices and rules. Otherwise, the request goes to review. AI may help draft text, not invent prices.',faq4:'Does it book and send reminders automatically?',answer4:'The business confirms staff and scheduling. Follow-up dates and action prompts can be calculated. Automatic reminders require a connected channel, consent and enabled features.',faq5:'Does it become just a calendar?',answer5:'No. It is the complete service lifecycle: request, quote, approval, appointment, execution, payment and follow-up.',aboveFlow:'Follow one job end to end',flows:'Request → quote → approval → schedule → work → follow-up',guide:'See both perspectives: customer on the left, business owner on the right.',nextTitle:'At this stage',onPhone:'On the customer phone',inApp:'Inside NestLocal',withoutWA:'Works without connecting WhatsApp.'
},
es:{
 hero:'De la primera solicitud al próximo servicio, todo organizado.',sub:'Mira cómo funciona un negocio con NestLocal: dónde llegan las solicitudes, quién aprueba presupuestos, quién confirma citas y cómo funcionan los retornos. Todo es ficticio.',kicker:'NESTLOCAL ES MÁS QUE UNA AGENDA',promise:'Es un centro operativo. El cliente solicita, el dueño gestiona y cada etapa queda registrada.',whereTitle:'Antes de empezar: los 3 lugares',
 customerPlace:'1. Página del cliente',customerDesc:'Comparte un enlace a tus servicios. El cliente solicita y sigue el presupuesto y el progreso desde su enlace.',businessPlace:'2. Panel del negocio',businessDesc:'Las solicitudes llegan a Solicitudes en NestLocal. El dueño revisa precios, tareas, agenda y personal.',channelsPlace:'3. Mensajes opcionales',channelsDesc:'No necesitas conectar WhatsApp. El dueño puede preparar textos y decidir cómo contactar. La demo no envía nada.',bothRoles:'En esta visita verás ambos lados de un mismo servicio.',customerRole:'EL CLIENTE VE',ownerRole:'LA EMPRESA VE',whatHappened:'Dónde aparece la información',automated:'EL SISTEMA ORGANIZA',human:'UNA PERSONA DECIDE',
 scene1c:'La página de servicios recibe la solicitud, los detalles y la zona.',scene1b:'Aparece una tarjeta en Solicitudes, con número y estado Nuevo. No es un chat ficticio de WhatsApp.',auto1:'Solicitud registrada en el panel',human1:'La empresa revisa el pedido',
 scene2c:'El cliente ve el presupuesto en su página de seguimiento cuando está listo.',scene2b:'El precio procede de las reglas del catálogo o de la revisión humana. Queda unido a la solicitud.',auto2:'Cálculo con reglas configuradas',human2:'La empresa revisa cuando hace falta',
 scene3c:'El cliente aprueba desde el enlace de seguimiento, no desde un chat simulado.',scene3b:'El pedido pasa a Aprobado. NestLocal indica que sigue programar la visita.',auto3:'Aprobación registrada en la solicitud',human3:'La empresa continúa con la agenda',
 scene4c:'El cliente consulta el progreso o confirma detalles mediante un enlace, según la configuración.',scene4b:'El dueño elige fecha, período y trabajador. El sistema real comprueba la capacidad; esto es un ejemplo.',auto4:'Agenda y solicitud vinculadas',human4:'La empresa confirma horario y encargado',
 scene5c:'El cliente sigue el estado desde su enlace.',scene5b:'El dueño o trabajador marca el trabajo terminado, valor final y pago.',auto5:'Historial de trabajo y pago registrado',human5:'La empresa confirma el trabajo y el cobro',
 scene6c:'No se envía ningún mensaje durante la visita. Los contactos futuros usan un canal autorizado.',scene6b:'Hoy/Pulse indica los retornos previstos. NestLocal prepara una acción, no envía chats por sí mismo.',auto6:'Fechas y prioridades según reglas',human6:'La empresa revisa antes de contactar',
 scene7c:'El cliente dispone de un enlace de seguimiento, no tiene que descargar otra agenda.',scene7b:'La empresa conserva solicitudes, presupuesto, aceptación, agenda, trabajo, pagos y retornos en un historial.',auto7:'Historial y próximos pasos organizados',human7:'La empresa mantiene el control',
 appLabel:'VISTA ILUSTRATIVA — SIN MENSAJES REALES',customerMock:'Seguimiento del pedido',businessMock:'NestLocal · Solicitudes / Hoy',manualNote:'La demostración nunca envía mensajes de WhatsApp automáticamente.',
 checklist:'QUÉ QUEDA ORGANIZADO',check1:'Solicitud rastreable',check2:'Presupuesto y aceptación vinculados',check3:'Citas organizadas',check4:'Trabajo y cobro registrados',check5:'Próxima acción sugerida',
 faqTitle:'Preguntas frecuentes',faq1:'¿Es un bot de WhatsApp?',answer1:'No. NestLocal funciona sin WhatsApp. Los mensajes son opcionales y las automatizaciones requieren configuración y consentimiento. La demo no envía nada.',faq2:'¿Dónde llegan las solicitudes?',answer2:'Las solicitudes de la página llegan a Solicitudes dentro del panel. El cliente las sigue con su enlace. Los mensajes externos no se importan automáticamente.',faq3:'¿Calcula presupuestos?',answer3:'Sí, con precios y reglas previamente configurados. Si faltan datos, la empresa revisa. La IA no inventa precios.',faq4:'¿Agenda y envía recordatorios automáticamente?',answer4:'La empresa confirma fechas y personal. Se calculan fechas de retorno y próximas acciones. Envíos automáticos requieren canal, consentimiento y función habilitada.',faq5:'¿Al final es solo una agenda?',answer5:'No. Es el ciclo completo: solicitud, presupuesto, aceptación, cita, ejecución, cobro y próximo contacto.',aboveFlow:'Acompaña un servicio de principio a fin',flows:'Solicitud → presupuesto → aprobación → agenda → trabajo → retorno',guide:'Verás ambas perspectivas: cliente a la izquierda, empresa a la derecha.',nextTitle:'En esta etapa',onPhone:'En el teléfono del cliente',inApp:'Dentro de NestLocal',withoutWA:'Funciona sin conectar WhatsApp.'
}};
const u=k=>explain[state.language]?.[k]||explain.pt[k]||k;


const paths={
 pt:{
 question:'Como seu cliente chega até você?',hint:'Escolha um caminho. O NestLocal entra na sua rotina sem obrigar você a trocar de canal.',
 whatsapp:'Pelo meu WhatsApp',whatsappDesc:'Você continua conversando no seu número. O pedido só entra no NestLocal quando você o registra ou compartilha o link de solicitação.',
 instagram:'Pelo Instagram e redes',instagramDesc:'Você coloca o link da sua página de serviços na bio, Stories ou anúncio. Mensagens diretas não são importadas automaticamente.',
 website:'Pelo meu próprio site',websiteDesc:'Um botão Solicitar orçamento leva à sua página de serviços do NestLocal. Seu site e sua marca continuam sendo seus.',
 result:'O que acontece neste caminho',whatsappFlow:'Conversa no seu WhatsApp → você registra o pedido no painel → orçamento e agenda ficam organizados.',
 instagramFlow:'Instagram / anúncio → link da sua página → cliente preenche pedido → aparece em Pedidos no NestLocal.',
 websiteFlow:'Seu site → botão Solicitar orçamento → página da sua empresa → pedido aparece no NestLocal.',
 customerChannel:'De onde veio',msgWhatsapp:'Oi, preciso de uma higienização. Você tem horário?',msgInstagram:'A pessoa acessou o link de serviços divulgado nas redes.',msgWebsite:'A pessoa clicou em Solicitar orçamento no site da empresa.',
 originWhatsapp:'WhatsApp pessoal (fora do NestLocal)',originInstagram:'Link divulgado nas redes sociais',originWebsite:'Link incorporado ao seu site',
 ownerActionWhatsapp:'Você registra manualmente os dados do pedido. O NestLocal não lê conversas pessoais.',
 ownerActionInstagram:'O formulário da sua página cria o pedido automaticamente no painel.',
 ownerActionWebsite:'O formulário da sua página cria o pedido automaticamente no painel.',
 visualCustomer:'Celular do seu cliente',visualOwner:'Painel da sua empresa',clientCard:'EXEMPLO · VISÃO DO CLIENTE',ownerCard:'EXEMPLO · VISÃO DA EMPRESA',
 who:'Quem faz o próximo movimento?',system:'O NestLocal organiza',human:'Você decide e confirma',
 jobIntro:'Agora acompanhe um serviço realista, do primeiro contato até o retorno.',preview:'Prévia do caminho',start:'Escolha um serviço para simular',dashboard:'Pedidos / Hoje',pending:'Ação pendente',account:'Empresa fictícia',accountClient:'Cliente de exemplo',pageLink:'suaempresa.nestlocal (link ilustrativo)',
 stage1Owner:'Pedido salvo na área Pedidos',stage2Owner:'Orçamento ligado ao pedido',stage3Owner:'Aprovado pelo cliente',stage4Owner:'Visita na agenda interna',stage5Owner:'Execução e pagamento registrados',stage6Owner:'Sugestão de retorno na tela Hoje',stage7Owner:'Histórico completo, sem mensagens enviadas',
 stage1Client:'Pedido enviado ou anotado',stage2Client:'Orçamento disponível no link',stage3Client:'Aprovação pelo link',stage4Client:'Data combinada com a empresa',stage5Client:'Serviço executado',stage6Client:'Contato futuro ainda não enviado',stage7Client:'Acompanhamento do serviço por link',
 statusLabel:'STATUS DO PEDIDO',pathLabel:'CAMINHO DO CLIENTE',day:'NO DIA DA VISITA',dayDesc:'O compromisso fica na agenda interna e aparece na gestão do serviço. A versão atual não garante uma notificação automática no seu WhatsApp ou celular.',
 truth:'O que funciona sem WhatsApp conectado',truthText:'Página de serviços, cadastro de pedidos, orçamento por regras, aceite pelo link, agenda, execução, pagamento registrado e acompanhamento no painel.',
 notIncluded:'O que NÃO acontece por padrão',notIncludedText:'Captura de conversas pessoais, resposta automática no WhatsApp, lembrete push/SMS na data ou prospecção de clientes pelo NestLocal.',
 endHeader:'Seu negócio continua sendo seu. Sua operação fica organizada.',
 endExplain:'O cliente continua encontrando sua empresa onde sempre encontrou. O NestLocal é a central que acompanha cada serviço do pedido ao pós-venda — não uma rede social, não um robô de conversa e não só uma agenda.',
 agendaTitle:'Agenda interna + próximas ações', agendaDesc:'Você vê os compromissos e as pendências no NestLocal. Envio externo de lembretes depende de canal autorizado e funcionalidade habilitada.',
 release:'VISITA GUIADA · SEM DADOS REAIS',counter:'Passo',routing:'Entrada',organization:'Depois da entrada',communication:'Como a empresa conversa',communicationText:'Você pode manter o WhatsApp pessoal. Use o link quando quiser que o cliente preencha tudo. Você não precisa conectar suas conversas privadas.',
 completed:'Histórico do serviço',nothingSent:'Nenhum lembrete ou mensagem foi enviado nesta simulação.',
 startWhatsApp:'Registrar pedido manualmente no NestLocal',startLink:'Ver pedido aparecer em Pedidos',viewFirst:'Recomeçar com outro canal',visit:'Ver fluxo completo',days:'dias',punch:'Clientes continuam chegando pelos seus canais. O NestLocal organiza o que acontece depois.',
 badge:'Sem conectar WhatsApp',length:'Leva cerca de 2 minutos',
 },
 en:{
 question:'Where do your customers find you?',hint:'Pick a route. NestLocal fits your workflow without forcing you to switch channels.',
 whatsapp:'My own WhatsApp',whatsappDesc:'Keep chatting on your number. A request only enters NestLocal if you record it or share your request-page link.',
 instagram:'Instagram and social media',instagramDesc:'Share your service-page link in your bio, Stories, or ads. Direct messages are not imported automatically.',
 website:'My existing website',websiteDesc:'A Request a Quote button leads to your NestLocal-branded service page. Your existing website stays yours.',
 result:'What happens on this route',whatsappFlow:'Your WhatsApp chat → you add a request to the dashboard → quoting and scheduling are organized.',
 instagramFlow:'Instagram / ad → your business page link → customer submits a request → it appears in NestLocal Requests.',
 websiteFlow:'Your website → Request a Quote → your business page → the request appears in NestLocal.',
 customerChannel:'Request source',msgWhatsapp:'Hi, can you clean my AC? Do you have an appointment?',msgInstagram:'The customer followed your service-page link from social media.',msgWebsite:'The customer clicked Request a Quote on your site.',
 originWhatsapp:'Personal WhatsApp (outside NestLocal)',originInstagram:'Link shared on social media',originWebsite:'Link placed on your website',
 ownerActionWhatsapp:'You manually log the request. NestLocal does not read personal chats.',ownerActionInstagram:'Your online request form creates a dashboard request.',ownerActionWebsite:'Your online request form creates a dashboard request.',
 visualCustomer:'On your customer’s phone',visualOwner:'Your business dashboard',clientCard:'EXAMPLE · CUSTOMER VIEW',ownerCard:'EXAMPLE · BUSINESS VIEW',
 who:'Who makes the next move?',system:'NestLocal organizes',human:'You decide and confirm',
 jobIntro:'Follow one realistic job from first contact to repeat service.',preview:'How it flows',start:'Choose a service to try',dashboard:'Requests / Today',pending:'Action needed',account:'Sample company',accountClient:'Sample customer',pageLink:'yourbusiness.nestlocal (illustrative link)',
 stage1Owner:'Request saved under Requests',stage2Owner:'Quote attached to request',stage3Owner:'Customer approved',stage4Owner:'Visit in the internal calendar',stage5Owner:'Job and payment recorded',stage6Owner:'Follow-up appears in Today',stage7Owner:'Full history, no messages sent',
 stage1Client:'Request submitted or logged',stage2Client:'Quote available via a link',stage3Client:'Approval on the tracking page',stage4Client:'Date agreed with the business',stage5Client:'Job performed',stage6Client:'Future contact not yet sent',stage7Client:'Track the service by link',
 statusLabel:'REQUEST STATUS',pathLabel:'CUSTOMER ROUTE',day:'ON THE APPOINTMENT DAY',dayDesc:'The job appears in the internal calendar and management view. The current version does not guarantee automatic phone or WhatsApp notifications.',
 truth:'Works without connecting WhatsApp',truthText:'Service page, requests, rule-based quotes, approval link, calendar, job/payment records and dashboard tracking.',
 notIncluded:'NOT automatic by default',notIncludedText:'Reading personal chats, WhatsApp auto-replies, push/SMS reminders or bringing new customers via a marketplace.',
 endHeader:'Keep your brand and channels. Organize your work.',endExplain:'Your customers still find you where they already do. NestLocal coordinates each job from request through follow-up. It is not a social network, a chat bot or just a calendar.',
 agendaTitle:'Internal calendar + action queue',agendaDesc:'Appointments and next actions appear in NestLocal. External reminders require an authorized channel and enabled functionality.',
 release:'GUIDED TOUR · NO REAL DATA',counter:'Step',routing:'Entry',organization:'After contact',communication:'How you communicate',communicationText:'Keep your own WhatsApp. Share the service link when you want customers to fill out the request. You need not connect private chats.',
 completed:'Service history',nothingSent:'No reminder or message has been sent in this demo.',
 startWhatsApp:'Record request manually in NestLocal',startLink:'Watch request enter the dashboard',viewFirst:'Start again using another channel',visit:'See the complete flow',days:'days',punch:'Customers still arrive through your channels. NestLocal organizes what happens next.',
 badge:'No WhatsApp connection',length:'About 2 minutes',
 },
 es:{
 question:'¿Dónde te encuentran tus clientes?',hint:'Elige un camino. NestLocal se adapta a tu rutina sin obligarte a cambiar de canal.',
 whatsapp:'Mi propio WhatsApp',whatsappDesc:'Sigue conversando en tu número. La solicitud entra en NestLocal al registrarla o compartir tu enlace.',
 instagram:'Instagram y redes',instagramDesc:'Comparte el enlace de servicios en biografía, Stories o anuncios. Los mensajes directos no se importan solos.',
 website:'Mi sitio web',websiteDesc:'El botón Solicitar presupuesto lleva a la página de servicios de tu empresa. Conservas tu sitio y tu marca.',
 result:'Qué sucede en este camino',whatsappFlow:'Chat en tu WhatsApp → registras la solicitud → presupuesto y agenda organizados.',
 instagramFlow:'Instagram / anuncio → enlace de servicios → cliente envía solicitud → aparece en Solicitudes.',
 websiteFlow:'Tu web → botón Solicitar presupuesto → página de empresa → solicitud en NestLocal.',
 customerChannel:'Origen',msgWhatsapp:'Hola, necesito limpieza del aire. ¿Tienes horario?',msgInstagram:'La persona abrió el enlace de servicios compartido en las redes.',msgWebsite:'La persona pulsó Solicitar presupuesto en tu web.',
 originWhatsapp:'WhatsApp personal (fuera de NestLocal)',originInstagram:'Enlace compartido en redes',originWebsite:'Enlace integrado en tu sitio',
 ownerActionWhatsapp:'Registras los datos manualmente. NestLocal no lee chats personales.',ownerActionInstagram:'El formulario de solicitud crea el pedido automáticamente.',ownerActionWebsite:'El formulario de solicitud crea el pedido automáticamente.',
 visualCustomer:'En el teléfono del cliente',visualOwner:'En el panel de tu empresa',clientCard:'EJEMPLO · VISTA DEL CLIENTE',ownerCard:'EJEMPLO · VISTA DEL NEGOCIO',
 who:'¿Quién realiza el próximo paso?',system:'NestLocal organiza',human:'Tú decides y confirmas',
 jobIntro:'Acompaña un servicio realista de principio a fin.',preview:'Camino del cliente',start:'Elige un servicio para probar',dashboard:'Solicitudes / Hoy',pending:'Acción pendiente',account:'Empresa ficticia',accountClient:'Cliente de ejemplo',pageLink:'tuempresa.nestlocal (enlace ilustrativo)',
 stage1Owner:'Solicitud guardada en el panel',stage2Owner:'Presupuesto unido al pedido',stage3Owner:'Aprobado por el cliente',stage4Owner:'Visita en la agenda interna',stage5Owner:'Trabajo y pago registrados',stage6Owner:'Recordatorio de retorno en Hoy',stage7Owner:'Historial completo, sin mensajes enviados',
 stage1Client:'Solicitud enviada o registrada',stage2Client:'Presupuesto disponible por enlace',stage3Client:'Aprobación mediante enlace',stage4Client:'Fecha acordada con la empresa',stage5Client:'Servicio realizado',stage6Client:'Contacto futuro todavía no enviado',stage7Client:'Seguimiento mediante enlace',
 statusLabel:'ESTADO DEL PEDIDO',pathLabel:'CAMINO DEL CLIENTE',day:'EL DÍA DE LA VISITA',dayDesc:'La cita figura en la agenda interna y gestión del servicio. La versión actual no garantiza avisos automáticos al móvil ni WhatsApp.',
 truth:'Funciona sin conectar WhatsApp',truthText:'Página de servicios, solicitudes, presupuestos por reglas, aceptación, agenda, ejecución, cobros y seguimiento.',
 notIncluded:'NO sucede automáticamente',notIncludedText:'Leer chats personales, responder por WhatsApp, enviar avisos push/SMS o captar clientes mediante un marketplace.',
 endHeader:'Tu marca y tus canales. Tu trabajo organizado.',endExplain:'Los clientes te encuentran donde siempre. NestLocal organiza cada servicio de la solicitud al retorno; no es red social, chatbot ni solo agenda.',
 agendaTitle:'Agenda interna + próximas acciones',agendaDesc:'Ves citas y pendientes en NestLocal. Los avisos externos necesitan un canal autorizado y funciones habilitadas.',
 release:'VISITA GUIADA · DATOS FICTICIOS',counter:'Paso',routing:'Entrada',organization:'Después del contacto',communication:'Cómo se comunica la empresa',communicationText:'Puedes seguir usando tu WhatsApp. Comparte un enlace para que el cliente complete la solicitud. No hay que conectar los chats privados.',
 completed:'Historial del servicio',nothingSent:'La demo no envió mensajes ni recordatorios.',
 startWhatsApp:'Registrar solicitud manualmente',startLink:'Ver solicitud en el panel',viewFirst:'Volver a empezar con otro canal',visit:'Ver todo el proceso',days:'días',punch:'Tus clientes siguen llegando por tus canales. NestLocal organiza lo que viene después.',
 badge:'Sin conectar WhatsApp',length:'Unos 2 minutos',
}
};
const p=k=>paths[state.language]?.[k]||paths.pt[k]||k;
const routes=['whatsapp','instagram','website'];

const sectors=[
{id:'climate',name:{pt:'Climatização',en:'Air conditioning',es:'Climatización'},service:{pt:'Higienização de 2 aparelhos split',en:'Cleaning of 2 split AC units',es:'Limpieza de 2 equipos split'},detail:{pt:'Limpeza preventiva residencial, acesso interno.',en:'Residential preventive cleaning, indoor access.',es:'Limpieza preventiva residencial, acceso interior.'},returnDays:180,amount:32000,duration:120,number:'NL-DEMO-101'},
{id:'cleaning',name:{pt:'Limpeza especializada',en:'Specialist cleaning',es:'Limpieza especializada'},service:{pt:'Higienização de sofá de 3 lugares',en:'Three-seat sofa deep clean',es:'Limpieza de sofá de 3 plazas'},detail:{pt:'Estofado com manchas leves, avaliação de tecido.',en:'Light stains, fabric assessment.',es:'Manchas leves, revisión del tejido.'},returnDays:180,amount:24000,duration:90,number:'NL-DEMO-102'},
{id:'pest',name:{pt:'Controle de pragas',en:'Pest control',es:'Control de plagas'},service:{pt:'Controle preventivo residencial',en:'Residential preventive pest control',es:'Control preventivo residencial'},detail:{pt:'Casa térrea, vistoria dos principais ambientes.',en:'Single-story home, inspection of main rooms.',es:'Casa de una planta, inspección de ambientes.'},returnDays:120,amount:28000,duration:90,number:'NL-DEMO-103'},
{id:'electrical',name:{pt:'Elétrica',en:'Electrical services',es:'Electricidad'},service:{pt:'Instalação de 3 luminárias',en:'Installation of three lights',es:'Instalación de tres lámparas'},detail:{pt:'Pontos já preparados; orçamento revisado no cenário.',en:'Existing wiring points; quote reviewed in the scenario.',es:'Puntos existentes; presupuesto revisado en el ejemplo.'},returnDays:365,amount:21000,duration:120,number:'NL-DEMO-104'},
{id:'general',name:{pt:'Serviços gerais',en:'General services',es:'Servicios generales'},service:{pt:'Manutenção residencial preventiva',en:'Preventive home maintenance',es:'Mantenimiento preventivo del hogar'},detail:{pt:'Pequenos reparos, escopo previamente confirmado.',en:'Small repairs with a pre-approved scope.',es:'Reparaciones menores con alcance previamente acordado.'},returnDays:180,amount:19000,duration:120,number:'NL-DEMO-105'}
];
const t=k=>(labels[state.language]||labels.pt)[k]||k;
const v=item=>item?.[state.language]||item?.pt||'';
const money=cents=>new Intl.NumberFormat(state.language==='en'?'en-US':state.language==='es'?'es-ES':'pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);
function track(event){ // Minimal anonymous telemetry; no identifiers, user-entered text or cookies.
  if(!['demo_started','demo_step_completed','demo_completed','demo_to_signup'].includes(event))return;
  const payload={event,segment:state.sector?.id||'unknown',step:state.step};
  try{fetch('/api/public/demo/events',{method:'POST',credentials:'omit',headers:{'content-type':'application/json'},body:JSON.stringify(payload),keepalive:true}).catch(()=>{});}catch{}
}
function reset(){state.sector=null;state.step=0;state.slot=null;state.completed=false;state.view='business';render()}
const steps=['step1','step2','step3','step4','step5','step6'];
function layout(content){
 const progress=state.sector?Math.min(100,Math.round(state.step/6*100)):0;
 const routesUi=routes.map(id=>
   '<button type="button" class="tour-place '+(state.entry===id?'selected':'')+'" data-entry="'+id+'" aria-pressed="'+(state.entry===id)+'">'+
   '<span class="route-pip" aria-hidden="true"></span><strong>'+p(id)+'</strong><small>'+p(id+'Desc')+'</small></button>').join('');
 const info=!state.sector?'<section class="tour-overview"><div class="tour-section-heading"><span class="eyebrow">01 / '+p('routing')+'</span><h2>'+p('question')+'</h2><p>'+p('hint')+'</p></div>'+
   '<div class="tour-places">'+routesUi+'</div>'+
   '<div class="tour-route"><span>'+p('result')+'</span><strong>'+p(state.entry+'Flow')+'</strong></div></section>':'';
 const faq='<section class="tour-faq"><h3>'+u('faqTitle')+'</h3>'+
  [1,2,3,4,5].map(i=>'<details><summary>'+u('faq'+i)+'</summary><p>'+u('answer'+i)+'</p></details>').join('')+'</section>';
 const intro='<section class="intro"><div class="hero-topline"><span class="eyebrow">'+p('release')+'</span><span class="hero-timing">'+p('badge')+' · '+p('length')+'</span></div><h1>'+p('punch')+'</h1><p>'+p('jobIntro')+'</p>'+
 '<div class="hero-process"><span>'+t('step1')+'</span><i aria-hidden="true">→</i><span>'+t('step2')+'</span><i aria-hidden="true">→</i><span>'+t('step4')+'</span><i aria-hidden="true">→</i><span>'+t('step6')+'</span></div></section>';
 const track=state.sector?'<div class="progress-shell"><div class="progress-caption"><span>'+p('counter')+' '+Math.min(state.step,6)+' / 6</span><strong>'+v(state.sector.name)+'</strong></div><div class="progress-track" role="progressbar" aria-label="'+t('progress')+'" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+progress+'"><i style="width:'+progress+'%"></i></div></div>':'';
 const routeHint=state.sector?'<section class="tour-route compact"><span>'+p('customerChannel')+': '+p(state.entry)+'</span><strong>'+p(state.entry+'Flow')+'</strong></section>':'';
 const timeline=state.sector?'<aside class="journey-aside"><span class="eyebrow">'+p('organization')+'</span><ol class="timeline">'+steps.map((k,i)=>'<li class="'+(state.step>i+1?'finished':state.step===i+1?'current':'')+'"><span class="timeline-dot">'+(i+1)+'</span><span>'+t(k)+'</span></li>').join('')+'</ol><p>'+t('disclaimer')+'</p></aside>':'';
 return '<div class="experience-wrap">'+intro+info+'<section class="experience-layout"><div class="workspace">'+
  '<div class="workspace-top"><span class="scenario-label">'+t('demo')+'</span><span class="number">'+(state.sector?state.sector.number:'NESTLOCAL / EXPERIENCE')+'</span></div>'+
  track+routeHint+content+'<div class="foot-actions">'+(state.sector&&state.step>1&&state.step<7?'<button class="subtle-button" data-action="back">'+t('back')+'</button>':'<span></span>')+
  '<button class="subtle-button" data-action="reset">'+(state.sector?p('viewFirst'):t('reset'))+'</button></div></div>'+timeline+'</section>'+faq+'</div>';
}
function button(label,action,disabled=false){return '<button type="button" class="primary-button" data-action="'+action+'"'+(disabled?' disabled':'')+'>'+label+'<span aria-hidden="true"> →</span></button>'}
function fact(name,value){return '<div class="fact"><span>'+name+'</span><strong>'+value+'</strong></div>'}
function scene(){
 const n=Math.min(state.step,7),sector=state.sector;
 if(!sector||!n)return '';
 const start=n===1,link=state.entry!=='whatsapp';
 const customerText=start?p('msg'+(state.entry==='instagram'?'Instagram':state.entry==='website'?'Website':'Whatsapp')):p('stage'+n+'Client');
 const ownerText=start?p('ownerAction'+(state.entry==='instagram'?'Instagram':state.entry==='website'?'Website':'Whatsapp')):p('stage'+n+'Owner');
 const customerChrome=start&&!link?'WhatsApp — '+p('accountClient'):link&&start?p('pageLink'):p('visualCustomer');
 const make=(role,chrome,title,body,which)=>
   '<article class="tour-scene-card '+which+'"><span class="tour-role-tag">'+role+'</span>'+
   '<div class="tour-screen"><div class="tour-screen-chrome"><span class="tour-screen-dots" aria-hidden="true">•••</span><strong>'+chrome+'</strong></div>'+
   '<div class="tour-screen-content"><span class="tour-screen-id">'+sector.number+'</span><strong>'+title+'</strong><p>'+body+'</p>'+
   (n===2?'<div class="tour-screen-price">'+money(sector.amount)+'</div>':'')+
   (n===4&&state.slot?'<div class="tour-screen-slot">'+t(state.slot)+'</div>':'')+
   '</div></div></article>';
 const left=make(p('visualCustomer'),customerChrome,start?p('origin'+(state.entry==='instagram'?'Instagram':state.entry==='website'?'Website':'Whatsapp')):v(sector.service),customerText,'customer');
 const right=make(p('visualOwner'),p('dashboard'),p('stage'+n+'Owner'),ownerText,'business');
 const switcher='<div class="tour-view-toggle"><button type="button" data-view="business" aria-pressed="'+(state.view==='business')+'">'+p('visualOwner')+'</button><button type="button" data-view="customer" aria-pressed="'+(state.view==='customer')+'">'+p('visualCustomer')+'</button></div>';
 const scenes=switcher+'<div class="tour-scene-grid" data-mobile-view="'+state.view+'">'+left+right+'</div>';
 const automatic=['','auto1','auto2','auto3','auto4','auto5','auto6','auto7'];
 const manual=['','human1','human2','human3','human4','human5','human6','human7'];
 const roles='<div class="tour-responsibility"><div><span>'+p('system')+'</span><strong>'+u(automatic[n])+'</strong></div><div><span>'+p('human')+'</span><strong>'+u(manual[n])+'</strong></div></div>';
 const appointment=n===4?'<div class="tour-appointment"><strong>'+p('day')+'</strong><p>'+p('dayDesc')+'</p></div>':'';
 const closing=n===7?'<div class="tour-summary"><strong>'+p('endHeader')+'</strong><p>'+p('endExplain')+'</p><div class="summary-cols"><div><b>'+p('truth')+'</b><p>'+p('truthText')+'</p></div><div><b>'+p('notIncluded')+'</b><p>'+p('notIncludedText')+'</p></div></div><p>'+p('agendaTitle')+' — '+p('agendaDesc')+'</p><small>'+p('nothingSent')+'</small></div>':'';
 return '<div class="tour-scene"><p class="tour-example-label">'+p('release')+'</p>'+scenes+roles+appointment+closing+'</div>';
}
function panel(title,body){return '<section class="step-panel"><span class="step-overline">'+t('demo')+'</span><h2>'+title+'</h2>'+scene()+body+'</section>'}

function render(){
  document.documentElement.lang=state.language==='pt'?'pt-BR':state.language;
  document.getElementById('demoBadge').textContent=t('demo');
  LANG.value=state.language;
  const sector=state.sector;
  let content='';
  if(!sector){
    content=panel(t('sectorTitle'),'<p class="subcopy">'+t('sectorHelp')+'</p><div class="sectors">'+sectors.map((s,i)=>'<button class="sector" data-sector="'+s.id+'"><span class="sector-numeral">0'+(i+1)+'</span><strong>'+v(s.name)+'</strong><span class="sector-cta">'+t('start')+' ↗</span></button>').join('')+'</div>');
  }else if(state.step===1){
    content=panel(t('step1'),'<p class="subcopy">'+p('ownerAction'+(state.entry==='whatsapp'?'Whatsapp':state.entry==='instagram'?'Instagram':'Website'))+'</p><p class="subcopy">'+t('context')+': '+v(sector.detail)+'</p><div class="facts">'+fact(t('request'),sector.number)+fact(t('service'),v(sector.service))+fact(t('customer'),state.language==='en'?'Sample customer':state.language==='es'?'Cliente de ejemplo':'Cliente de exemplo')+fact(t('source'),p('origin'+(state.entry==='whatsapp'?'Whatsapp':state.entry==='instagram'?'Instagram':'Website')))+'</div>'+button(state.entry==='whatsapp'?p('startWhatsApp'):p('startLink'),'next'));
  }else if(state.step===2){
    content=panel(t('step2'),'<div class="big-price"><span>'+t('price')+'</span><strong>'+money(sector.amount)+'</strong></div><div class="facts">'+fact(t('scope'),v(sector.service))+fact(t('time'),sector.duration+' min')+'</div><p class="subcopy">'+t('method')+'</p>'+button(t('action2'),'next'));
  }else if(state.step===3){
    content=panel(t('step3'),'<p class="subcopy">'+t('approvalHelp')+'</p><div class="approval-sheet"><span>'+t('quote')+' · '+sector.number+'</span><strong>'+money(sector.amount)+'</strong><p>'+v(sector.service)+'</p></div>'+button(t('approve'),'next'));
  }else if(state.step===4){
    content=panel(t('step4'),'<div class="status"><span class="status-dot"></span>'+t('approved')+'</div><p class="subcopy">'+t('scheduleHelp')+'</p><fieldset class="slot-picker"><legend>'+t('chooseSlot')+'</legend><label class="'+(state.slot==='morning'?'selected':'')+'"><input type="radio" name="slot" value="morning" '+(state.slot==='morning'?'checked':'')+'><span>'+t('morning')+'</span></label><label class="'+(state.slot==='afternoon'?'selected':'')+'"><input type="radio" name="slot" value="afternoon" '+(state.slot==='afternoon'?'checked':'')+'><span>'+t('afternoon')+'</span></label></fieldset>'+button(t('action4'),'next',!state.slot));
  }else if(state.step===5){
    content=panel(t('step5'),'<div class="status"><span class="status-dot"></span>'+t('scheduled')+': '+t(state.slot)+'</div><p class="subcopy">'+t('executionHelp')+'</p><div class="facts">'+fact(t('service'),v(sector.service))+fact(t('price'),money(sector.amount))+'</div>'+button(t('action5'),'next'));
  }else if(state.step===6){
    content=panel(t('step6'),'<div class="status"><span class="status-dot"></span>'+t('done')+'</div><p class="subcopy">'+t('returnHelp')+'</p><div class="insight"><small>'+t('why')+'</small><p>'+t('whyValue')+'</p><strong>'+sector.returnDays+' '+(state.language==='en'?'days':state.language==='es'?'días':'dias')+'</strong></div><p class="subcopy">'+t('returnNote')+'</p>'+button(t('action6'),'next'));
  }else{
    content=panel(t('completeTitle'),'<div class="success-mark" aria-hidden="true">✓</div><p class="subcopy">'+t('completeText')+'</p><div class="status"><span class="status-dot"></span>'+t('draft')+'</div><a class="primary-button link-cta" href="https://www.millionsnest.com/apps/nestlocal/launch?returnTo=%2F" id="demoSignup">'+t('cta')+' ↗</a><button class="subtle-button wide-reset" data-action="reset">'+t('secondary')+'</button>');
  }
  EL.innerHTML=layout(content);
}
LANG.addEventListener('change',e=>{if(['pt','en','es'].includes(e.target.value)){state.language=e.target.value;render()}});
EL.addEventListener('change',e=>{if(e.target?.name==='slot'&&['morning','afternoon'].includes(e.target.value)){state.slot=e.target.value;render()}});
EL.addEventListener('click',e=>{
  const sectorButton=e.target.closest('[data-sector]');
  if(sectorButton){const s=sectors.find(x=>x.id===sectorButton.dataset.sector);if(!s)return;state.sector=s;state.step=1;state.slot=null;state.view='business';track('demo_started');render();return}
  const switchButton=e.target.closest('[data-view]');
  if(switchButton&&['customer','business'].includes(switchButton.dataset.view)){state.view=switchButton.dataset.view;render();return}
  const entryButton=e.target.closest('[data-entry]');
  if(entryButton&&!state.sector&&routes.includes(entryButton.dataset.entry)){state.entry=entryButton.dataset.entry;render();return}
  const action=e.target.closest('[data-action]')?.dataset.action;
  if(action==='reset')return reset();
  if(action==='back'&&state.step>1){state.step--;render();return}
  if(action==='next'&&state.sector&&state.step>=1&&state.step<=6){
    if(state.step===4&&!state.slot)return;
    track('demo_step_completed');state.step++;if(state.step===7){state.completed=true;track('demo_completed')}render();
  }
});
document.addEventListener('click',e=>{if(e.target.closest('#demoSignup'))track('demo_to_signup')});
render();
