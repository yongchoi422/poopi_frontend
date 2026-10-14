import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.join(path.dirname(fileURLToPath(import.meta.url)),'cost-estimate-2026-10-03');
await fs.mkdir(dir,{recursive:true});
const filters={
  containers:"serviceName eq 'Azure Container Apps' and armRegionName eq 'koreacentral'",
  staticweb:"contains(productName, 'Static Web Apps')",
  postgres:"serviceName eq 'Azure Database for PostgreSQL' and armRegionName eq 'koreacentral'",
  blobs:"serviceName eq 'Storage' and armRegionName eq 'koreacentral' and contains(productName, 'Block Blob')",
};
await Promise.all(Object.entries(filters).map(async([key,filter])=>{
  let url='https://prices.azure.com/api/retail/prices?'+new URLSearchParams({'$filter':filter,'currencyCode':"'USD'"}),all=[];
  for(let i=0;url&&i<10;i++) {const response=await fetch(url);if(!response.ok)throw new Error(`${key} HTTP ${response.status}`);const data=await response.json();all.push(...(data.Items||[]));url=data.NextPageLink;}
  await fs.writeFile(path.join(dir,key+'.json'),JSON.stringify({fetchedAt:new Date().toISOString(),filter,items:all},null,2));
  const selected=all.filter(x=>x.type==='Consumption'&&x.isPrimaryMeterRegion!==false&&(
    key==='containers'&&!/GPU|Dedicated|Session|Express/.test(x.productName+' '+x.meterName)||
    key==='staticweb'||
    key==='postgres'&&/Flexible/.test(x.productName)&&/B1ms|B2s|Storage|Backup/.test(x.meterName+' '+x.skuName)&&!/IOPS|Long|GRS|Geo/.test(x.meterName+' '+x.skuName)||
    key==='blobs'&&/^Hot LRS$/.test(x.skuName)&&/Data Stored/.test(x.meterName)
  ));
  console.log(JSON.stringify({key,count:all.length,selected:selected.map(x=>({product:x.productName,sku:x.skuName,meter:x.meterName,unit:x.unitOfMeasure,price:x.retailPrice,tier:x.tierMinimumUnits,region:x.armRegionName,effective:x.effectiveStartDate}))}));
}));
