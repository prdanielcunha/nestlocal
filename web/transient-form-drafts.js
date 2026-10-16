// Short-lived, in-memory edits across re-renders; never persisted to disk,
// localStorage, sessionStorage, telemetry, URLs or server drafts.
// Inputs containing credentials, files, or opaque hidden IDs are excluded.
const forbiddenTypes=new Set(['password','file','hidden','submit','reset','button','image']);
function formFields(elements){
  const counters=new Map(),rows=[];
  for(const field of Array.from(elements||[]).slice(0,150)){
    const name=String(field?.name||'').trim(),type=String(field?.type||'text').toLowerCase();
    if(!name||field.disabled||forbiddenTypes.has(type))continue;
    const base=name+'|'+type;
    const count=counters.get(base)||0;counters.set(base,count+1);
    const key=type==='checkbox'||type==='radio'?base+'|'+String(field.value||''):base+'|'+count;
    rows.push({key,field,type});
  }
  return rows;
}
export function captureTransientForm(elements){
  return formFields(elements).map(({key,field,type})=>({
    key,type,value:type==='checkbox'||type==='radio'?'':String(field.value||'').slice(0,5000),
    checked:type==='checkbox'||type==='radio'?field.checked===true:undefined
  }));
}
export function restoreTransientForm(elements,draft){
  if(!Array.isArray(draft))return 0;
  const values=new Map(draft.filter(item=>item&&typeof item.key==='string').map(item=>[item.key,item]));
  let restored=0;
  for(const {key,field,type} of formFields(elements)){
    const item=values.get(key);if(!item||item.type!==type)continue;
    if(type==='checkbox'||type==='radio')field.checked=item.checked===true;
    else if(typeof item.value==='string')field.value=item.value;
    restored++;
  }
  return restored;
}
