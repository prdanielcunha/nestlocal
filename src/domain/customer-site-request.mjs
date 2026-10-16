// Links one private customer-owned site to an internal service request.
// This is a snapshot of the site chosen by the operator, not a live link
// that retroactively changes previously quoted jobs.
const normalized=value=>String(value??'').trim().replace(/\s+/g,' ').toLocaleLowerCase('pt-BR');
export function customerSiteRequestSnapshot(site,{customerId,siteId,revision,addressLine,city}={}){
  if(!site||!customerId||!siteId)throw new TypeError('CUSTOMER_SITE_NOT_FOUND');
  const actual=Number(site.revision||1),expected=Number(revision);
  if(!Number.isSafeInteger(expected)||expected<1||actual!==expected)
    throw new TypeError('CUSTOMER_SITE_REVISION_CHANGED');
  if(normalized(site.line)!==normalized(addressLine)||normalized(site.city)!==normalized(city))
    throw new TypeError('CUSTOMER_SITE_ADDRESS_CHANGED');
  return {id:siteId,customerId,revision:actual,label:String(site.label||'').slice(0,100),
    equipment:Array.isArray(site.equipment)?site.equipment.slice(0,20):[]};
}
