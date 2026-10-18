const copy={
 pt:{title:'Importar conversa do WhatsApp (.txt)',help:'Exporte a conversa sem mídia. O arquivo é lido neste aparelho. Selecione um trecho de até 6.000 caracteres, revise e salve a oportunidade. Fotos, áudio, PDF e ZIP não são importados aqui.',file:'Arquivo de texto',preview:'Conversa para revisão (selecione um trecho se necessário)',use:'Usar trecho selecionado ou conversa inteira',replace:'O campo de mensagem já contém texto. Apague-o somente se quiser substituí-lo.',large:'Use um arquivo de até 64 KiB.',invalid:'Selecione um arquivo .txt válido em UTF-8.',empty:'O arquivo está vazio.',limit:'Selecione um trecho de até 6.000 caracteres na conversa.',ready:'Conversa carregada localmente. Revise e selecione o trecho desejado.',done:'Trecho inserido. Revise a mensagem antes de salvar a oportunidade.',failed:'Não foi possível ler o arquivo. Tente novamente.'},
 en:{title:'Import WhatsApp conversation (.txt)',help:'Export the conversation without media. The file is read on this device. Select up to 6,000 characters, review and save the opportunity. Photos, audio, PDF and ZIP are not imported here.',file:'Text file',preview:'Conversation for review (select an excerpt if needed)',use:'Use selected excerpt or whole conversation',replace:'The message field already contains text. Clear it only if you want to replace it.',large:'Use a file up to 64 KiB.',invalid:'Select a valid UTF-8 .txt file.',empty:'The file is empty.',limit:'Select an excerpt of up to 6,000 characters in the conversation.',ready:'Conversation loaded locally. Review and select the desired excerpt.',done:'Excerpt inserted. Review the message before saving the opportunity.',failed:'Could not read the file. Try again.'},
 es:{title:'Importar conversación de WhatsApp (.txt)',help:'Exporta la conversación sin archivos multimedia. El archivo se lee en este dispositivo. Selecciona hasta 6.000 caracteres, revisa y guarda la oportunidad. Aquí no se importan fotos, audio, PDF ni ZIP.',file:'Archivo de texto',preview:'Conversación para revisar (selecciona un fragmento si es necesario)',use:'Usar fragmento seleccionado o conversación completa',replace:'El campo de mensaje ya contiene texto. Bórralo solo si quieres reemplazarlo.',large:'Usa un archivo de hasta 64 KiB.',invalid:'Selecciona un archivo .txt válido en UTF-8.',empty:'El archivo está vacío.',limit:'Selecciona un fragmento de hasta 6.000 caracteres en la conversación.',ready:'Conversación cargada localmente. Revisa y selecciona el fragmento deseado.',done:'Fragmento insertado. Revisa el mensaje antes de guardar la oportunidad.',failed:'No se pudo leer el archivo. Inténtalo de nuevo.'}
};
export function decodeConversation(bytes,name){
 if(!/\.txt$/i.test(String(name))||!(bytes instanceof Uint8Array))throw new Error('invalid');
 if(bytes.byteLength>65536)throw new Error('large');
 let text;
 try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes)}catch{throw new Error('invalid')}
 text=text.replace(/\r\n?/g,'\n');
 if(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(text))throw new Error('invalid');
 if(!text.trim())throw new Error('empty');
 return text;
}
export function conversationExcerpt(text,start=0,end=0){
 const value=(end>start?String(text).slice(start,end):String(text)).trim();
 if(!value)throw new Error('empty');
 if(value.length>6000)throw new Error('limit');
 return value;
}
export function renderConversationImport(lang='pt'){
 const c=copy[lang]||copy.pt;
 return `<details class="conversation-import"><summary>${c.title}</summary><p class="help">${c.help}</p><label>${c.file}<input data-conversation-file type="file" accept=".txt,text/plain"></label><div data-conversation-review hidden><label>${c.preview}<textarea data-conversation-text rows="7" readonly></textarea></label><button class="button small" type="button" data-conversation-use>${c.use}</button></div><p class="help" data-conversation-status role="status" aria-live="polite"></p></details>`;
}
export function bindConversationImport(form,lang='pt',isCurrent=()=>true){
 if(!form)return;
 const c=copy[lang]||copy.pt,file=form.querySelector('[data-conversation-file]'),preview=form.querySelector('[data-conversation-text]'),review=form.querySelector('[data-conversation-review]'),status=form.querySelector('[data-conversation-status]'),use=form.querySelector('[data-conversation-use]');
 if(!file)return;
 let sequence=0;
 file.addEventListener('change',async()=>{
  const current=++sequence,selected=file.files?.[0];
  preview.value='';review.hidden=true;status.textContent='';use.disabled=true;
  if(!selected)return;
  try{
   if(selected.size>65536)throw new Error('large');
   const bytes=new Uint8Array(await selected.arrayBuffer());
   if(current!==sequence||!form.isConnected||!isCurrent())return;
   preview.value=decodeConversation(bytes,selected.name);review.hidden=false;use.disabled=false;status.textContent=c.ready;
  }catch(error){if(current===sequence&&form.isConnected&&isCurrent())status.textContent=c[error.message]||c.failed}
  finally{if(current===sequence)file.value=''}
 });
 use.addEventListener('click',()=>{
  if(!form.isConnected||!isCurrent())return;
  const message=form.elements.message;
  if(message.value.trim()){status.textContent=c.replace;return}
  try{
   message.value=conversationExcerpt(preview.value,preview.selectionStart,preview.selectionEnd);
   if(form.elements.origin)form.elements.origin.value='whatsapp_manual';
   message.dispatchEvent(new Event('input',{bubbles:true}));
   preview.value='';review.hidden=true;status.textContent=c.done;message.focus();
  }catch(error){status.textContent=c[error.message]||c.failed}
 });
}
