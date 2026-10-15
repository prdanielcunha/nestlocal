// Pure, tenant-response-local join of independently paginated operational sources.
// Later sources override stale rows without changing the insertion order. Never
// use this function for authorization: every source comes from the authorized API.
export function mergeOperationalRows(...sources){
  const byId=new Map();
  for(const source of sources){
    if(!Array.isArray(source))continue;
    for(const row of source){
      if(!row||typeof row.id!=='string'||!row.id)continue;
      byId.set(row.id,row);
    }
  }
  return [...byId.values()];
}
