import {parseDelimitedTable} from './customer-import.js?v=20261018-site-table-v1';
const key=value=>value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const columns={label:['local','site','ubicacion'],line:['endereco','address','direccion'],city:['cidade','city','ciudad'],equipment:['equipamento','equipment','equipo'],notes:['observacoes','notes','notas']};
export function parseSiteBatch(text){
 if(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(String(text)))throw new Error('SITE_IMPORT_ROW');
 const table=parseDelimitedTable(text,401);if(table.length<2)throw new Error('SITE_IMPORT_EMPTY');
 const header=table[0].map(key),indices={};
 for(const [field,names] of Object.entries(columns)){
  const matches=header.flatMap((value,index)=>names.includes(value)?[index]:[]);
  if(matches.length>1||(['label','line','city'].includes(field)&&matches.length!==1))throw new Error('SITE_IMPORT_HEADER');
  indices[field]=matches[0]??-1;
 }
 if(header.some(value=>!Object.values(columns).flat().includes(value)))throw new Error('SITE_IMPORT_HEADER');
 const grouped=new Map();
 for(let index=1;index<table.length;index++){
  const row=table[index];if(row.length!==header.length)throw new Error('SITE_IMPORT_ROW');
  const value=Object.fromEntries(Object.entries(indices).map(([name,i])=>[name,i<0?'':row[i].trim().replace(/[\r\n\t]+/g,' ')]));
  if(value.label.length<2||value.label.length>100||value.line.length<5||value.line.length>180||value.city.length<2||value.city.length>80||value.equipment.length>100||value.notes.length>500)throw new Error('SITE_IMPORT_ROW');
  const identity=[value.label,value.line,value.city].map(x=>x.toLowerCase()).join('|');
  let site=grouped.get(identity);
  if(!site){site={label:value.label,line:value.line,city:value.city,notes:value.notes,equipment:[],sourceRows:[]};grouped.set(identity,site)}
  if(value.notes&&site.notes&&value.notes!==site.notes)throw new Error('SITE_IMPORT_NOTES_CONFLICT');
  if(value.notes)site.notes=value.notes;
  if(value.equipment){
   if(site.equipment.some(x=>x.toLowerCase()===value.equipment.toLowerCase()))throw new Error('SITE_IMPORT_EQUIPMENT_DUPLICATE');
   site.equipment.push(value.equipment);
  }
  site.sourceRows.push(index+1);
  if(grouped.size>20||site.equipment.length>20)throw new Error('SITE_IMPORT_LIMIT');
 }
 return [...grouped.values()];
}
const copies={
 pt:{title:'Importar locais e equipamentos',help:'Um cliente por importação. Use uma linha por equipamento e repita local, endereço e cidade. Máximo de 20 locais, 20 equipamentos por local e arquivo de 64 KiB. Os dados existentes são preservados.',file:'Arquivo CSV ou TSV',text:'Cole a planilha com cabeçalhos',sample:'Local;Endereço;Cidade;Equipamento;Observações\nMatriz;Rua Exemplo, 123;Londrina;Split da sala;Acesso pela recepção',template:'Baixar modelo CSV',preview:'Conferir importação',confirm:'Confirmar importação',create:'Novo local',existing:'Já cadastrado, sem alteração',conflict:'Conflito: revise o local existente',equipment:'equipamentos',rows:'Linhas',summary:'Novos / existentes / conflitos',empty:'A planilha está vazia.',header:'Use apenas as colunas Local, Endereço, Cidade, Equipamento e Observações. Local, Endereço e Cidade são obrigatórias.',invalid:'Confira as linhas: nome do local, endereço e cidade são obrigatórios. Nenhum dado foi importado.',duplicate:'Um equipamento aparece mais de uma vez no mesmo local. Dê nomes distintos para aparelhos diferentes.',notes:'Há observações diferentes para o mesmo local. Revise antes de importar.',limit:'A importação excede os limites de locais, equipamentos ou linhas.',fileLimit:'Use um arquivo de até 64 KiB.',fileInvalid:'Escolha um arquivo CSV ou TSV válido em UTF-8.',noChanges:'Todos os locais já existem sem alteração.',capacity:'O cliente ultrapassaria o limite de 20 locais.',changed:'Os locais mudaram desde a prévia. Confira novamente antes de confirmar.',failed:'Não foi possível concluir. Seus dados foram mantidos para tentar novamente.',saved:'Locais importados.'},
 en:{title:'Import sites and equipment',help:'One customer per import. Use one row per equipment item and repeat the site, address and city. Maximum 20 sites, 20 equipment items per site and a 64 KiB file. Existing records are preserved.',file:'CSV or TSV file',text:'Paste the spreadsheet including headers',sample:'Site;Address;City;Equipment;Notes\nHead office;Example street, 123;London;Meeting room AC;Reception entrance',template:'Download CSV template',preview:'Review import',confirm:'Confirm import',create:'New site',existing:'Already recorded, unchanged',conflict:'Conflict: review the existing site',equipment:'equipment items',rows:'Rows',summary:'New / existing / conflicts',empty:'The spreadsheet is empty.',header:'Use only Site, Address, City, Equipment and Notes columns. Site, Address and City are required.',invalid:'Check the rows: site name, address and city are required. Nothing was imported.',duplicate:'Equipment is repeated at the same site. Give different devices distinct names.',notes:'Notes differ for the same site. Review before importing.',limit:'The import exceeds site, equipment or row limits.',fileLimit:'Use a file up to 64 KiB.',fileInvalid:'Choose a valid UTF-8 CSV or TSV file.',noChanges:'All sites already exist unchanged.',capacity:'The customer would exceed the 20-site limit.',changed:'Sites changed after the preview. Review again before confirming.',failed:'Could not finish. Your input is preserved for another attempt.',saved:'Sites imported.'},
 es:{title:'Importar ubicaciones y equipos',help:'Un cliente por importación. Usa una fila por equipo y repite ubicación, dirección y ciudad. Máximo 20 ubicaciones, 20 equipos por ubicación y archivo de 64 KiB. Se conservan los datos existentes.',file:'Archivo CSV o TSV',text:'Pega la planilla con encabezados',sample:'Ubicación;Dirección;Ciudad;Equipo;Notas\nSede;Calle Ejemplo, 123;Madrid;Aire de la sala;Entrada por recepción',template:'Descargar modelo CSV',preview:'Revisar importación',confirm:'Confirmar importación',create:'Nueva ubicación',existing:'Ya registrada, sin cambios',conflict:'Conflicto: revisa la ubicación existente',equipment:'equipos',rows:'Filas',summary:'Nuevas / existentes / conflictos',empty:'La planilla está vacía.',header:'Usa solo Ubicación, Dirección, Ciudad, Equipo y Notas. Ubicación, Dirección y Ciudad son obligatorias.',invalid:'Revisa las filas: ubicación, dirección y ciudad son obligatorias. No se importó nada.',duplicate:'Un equipo aparece varias veces en la misma ubicación. Usa nombres distintos para aparatos diferentes.',notes:'Hay notas diferentes para la misma ubicación. Revisa antes de importar.',limit:'La importación excede los límites de ubicaciones, equipos o filas.',fileLimit:'Usa un archivo de hasta 64 KiB.',fileInvalid:'Elige un archivo CSV o TSV válido en UTF-8.',noChanges:'Todas las ubicaciones ya existen sin cambios.',capacity:'El cliente superaría el límite de 20 ubicaciones.',changed:'Las ubicaciones cambiaron después de la vista previa. Revisa de nuevo.',failed:'No se pudo finalizar. Se conservan los datos para intentarlo de nuevo.',saved:'Ubicaciones importadas.'}
};
export function renderSiteImport(customerId,lang,esc){
 const c=copies[lang]||copies.pt;
 return `<details class="site-batch"><summary>${c.title}</summary><form data-site-batch="${esc(customerId)}"><p class="help">${c.help}</p><button type="button" class="button small" data-site-template>${c.template}</button><label>${c.file}<input type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values" data-site-file></label><label>${c.text}<textarea name="siteImportText" maxlength="64000" rows="5" placeholder="${esc(c.sample)}"></textarea></label><div data-site-preview></div><p class="help" role="status" aria-live="polite" data-site-status></p><button class="button primary small" type="submit">${c.preview}</button></form></details>`;
}
export function bindSiteImports({root=document,lang,orgId,uid,api,isCurrent,onSaved,esc}){
 const c=copies[lang]||copies.pt;
 for(const form of root.querySelectorAll('[data-site-batch]')){
  const text=form.elements.siteImportText,file=form.querySelector('[data-site-file]'),button=form.querySelector('[type=submit]'),status=form.querySelector('[data-site-status]'),panel=form.querySelector('[data-site-preview]'),
   base='/api/organizations/'+encodeURIComponent(orgId)+'/nestlocal/customers/'+encodeURIComponent(form.dataset.siteBatch)+'/sites/import';
  let preview=null,operationKey='',sequence=0,busy=false;
  const current=()=>form.isConnected&&isCurrent(orgId,uid);
  const reset=()=>{preview=null;operationKey='';panel.replaceChildren();status.textContent='';button.textContent=c.preview;button.disabled=false};
  const errorCopy=error=>({SITE_IMPORT_EMPTY:c.empty,SITE_IMPORT_HEADER:c.header,SITE_IMPORT_ROW:c.invalid,SITE_IMPORT_EQUIPMENT_DUPLICATE:c.duplicate,SITE_IMPORT_NOTES_CONFLICT:c.notes,SITE_IMPORT_LIMIT:c.limit,CUSTOMER_IMPORT_FILE_LIMIT:c.fileLimit,CUSTOMER_IMPORT_ROW_LIMIT:c.limit,CUSTOMER_IMPORT_INVALID_CSV:c.invalid,CUSTOMER_SITE_LIMIT:c.capacity,SITE_IMPORT_PREVIEW_STALE:c.changed,SITE_IMPORT_CONFLICT:c.conflict,SITE_IMPORT_KEY_CONFLICT:c.changed,INVALID_SITE_IMPORT:c.invalid,INVALID_CUSTOMER_SITE:c.invalid}[error.message]||c.failed);
  text.addEventListener('input',()=>{sequence++;reset()});
  file.addEventListener('change',async()=>{
   if(busy)return;
   const selected=file.files?.[0],version=++sequence;if(!selected)return;
   try{
    if(selected.size>65536)throw new Error('CUSTOMER_IMPORT_FILE_LIMIT');
    if(!/\.(csv|tsv)$/i.test(selected.name))throw new Error('FILE_INVALID');
    let value;try{value=new TextDecoder('utf-8',{fatal:true}).decode(await selected.arrayBuffer())}catch{throw new Error('FILE_INVALID')}
    if(!current()||version!==sequence)return;
    if(value.length>64000)throw new Error('CUSTOMER_IMPORT_FILE_LIMIT');
    parseSiteBatch(value);text.value=value;text.dispatchEvent(new Event('input',{bubbles:true}));
   }catch(error){if(current()&&version===sequence){reset();status.textContent=error.message==='FILE_INVALID'?c.fileInvalid:errorCopy(error)}}
   finally{if(file.files?.[0]===selected)file.value=''}
  });
  form.querySelector('[data-site-template]').onclick=()=>{
   const url=URL.createObjectURL(new Blob(['\uFEFF'+c.sample+'\n'],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');
   link.href=url;link.download='nestlocal-sites.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
  };
  form.addEventListener('submit',async event=>{
   event.preventDefault();if(busy||!current())return;
   busy=true;button.disabled=true;text.readOnly=true;file.disabled=true;const version=++sequence;
   try{
    if(!preview){
     const parsed=parseSiteBatch(text.value),sites=parsed.map(({sourceRows,...site})=>site);
     const result=await api(base+'/preview',{method:'POST',body:JSON.stringify({sites})});
     if(!current()||version!==sequence)return;
     preview={...result,sites};operationKey='nl-'+crypto.randomUUID();
     panel.innerHTML=`<p>${c.summary}: ${result.counts.create} / ${result.counts.existing} / ${result.counts.conflict}</p><ul>${result.rows.map(row=>`<li><strong>${esc(row.label)}</strong> — ${esc(row.line)} · ${esc(row.city)}<br>${c.rows}: ${parsed[row.index].sourceRows.join(', ')} · ${row.equipment.length} ${c.equipment} · ${esc(c[row.status==='create'?'create':row.status==='existing'?'existing':'conflict'])}</li>`).join('')}</ul>`;
     button.textContent=c.confirm;button.disabled=!result.canImport;
     status.textContent=!result.withinLimit?c.capacity:result.counts.conflict?c.conflict:result.counts.create===0?c.noChanges:'';
    }else{
     const result=await api(base,{method:'POST',body:JSON.stringify({sites:preview.sites,previewToken:preview.previewToken,operationKey})});
     if(!current()||version!==sequence)return;
     text.value='';reset();status.textContent=c.saved;await onSaved(result,form);
    }
   }catch(error){
    if(current()&&version===sequence){if(['SITE_IMPORT_PREVIEW_STALE','SITE_IMPORT_KEY_CONFLICT'].includes(error.message))reset();status.textContent=errorCopy(error)}
   }finally{busy=false;if(current()){text.readOnly=false;file.disabled=false;button.disabled=preview?!preview.canImport:false}}
  });
 }
}
