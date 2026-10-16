// Quoted line items are always supplementary to a full, immutable quote
// revision. A request with no line items remains compatible with legacy quotes.
export function validateQuoteItems(input,expectedTotalCents){
  if(input===undefined)return [];
  if(!Array.isArray(input)||input.length>20)throw new TypeError('INVALID_QUOTE_ITEMS');
  let sum=0;
  const items=input.map(row=>{
    const description=typeof row?.description==='string'?row.description.trim():'';
    const quantity=Number(row?.quantity),unitPriceCents=Number(row?.unitPriceCents);
    if(description.length<2||description.length>120||!Number.isSafeInteger(quantity)||
       quantity<1||quantity>1000||!Number.isSafeInteger(unitPriceCents)||
       unitPriceCents<1||unitPriceCents>100000000)
      throw new TypeError('INVALID_QUOTE_ITEMS');
    const totalCents=quantity*unitPriceCents;
    if(!Number.isSafeInteger(totalCents)||totalCents>100000000)
      throw new TypeError('INVALID_QUOTE_ITEMS');
    sum+=totalCents;
    if(!Number.isSafeInteger(sum)||sum>100000000)throw new TypeError('INVALID_QUOTE_ITEMS');
    return {description,quantity,unitPriceCents,totalCents};
  });
  if(items.length&&sum!==expectedTotalCents)throw new TypeError('QUOTE_ITEMS_TOTAL_MISMATCH');
  return items;
}
