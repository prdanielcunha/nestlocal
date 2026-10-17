// CSV/TSV parsing stays on-device. Only reviewed, bounded customer rows reach
// the tenant API; attachments are never uploaded to an external AI provider.
const key=value=>value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const aliases={
 name:['nome','name','nombre'],phone:['whatsapp','telefone','phone','telefono'],
 city:['cidade','city','ciudad'],addressLine:['endereco','address','direccion'],
 lastServiceLabel:['ultimo servico','last service','ultimo servicio'],
 lastServiceDate:['ultimo atendimento','last service date','ultima atencion'],
 nextServiceDate:['proximo retorno','next return','proxima visita'],
 nextServiceReason:['motivo do retorno','return reason','motivo','reason','motivo del retorno']
};
const fields=Object.keys(aliases);
function table(text,delimiter){
 const rows=[];let row=[],cell='',quoted=false,closed=false;
 const pushCell=()=>{row.push(cell.trim());cell='';closed=false};
 const pushRow=()=>{pushCell();if(row.some(Boolean))rows.push(row);row=[];
  if(rows.length>101)throw new TypeError('CUSTOMER_IMPORT_ROW_LIMIT')};
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++}else{quoted=false;closed=true}}else cell+=c;continue}
  if(c===delimiter){pushCell();continue}
  if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;pushRow();continue}
  if(c==='"'){if(cell.trim()||closed)throw new TypeError('CUSTOMER_IMPORT_INVALID_CSV');cell='';quoted=true;continue}
  if(closed&&!/\s/.test(c))throw new TypeError('CUSTOMER_IMPORT_INVALID_CSV');
  cell+=c;
 }
 if(quoted)throw new TypeError('CUSTOMER_IMPORT_INVALID_CSV');
 if(cell||row.length)pushRow();
 return rows;
}
function importDate(value){
 if(!value)return '';
 const match=value.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
 // Keep unrecognized dates visible to server validation, never silently erase.
 return match?`${match[3]}-${match[2].padStart(2,'0')}-${match[1].padStart(2,'0')}`:value;
}
export function parseCustomerBatch(input){
 const text=String(input||'').replace(/^\uFEFF/,'');
 if(new TextEncoder().encode(text).length>65536)throw new TypeError('CUSTOMER_IMPORT_FILE_LIMIT');
 if(!text.trim())return [];
 // Count delimiters outside quotes on the first logical record only.
 const counts=new Map([['\t',0],[';',0],[',',0]]);let quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){i++;continue}quoted=!quoted}
  if(!quoted){if(c==='\r'||c==='\n')break;if(counts.has(c))counts.set(c,counts.get(c)+1)}
 }
 const delimiter=[...counts].sort((a,b)=>b[1]-a[1])[0][0],rows=table(text,delimiter);
 if(!rows.length)return [];
 const header=rows[0].map(key),index=Object.fromEntries(fields.map(field=>[field,header.findIndex(h=>aliases[field].includes(h))]));
 const hasHeader=index.name>=0&&index.phone>=0;
 if(hasHeader&&new Set(Object.values(index).filter(i=>i>=0)).size!==Object.values(index).filter(i=>i>=0).length)
  throw new TypeError('CUSTOMER_IMPORT_INVALID_HEADER');
 for(const field of fields)if(hasHeader&&header.filter(h=>aliases[field].includes(h)).length>1)throw new TypeError('CUSTOMER_IMPORT_INVALID_HEADER');
 const data=hasHeader?rows.slice(1):rows;
 if(data.length>100)throw new TypeError('CUSTOMER_IMPORT_ROW_LIMIT');
 return data.map(row=>Object.fromEntries(fields.map((field,i)=>{
  const value=row[hasHeader?index[field]:i]||'';
  return [field,field.endsWith('Date')?importDate(value):value];
 })));
}
