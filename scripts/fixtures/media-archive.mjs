import {crc32,deflateRawSync} from 'node:zlib';
// Synthetic fixtures only. Independent CRC implementation supplied by Node.
export function zipFixture(entries){
 const locals=[],centrals=[];let offset=0;
 for(const entry of entries){
  const name=Buffer.from(entry.name),data=Buffer.from(entry.text??'Synthetic request'),method=entry.method??8,compressed=method===0?data:deflateRawSync(data),crc=entry.crc??crc32(data),size=entry.size??data.length,flags=entry.flags??0x800;
  const local=Buffer.alloc(30+name.length);local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt16LE(flags,6);local.writeUInt16LE(method,8);local.writeUInt32LE(flags&8?0:crc,14);local.writeUInt32LE(flags&8?0:compressed.length,18);local.writeUInt32LE(flags&8?0:size,22);local.writeUInt16LE(name.length,26);name.copy(local,30);
  const descriptor=flags&8?Buffer.alloc(16):Buffer.alloc(0);if(descriptor.length){descriptor.writeUInt32LE(0x08074b50);descriptor.writeUInt32LE(crc,4);descriptor.writeUInt32LE(compressed.length,8);descriptor.writeUInt32LE(size,12)}
  const central=Buffer.alloc(46+name.length);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(0x314,4);central.writeUInt16LE(20,6);central.writeUInt16LE(flags,8);central.writeUInt16LE(method,10);central.writeUInt32LE(crc,16);central.writeUInt32LE(compressed.length,20);central.writeUInt32LE(size,24);central.writeUInt16LE(name.length,28);central.writeUInt32LE(entry.attrs??0,38);central.writeUInt32LE(offset,42);name.copy(central,46);
  locals.push(local,compressed,descriptor);centrals.push(central);offset+=local.length+compressed.length+descriptor.length;
 }
 const directory=Buffer.concat(centrals),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([...locals,directory,end]);
}
