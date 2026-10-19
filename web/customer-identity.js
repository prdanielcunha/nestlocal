const copies={
 pt:{title:'Unificar cadastros do mesmo cliente',help:'Escolha dois cadastros que pertencem à mesma pessoa ou empresa. Pedidos, locais, recebimentos e permissões de contato ficam preservados na origem. A consulta será consolidada e a unificação poderá ser desfeita.',source:'Cadastro a agrupar',target:'Cadastro principal',choose:'Escolha um cliente',reason:'Motivo da unificação',review:'Revisar unificação',confirm:'Confirmar unificação',agree:'Conferi os contatos e confirmo que pertencem ao mesmo cliente.',ready:'Os contatos abaixo serão consultados em uma única ficha. Nenhum dado financeiro será transferido.',saved:'Cadastros unificados.',failed:'Não foi possível concluir. Confira os dados e tente novamente.',stale:'Os cadastros mudaram. Revise novamente.',limit:'É possível reunir até cinco cadastros por cliente.',same:'Escolha dois clientes diferentes.',group:'Cadastros e locais preservados',history:'Ver histórico consolidado',more:'Carregar mais atendimentos',empty:'Nenhum atendimento encontrado.',undo:'Desfazer unificação',undoReason:'Motivo para desfazer',undone:'Unificação desfeita. Os registros de origem foram preservados.',undoConflict:'Houve outra unificação posterior. Desfaça a mais recente primeiro.',partial:'A seleção usa os clientes carregados nesta tela. Carregue mais clientes para encontrar outros cadastros.'},
 en:{title:'Merge records for the same customer',help:'Choose two records for the same person or business. Requests, sites, receipts and contact permissions remain at their source. The profile will be consolidated and the merge can be undone.',source:'Record to group',target:'Primary record',choose:'Choose a customer',reason:'Reason for merging',review:'Review merge',confirm:'Confirm merge',agree:'I reviewed the contacts and confirm they belong to the same customer.',ready:'These contacts will appear in one profile. No financial data will be transferred.',saved:'Customer records merged.',failed:'Could not finish. Check the records and try again.',stale:'The records changed. Review again.',limit:'Up to five records can be grouped per customer.',same:'Choose two different customers.',group:'Preserved source records and sites',history:'View consolidated history',more:'Load more requests',empty:'No requests found.',undo:'Undo merge',undoReason:'Reason for undoing',undone:'Merge undone. Source records were preserved.',undoConflict:'A later merge exists. Undo the latest merge first.',partial:'The selection uses customers loaded on this screen. Load more customers to find additional records.'},
 es:{title:'Unificar registros del mismo cliente',help:'Elige dos registros de la misma persona o empresa. Solicitudes, ubicaciones, cobros y permisos de contacto se conservan en su origen. La consulta será consolidada y la unificación se puede deshacer.',source:'Registro para agrupar',target:'Registro principal',choose:'Elige un cliente',reason:'Motivo de la unificación',review:'Revisar unificación',confirm:'Confirmar unificación',agree:'Revisé los contactos y confirmo que pertenecen al mismo cliente.',ready:'Estos contactos aparecerán en una sola ficha. No se transferirán datos financieros.',saved:'Registros unificados.',failed:'No se pudo finalizar. Revisa los datos e inténtalo de nuevo.',stale:'Los registros cambiaron. Revisa de nuevo.',limit:'Se pueden reunir hasta cinco registros por cliente.',same:'Elige dos clientes diferentes.',group:'Registros y ubicaciones conservados',history:'Ver historial consolidado',more:'Cargar más solicitudes',empty:'No se encontraron solicitudes.',undo:'Deshacer unificación',undoReason:'Motivo para deshacer',undone:'Unificación deshecha. Se conservaron los registros de origen.',undoConflict:'Existe una unificación posterior. Deshaz primero la más reciente.',partial:'La selección usa los clientes cargados en esta pantalla. Carga más para encontrar otros registros.'}
};
export const identityCopy=lang=>copies[lang]||copies.pt;
export function renderCustomerMerge({customers,lang,esc,allowed,hasMore}){
 if(!allowed||customers.length<2)return '';
 const c=identityCopy(lang),options=customers.map(row=>`<option value="${esc(row.id)}">${esc(row.name||'—')} · ${esc(row.phone||row.email||row.id)}</option>`).join('');
 return `<details class="card customer-merge"><summary><strong>${c.title}</strong></summary><p class="help">${c.help}</p>${hasMore?`<p class="help">${c.partial}</p>`:''}<form id="customer-merge"><label>${c.source}<select name="sourceId" required><option value="">${c.choose}</option>${options}</select></label><label>${c.target}<select name="targetId" required><option value="">${c.choose}</option>${options}</select></label><label>${c.reason}<textarea name="reason" minlength="8" maxlength="300" rows="2" required></textarea></label><div data-merge-preview></div><p role="status" aria-live="polite" data-merge-status></p><button class="button primary" type="submit">${c.review}</button></form></details>`;
}
export function renderCustomerOrigins(customer,{lang,esc,sitePanel,maintenance,allowed}){
 const c=identityCopy(lang),sources=customer.identitySources;
 let html=Array.isArray(sources)&&sources.length>1?`<details class="customer-origin"><summary>${c.group} (${sources.length})</summary>${sources.map(row=>`<section><strong>${esc(row.name||'—')}</strong><p>${esc(row.phone||row.email||'—')}</p>${maintenance(row)}${sitePanel(row)}</section>`).join('')}</details>`:sitePanel(customer);
 html+=`<details class="customer-history"><summary>${c.history}</summary><button class="button small" type="button" data-customer-history="${esc(customer.id)}">${c.history}</button><div data-customer-history-results></div></details>`;
 if(allowed&&sources?.length>1&&customer.mergeRevision)html+=`<details class="customer-undo"><summary>${c.undo}</summary><form data-merge-undo="${esc(customer.mergeRevision)}"><label>${c.undoReason}<textarea name="reason" minlength="8" maxlength="300" rows="2" required></textarea></label><button class="button small" type="submit">${c.undo}</button><p role="status"></p></form></details>`;
 return html;
}
export function bindCustomerIdentity({root=document,lang,orgId,uid,api,esc,t,isCurrent,onSaved,onRequest}){
 const c=identityCopy(lang),current=()=>isCurrent(orgId,uid),path='/api/organizations/'+encodeURIComponent(orgId)+'/nestlocal/customers';
 const message=error=>({CUSTOMER_MERGE_STALE:c.stale,CUSTOMER_MERGE_LIMIT:c.limit,CUSTOMER_MERGE_SAME:c.same,CUSTOMER_IDENTITY_CHANGED:c.stale,CUSTOMER_MERGE_UNDO_CONFLICT:c.undoConflict}[error.message]||c.failed);
 const form=root.querySelector('#customer-merge');
 if(form){
  let preview=null,key='',busy=false;const panel=form.querySelector('[data-merge-preview]'),status=form.querySelector('[data-merge-status]'),button=form.querySelector('[type=submit]');
  const reset=()=>{preview=null;key='';panel.replaceChildren();button.textContent=c.review;status.textContent=''};
  for(const input of form.querySelectorAll('select,textarea'))input.addEventListener('input',reset);
  form.addEventListener('submit',async event=>{
   event.preventDefault();if(busy||!current())return;busy=true;button.disabled=true;
   const inputs=[...form.querySelectorAll('select,textarea')],payload={sourceId:form.elements.sourceId.value,targetId:form.elements.targetId.value,reason:form.elements.reason.value.trim()};
   inputs.forEach(input=>input.disabled=true);
   try{
    if(!preview){
     const result=await api(path+'/merge/preview',{method:'POST',body:JSON.stringify(payload)});if(!current()||!form.isConnected)return;
     preview=result;key='nl-'+crypto.randomUUID();
     panel.innerHTML=`<p>${c.ready}</p><ul>${[...result.target,...result.source].map(row=>`<li>${esc(row.name)} · ${esc(row.phone||row.email||'—')}</li>`).join('')}</ul><label><input type="checkbox" name="confirmIdentity" required> ${c.agree}</label>`;
     button.textContent=c.confirm;button.disabled=false;button.scrollIntoView({block:'center',behavior:'instant'});
    }else{
     if(form.elements.confirmIdentity?.checked!==true)return;
     await api(path+'/merge',{method:'POST',body:JSON.stringify({...payload,previewToken:preview.previewToken,operationKey:key})});
     if(current()&&form.isConnected){reset();form.reset();await onSaved(form,c.saved)}
    }
   }catch(error){if(current()&&form.isConnected){if(['CUSTOMER_MERGE_STALE','CUSTOMER_IDENTITY_CHANGED'].includes(error.message))reset();status.textContent=message(error)}}
   finally{busy=false;if(current()&&form.isConnected){button.disabled=false;inputs.forEach(input=>input.disabled=false)}}
  });
 }
 for(const undo of root.querySelectorAll('[data-merge-undo]'))undo.onsubmit=async event=>{
  event.preventDefault();if(!current())return;const button=undo.querySelector('button');button.disabled=true;
  try{await api(path+'/merge/'+encodeURIComponent(undo.dataset.mergeUndo)+'/undo',{method:'POST',body:JSON.stringify({reason:undo.elements.reason.value})});if(current())await onSaved(undo,c.undone)}
  catch(error){if(current()&&undo.isConnected)undo.querySelector('[role=status]').textContent=message(error)}finally{if(undo.isConnected)button.disabled=false}
 };
 for(const button of root.querySelectorAll('[data-customer-history]')){
  button.parentElement.querySelector('[data-customer-history-results]').onclick=event=>{
   const trigger=event.target.closest('[data-open-history-request]');if(trigger&&current())void onRequest(trigger.dataset.openHistoryRequest);
  };
  let cursor='',busy=false;button.onclick=async()=>{
   if(busy||!current())return;busy=true;button.disabled=true;const panel=button.parentElement.querySelector('[data-customer-history-results]');
   try{
    const page=await api(path+'/'+encodeURIComponent(button.dataset.customerHistory)+'/history'+(cursor?'?cursor='+encodeURIComponent(cursor):''));if(!current()||!button.isConnected)return;
    if(!cursor)panel.replaceChildren();
    panel.insertAdjacentHTML('beforeend',page.items.length?`<ul>${page.items.map(row=>`<li><button class="button small" type="button" data-open-history-request="${esc(row.id)}">${esc(row.customer?.name||'—')} · ${esc(t(row.status))}</button></li>`).join('')}</ul>`:`<p>${c.empty}</p>`);
    cursor=page.nextCursor||'';button.textContent=c.more;button.hidden=!page.hasMore;
   }catch(error){if(current()&&button.isConnected)panel.textContent=message(error)}finally{busy=false;if(button.isConnected)button.disabled=false}
  };
 }
}
