// Tenant-local customer service locations, deliberately separate from the
// primary customer identity and existing request history.
export function validateCustomerSite(input={}){
 const single=(value,max)=>typeof value==='string'?value.trim().replace(/[\r\n\t]+/g,' ').slice(0,max):'';
 const label=single(input.label,100),line=single(input.line,180),city=single(input.city,80),notes=single(input.notes,500);
 const equipment=Array.isArray(input.equipment)?input.equipment:[];
 if(label.length<2||line.length<5||city.length<2||!Array.isArray(input.equipment)||equipment.length>20)
   throw new TypeError('INVALID_CUSTOMER_SITE');
 const names=equipment.map(name=>single(name,100)).filter(Boolean);
 if(names.length!==equipment.length||new Set(names.map(name=>name.toLocaleLowerCase('pt-BR'))).size!==names.length)
   throw new TypeError('INVALID_CUSTOMER_SITE');
 return {label,line,city,notes,equipment:names};
}
