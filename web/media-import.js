import {conversationExcerpt} from './conversation-import.js?v=20261018-v1';
const copies={
 pt:{title:'Importar imagem, PDF ou áudio',help:'Leitura local, sem API paga. Imagens e uma página de PDF por vez podem virar texto. Áudio fica disponível para ouvir e transcrever manualmente. Revise: OCR pode errar. Só o texto escolhido será salvo ao enviar a oportunidade; o arquivo não é enviado.',file:'Arquivo (imagem/PDF até 8 MiB; áudio até 20 MiB)',page:'Página do PDF',language:'Idioma do texto',read:'Ler imagem ou página',cancel:'Cancelar leitura',text:'Texto para revisão ou transcrição manual',use:'Usar texto revisado ou trecho selecionado',busy:'Lendo neste aparelho…',ready:'Revise e corrija o texto antes de usá-lo.',audio:'Ouça e digite a transcrição no campo abaixo. Não há transcrição automática de áudio.',replace:'O campo da mensagem já tem texto. Não foi substituído.',large:'Arquivo acima do limite ou imagem acima de 20 megapixels.',invalid:'Use PNG, JPEG, WebP, PDF, MP3, WAV, OGG ou M4A.',failed:'Não foi possível ler. Tente outra página ou digite o texto manualmente.',empty:'Nenhum texto encontrado. Selecione outra página ou transcreva manualmente.',limit:'Selecione um trecho de até 6.000 caracteres.',done:'Texto inserido. Revise a oportunidade antes de salvar.',pages:'Páginas',cancelled:'Leitura cancelada.'},
 en:{title:'Import image, PDF or audio',help:'Local reading, no paid API. Images and one PDF page at a time can become text. Audio is available for playback and manual transcription. Review: OCR can be wrong. Only the selected text is saved when submitting the opportunity; the file is not uploaded.',file:'File (image/PDF up to 8 MiB; audio up to 20 MiB)',page:'PDF page',language:'Text language',read:'Read image or page',cancel:'Cancel reading',text:'Text to review or manually transcribe',use:'Use reviewed text or selected excerpt',busy:'Reading on this device…',ready:'Review and correct the text before using it.',audio:'Listen and type the transcript below. Automatic audio transcription is not available.',replace:'The message already contains text. It was not replaced.',large:'File exceeds the limit or image exceeds 20 megapixels.',invalid:'Use PNG, JPEG, WebP, PDF, MP3, WAV, OGG or M4A.',failed:'Could not read. Try another page or enter the text manually.',empty:'No text found. Select another page or transcribe manually.',limit:'Select an excerpt of up to 6,000 characters.',done:'Text inserted. Review the opportunity before saving.',pages:'Pages',cancelled:'Reading cancelled.'},
 es:{title:'Importar imagen, PDF o audio',help:'Lectura local, sin API de pago. Imágenes y una página de PDF a la vez pueden convertirse en texto. El audio permite escuchar y transcribir manualmente. Revisa: OCR puede equivocarse. Solo el texto elegido se guarda al enviar la oportunidad; el archivo no se envía.',file:'Archivo (imagen/PDF hasta 8 MiB; audio hasta 20 MiB)',page:'Página del PDF',language:'Idioma del texto',read:'Leer imagen o página',cancel:'Cancelar lectura',text:'Texto para revisar o transcribir manualmente',use:'Usar texto revisado o fragmento seleccionado',busy:'Leyendo en este dispositivo…',ready:'Revisa y corrige el texto antes de usarlo.',audio:'Escucha y escribe la transcripción abajo. No hay transcripción automática de audio.',replace:'El mensaje ya contiene texto. No se reemplazó.',large:'Archivo demasiado grande o imagen de más de 20 megapíxeles.',invalid:'Usa PNG, JPEG, WebP, PDF, MP3, WAV, OGG o M4A.',failed:'No se pudo leer. Prueba otra página o escribe el texto manualmente.',empty:'No se encontró texto. Elige otra página o transcribe manualmente.',limit:'Selecciona un fragmento de hasta 6.000 caracteres.',done:'Texto insertado. Revisa la oportunidad antes de guardar.',pages:'Páginas',cancelled:'Lectura cancelada.'}
};
export function mediaKind(file){
 const name=String(file?.name||''),kind=/\.(png|jpe?g|webp)$/i.test(name)?'image':/\.pdf$/i.test(name)?'pdf':/\.(mp3|wav|ogg|m4a)$/i.test(name)?'audio':null;
 if(!kind)throw Error('invalid');if(!Number.isFinite(file.size)||file.size<=0)throw Error('empty');
 if(file.size>(kind==='audio'?20:8)*1024*1024)throw Error('large');return kind;
}
export function mediaText(text){const value=String(text||'').replace(/\r\n?/g,'\n').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,'');if(value.length>60000)throw Error('large');return value}
export function renderMediaImport(lang='pt'){
 const c=copies[lang]||copies.pt;
 return `<details class="media-import"><summary>${c.title}</summary><p class="help">${c.help}</p><label>${c.file}<input data-media-file type="file" accept=".png,.jpg,.jpeg,.webp,.pdf,.mp3,.wav,.ogg,.m4a"></label><div data-media-options hidden><label data-media-page-label hidden>${c.page}<input data-media-page type="number" min="1" max="10000" value="1" step="1"></label><label>${c.language}<select data-media-lang><option value="por"${lang==='pt'?' selected':''}>Português</option><option value="eng"${lang==='en'?' selected':''}>English</option><option value="spa"${lang==='es'?' selected':''}>Español</option></select></label><button class="button small" type="button" data-media-read>${c.read}</button><button class="button small" type="button" data-media-cancel hidden>${c.cancel}</button></div><audio data-media-audio controls preload="none" hidden></audio><div data-media-review hidden><label>${c.text}<textarea data-media-text rows="7" maxlength="60000"></textarea></label><button class="button small" type="button" data-media-use>${c.use}</button></div><p class="help" data-media-status role="status" aria-live="polite"></p></details>`;
}
export function bindMediaImport(form,lang='pt',isCurrent=()=>true){
 if(!form)return;const host=form.querySelector('.media-import');if(!host)return;
 const c=copies[lang]||copies.pt,q=s=>host.querySelector('[data-media-'+s+']'),file=q('file'),text=q('text'),status=q('status'),read=q('read'),cancel=q('cancel'),audio=q('audio');
 let selected,kind,sequence=0,worker,loading,objectUrl,timer,disposed=false;
 const current=seq=>!disposed&&seq===sequence&&form.isConnected&&isCurrent();
 const stop=()=>{sequence++;clearTimeout(timer);const pending=worker;worker=null;if(pending)void pending.terminate().catch(()=>{});if(loading){void loading.destroy().catch(()=>{});loading=null}read.disabled=false;cancel.hidden=true};
 const clearAudio=()=>{audio.pause();audio.removeAttribute('src');audio.load();audio.hidden=true;if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=null};
 const observer=new MutationObserver(()=>{if(!form.isConnected||!isCurrent()){disposed=true;stop();clearAudio();selected=null;text.value='';observer.disconnect()}});observer.observe(document.body,{childList:true,subtree:true});
 file.onchange=()=>{
  stop();clearAudio();selected=file.files?.[0];text.value='';q('review').hidden=true;q('options').hidden=true;status.textContent='';
  if(!selected)return;
  try{kind=mediaKind(selected);q('review').hidden=false;if(kind==='audio'){objectUrl=URL.createObjectURL(selected);audio.src=objectUrl;audio.hidden=false;status.textContent=c.audio}else{q('options').hidden=false;q('page-label').hidden=kind!=='pdf';q('page').value='1'}}catch(error){selected=null;status.textContent=c[error.message]||c.failed}
  file.value='';
 };
 cancel.onclick=()=>{stop();status.textContent=c.cancelled};
 read.onclick=async()=>{
  if(!selected||!form.isConnected||!isCurrent()||read.disabled)return;
  stop();const seq=sequence,input=selected,pageNumber=Number(q('page').value);read.disabled=true;cancel.hidden=false;status.textContent=c.busy;
  timer=setTimeout(()=>{if(current(seq)){stop();status.textContent=c.failed}},90000);
  let bitmap,pdf,pdfTask;
  const ocr=async image=>{
   const {default:{createWorker}}=await import('./vendor/media-v1/tesseract.esm.min.js');if(!current(seq))return '';
   const base=new URL('./vendor/media-v1/',import.meta.url).href;
   const created=await createWorker(q('lang').value,1,{workerPath:base+'worker.min.js',corePath:base+'core',langPath:base+'languages',workerBlobURL:false,cacheMethod:'none',errorHandler:()=>{}});
   if(!current(seq)){await created.terminate();return ''}worker=created;
   return (await created.recognize(image)).data.text;
  };
  try{
   let output='';
   if(kind==='pdf'){
    if(!Number.isSafeInteger(pageNumber)||pageNumber<1||pageNumber>10000)throw Error('invalid');
    const sdk=await import('./vendor/media-v1/pdf.min.mjs');if(!current(seq))return;
    sdk.GlobalWorkerOptions.workerSrc=new URL('./vendor/media-v1/pdf.worker.min.mjs',import.meta.url).href;
    pdfTask=sdk.getDocument({data:new Uint8Array(await input.arrayBuffer()),isEvalSupported:false,disableFontFace:true,useSystemFonts:true});loading=pdfTask;pdf=await pdfTask.promise;if(!current(seq))return;
    if(pageNumber>pdf.numPages)throw Error('invalid');const page=await pdf.getPage(pageNumber),content=await page.getTextContent();
    output=content.items.map(item=>(item.str||'')+(item.hasEOL?'\n':' ')).join('');
    if(!output.trim()){
     const view=page.getViewport({scale:1}),scale=Math.min(2,Math.sqrt(4000000/(view.width*view.height))),viewport=page.getViewport({scale}),canvas=document.createElement('canvas');
     canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
     if(!current(seq))return;output=await ocr(canvas);canvas.width=canvas.height=0;
    }
    if(current(seq))status.textContent=`${c.pages}: ${pageNumber}/${pdf.numPages}. ${c.ready}`;
   }else{
    bitmap=await createImageBitmap(input);if(bitmap.width*bitmap.height>20000000)throw Error('large');if(!current(seq))return;
    const scale=Math.min(1,Math.sqrt(4000000/(bitmap.width*bitmap.height))),canvas=document.createElement('canvas');canvas.width=Math.ceil(bitmap.width*scale);canvas.height=Math.ceil(bitmap.height*scale);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
    output=await ocr(canvas);canvas.width=canvas.height=0;
   }
   if(current(seq)){text.value=mediaText(output);q('review').hidden=false;if(kind!=='pdf')status.textContent=c.ready;if(!text.value.trim())status.textContent=c.empty}
  }catch(error){if(current(seq))status.textContent=c[error.message]||c.failed}
  finally{bitmap?.close();if(pdfTask)await pdfTask.destroy().catch(()=>{});if(current(seq)){loading=null;stop()}}
 };
 q('use').onclick=()=>{
  if(!form.isConnected||!isCurrent())return;const message=form.elements.message;if(message.value.trim()){status.textContent=c.replace;return}
  try{message.value=conversationExcerpt(text.value,text.selectionStart,text.selectionEnd);message.dispatchEvent(new Event('input',{bubbles:true}));text.value='';stop();clearAudio();selected=null;q('review').hidden=true;q('options').hidden=true;status.textContent=c.done;message.focus()}catch(error){status.textContent=c[error.message]||c.failed}
 };
}
