// Per-request field checklist. No destructive migrations or assumptions about
// the customer's industry. Checklist content is explicit and operator-owned.
export function validateExecutionChecklist(input){
  if(!Array.isArray(input)||input.length>20)throw new TypeError('INVALID_EXECUTION_CHECKLIST');
  const ids=new Set();
  return input.map((item,index)=>{
    if(!item||typeof item!=='object'||Array.isArray(item))throw new TypeError('INVALID_EXECUTION_CHECKLIST');
    const id=typeof item.id==='string'?item.id.trim():'';
    const label=typeof item.label==='string'?item.label.trim().replace(/[\r\n\t]+/g,' '):'';
    if(!/^[A-Za-z0-9_-]{1,64}$/.test(id)||ids.has(id)||label.length<2||label.length>120||
       typeof item.done!=='boolean')throw new TypeError('INVALID_EXECUTION_CHECKLIST');
    ids.add(id);
    return {id,label,done:item.done,order:index};
  });
}
export function executionChecklistSummary(items=[]){
  const rows=Array.isArray(items)?items:[];
  return {total:rows.length,done:rows.filter(x=>x?.done===true).length};
}
