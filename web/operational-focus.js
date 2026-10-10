/** Priority is derived from server-authored records; never invokes NestAI by itself. */
export function chooseOperationalFocus({settings=null,services=[],requests=[],drafts=[],actions=[],readOnly=false}={}){
  if(readOnly)return {kind:'readonly'};
  if(!settings)return {kind:'setup'};
  const next=Array.isArray(actions)?actions.find(a=>a&&(a.requestId||a.customerId)):null;
  if(next)return {kind:'priority',action:next};
  if(Array.isArray(drafts)&&drafts.some(x=>x&&x.state==='open'))return {kind:'draft'};
  if(!Array.isArray(services)||services.length===0)return {kind:'catalog'};
  if(settings.published!==true)return {kind:'publish'};
  if(!Array.isArray(requests)||requests.length===0)return {kind:'share'};
  return {kind:'healthy'};
}
