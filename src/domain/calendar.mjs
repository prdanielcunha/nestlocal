// NestLocal calendar feed — public-capability URL, minimal service metadata, one-way read-only.
// No customer's name, phone, address, notes, payment or tracking token may be exported.
const OK=/^\d{4}-\d{2}-\d{2}$/;
const windows={morning:'Manhã',afternoon:'Tarde',evening:'Noite',flexible:'Período flexível'};
function validDate(iso){
  if(!OK.test(String(iso||'')))return false;
  const d=new Date(iso+'T00:00:00Z');
  return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===iso;
}
export function isoDayAdd(date,days){
  if(!validDate(date)||!Number.isSafeInteger(days)||Math.abs(days)>3660)return null;
  const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+days);
  return d.toISOString().slice(0,10);
}
function icsValue(text){
  return String(text||'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\n/g,'\\n').slice(0,300);
}
function fold(line){
  const bytes=Buffer.from(line,'utf8');let out=[],p=0,first=true;
  while(p<bytes.length){let len=Math.min(first?75:74,bytes.length-p);
    while(len>0&&p+len<bytes.length&&(bytes[p+len]&0xc0)===0x80)len--;
    out.push((first?'':' ')+bytes.subarray(p,p+len).toString('utf8'));
    p+=len;first=false;
  }
  return out.join('\r\n');
}
const dt=d=>d.replace(/-/g,'');
export function buildNestLocalIcs({organizationId,events,issuedAt=new Date()}={}){
  if(!/^[A-Za-z0-9_-]{2,128}$/.test(organizationId||''))throw Error('INVALID_CALENDAR_ORGANIZATION');
  if(!Array.isArray(events)||events.length>250)throw Error('INVALID_CALENDAR_EVENTS');
  const stamp=issuedAt.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//MillionsNest//NestLocal Agenda//PT','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:NestLocal - Meus servicos','X-WR-CALDESC:Agenda somente leitura do NestLocal; nao edite por este calendario.'];
  for(const e of events){
    if(!e||!/^[A-Za-z0-9_-]{1,128}$/.test(e.id||'')||!validDate(e.date))continue;
    const next=isoDayAdd(e.date,1),service=icsValue(e.serviceName||'Serviço'),
      window=windows[e.window]||windows.flexible,version=Number.isSafeInteger(e.sequence)?Math.max(0,e.sequence):0;
    lines.push('BEGIN:VEVENT','UID:'+e.id+'.'+organizationId+'@calendar.nestlocal.millionsnest.com',
      'DTSTAMP:'+stamp,'DTSTART;VALUE=DATE:'+dt(e.date),'DTEND;VALUE=DATE:'+dt(next),
      'SEQUENCE:'+version,
      'SUMMARY:'+icsValue('NestLocal · '+service+' ('+window+')'),
      'DESCRIPTION:'+icsValue('Serviço agendado no NestLocal. Período: '+window+'. Confira o horário exato no painel da empresa.'),
      'STATUS:CONFIRMED','TRANSP:OPAQUE',
      'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:Serviço NestLocal amanhã','TRIGGER:-P1D','END:VALARM',
      'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:Serviço NestLocal hoje','TRIGGER:PT9H','END:VALARM',
      'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n')+'\r\n';
}
export function safeCalendarEvents(requests,services,{uid,seeAll=false}={}){
  if(!Array.isArray(requests)||!Array.isArray(services))return [];
  const serviceName=new Map(services.map(s=>[s.id,s.name]));
  return requests.filter(r=>r&&['scheduled','in_progress'].includes(r.status)
    &&validDate(r.schedule?.date)&&(seeAll||r.schedule?.assignedTo===uid))
    .slice(0,250)
    .map(r=>({
      id:r.id,date:r.schedule.date,window:r.schedule.window||'flexible',
      serviceName:String(serviceName.get(r.serviceId)||'Serviço').slice(0,100),
      sequence:0
    }));
}
