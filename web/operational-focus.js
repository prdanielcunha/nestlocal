/**
 * A single, explainable next step. The UI does not call AI automatically
 * and never interprets a drafted message as a sent message.
 */
export function chooseOperationalFocus({settings=null,services=[],requests=[],actions=[],readOnly=false}={}){
  if(readOnly)return {kind:'readonly'};
  if(!settings)return {kind:'setup'};
  const next=Array.isArray(actions)?actions.find(action=>action&&(action.requestId||action.customerId)):null;
  if(next)return {kind:'priority',action:next};
  if(!Array.isArray(services)||services.length===0)return {kind:'catalog'};
  if(settings.published!==true)return {kind:'publish'};
  if(!Array.isArray(requests)||requests.length===0)return {kind:'share'};
  return {kind:'healthy'};
}
