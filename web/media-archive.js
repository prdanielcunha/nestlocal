// Local ZIP reader, deliberately bounded and read-only. No filesystem extraction,
// network requests, recursive archives or automatic processing of every member.
const MiB=1024*1024;
const limitFor=name=>/\.txt$/i.test(name)?65536:/\.(mp3|wav|ogg|m4a|opus|webm)$/i.test(name)?20*MiB:/\.(png|jpe?g|webp|pdf)$/i.test(name)?8*MiB:0;
const crcTable=Uint32Array.from({length:256},(_,value)=>{for(let bit=0;bit<8;bit++)value=(value>>>1)^((value&1)?0xedb88320:0);return value>>>0});
export function archiveCrc32(bytes){
 let crc=0xffffffff;for(const byte of bytes)crc=(crc>>>8)^crcTable[(crc^byte)&255];return (crc^0xffffffff)>>>0;
}
function fail(){throw Error('archiveInvalid')}
function safeName(raw){
 let name;try{name=new TextDecoder('utf-8',{fatal:true}).decode(raw).normalize('NFC')}catch{fail()}
 if(!name||name.length>512||/[\x00-\x1f\x7f\\:]/.test(name)||name.startsWith('/')||name.split('/').some(part=>part==='..'||part==='.')||name.includes('//'))fail();return name;
}
export async function openMediaArchive(file){
 if(!Number.isSafeInteger(file?.size)||file.size<22||file.size>20*MiB)throw Error('archiveLarge');
 const bytes=new Uint8Array(await file.arrayBuffer());if(bytes.length!==file.size)fail();
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),u16=o=>view.getUint16(o,true),u32=o=>view.getUint32(o,true);
 let end=-1;for(let at=bytes.length-22;at>=Math.max(0,bytes.length-65557);at--)if(u32(at)===0x06054b50&&at+22+u16(at+20)===bytes.length){end=at;break}
 if(end<0||u16(end+4)||u16(end+6)||u16(end+8)!==u16(end+10))fail();
 const count=u16(end+10),size=u32(end+12),start=u32(end+16);
 if(!count||count>200||start+size!==end||u32(0)!==0x04034b50)fail();
 let at=start,total=0;const records=[],names=new Set(),ranges=[];
 for(let i=0;i<count;i++){
  if(at+46>end||u32(at)!==0x02014b50)fail();
  const flags=u16(at+8),method=u16(at+10),crc=u32(at+16),compressed=u32(at+20),length=u32(at+24),nameLength=u16(at+28),extraLength=u16(at+30),commentLength=u16(at+32),offset=u32(at+42),attrs=u32(at+38);
  const next=at+46+nameLength+extraLength+commentLength;
  if(next>end||flags&~0x080e||![0,8].includes(method)||u16(at+34)||[compressed,length,offset].includes(0xffffffff))fail();
  const rawName=bytes.subarray(at+46,at+46+nameLength),name=safeName(rawName),key=name.toLowerCase();
  if(names.has(key))fail();names.add(key);
  const type=(attrs>>>16)&0xf000;if(type&&type!==0x8000&&type!==0x4000)fail();
  for(let ex=at+46+nameLength;ex<at+46+nameLength+extraLength;){if(ex+4>at+46+nameLength+extraLength)fail();const tag=u16(ex),n=u16(ex+2);ex+=4+n;if(tag===1||ex>at+46+nameLength+extraLength)fail()}
  total+=length;if(total>40*MiB)throw Error('archiveLarge');
  if(offset+30>start||u32(offset)!==0x04034b50||u16(offset+6)!==flags||u16(offset+8)!==method||u16(offset+26)!==nameLength)fail();
  const data=offset+30+nameLength+u16(offset+28);
  if(data+compressed>start||data<offset+30||!rawName.every((b,index)=>b===bytes[offset+30+index]))fail();
  if(!(flags&8)&&(u32(offset+14)!==crc||u32(offset+18)!==compressed||u32(offset+22)!==length))fail();
  if(method===0&&length!==compressed)fail();ranges.push([offset,data+compressed]);
  const limit=limitFor(name);if(!name.endsWith('/')&&type!==0x4000&&limit&&length>0&&length<=limit)records.push({name,size:length,method,crc,compressed,data,limit});
  at=next;
 }
 if(at!==end)fail();ranges.sort((a,b)=>a[0]-b[0]);for(let i=1;i<ranges.length;i++)if(ranges[i][0]<ranges[i-1][1])fail();
 if(!records.length)throw Error('archiveEmpty');
 return {
  entries:records.map(({name,size})=>({name,size})),
  async extract(index,{signal}={}){
   if(!Number.isSafeInteger(index)||!records[index])fail();signal?.throwIfAborted();
   const record=records[index],chunks=[];let length=0,reader;
   try{
    let stream=new Blob([bytes.subarray(record.data,record.data+record.compressed)]).stream();
    if(record.method===8){let decoder;try{decoder=new DecompressionStream('deflate-raw')}catch{throw Error('archiveUnsupported')}stream=stream.pipeThrough(decoder)}
    reader=stream.getReader();const abort=()=>{void reader.cancel().catch(()=>{})};signal?.addEventListener('abort',abort,{once:true});
    try{while(true){signal?.throwIfAborted();const {done,value}=await reader.read();signal?.throwIfAborted();if(done)break;length+=value.length;if(length>record.size||length>record.limit)throw Error('archiveLarge');chunks.push(value)}}finally{signal?.removeEventListener('abort',abort)}
    if(length!==record.size)fail();const result=new Uint8Array(length);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length}
    if(archiveCrc32(result)!==record.crc)fail();return new File([result],record.name.split('/').pop(),{type:/\.txt$/i.test(record.name)?'text/plain':''});
   }finally{if(reader)await reader.cancel().catch(()=>{});chunks.length=0}
  }
 };
}
