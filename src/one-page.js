// Keep all content, group tables first, then use the largest scale that fits A4.
const HEIGHT=277*96/25.4-10;
const original=new WeakMap();
function printStyles(){
 if(document.getElementById('ptcare-print-measure'))return;
 const css=[];
 for(const sheet of document.styleSheets){try{for(const rule of sheet.cssRules)if(rule.type===CSSRule.MEDIA_RULE&&rule.conditionText.includes('print'))css.push([...rule.cssRules].map(x=>x.cssText).join('\n'));}catch{/* External font sheets need not be measured. */}}
 const style=document.createElement('style');style.id='ptcare-print-measure';style.textContent=css.join('\n');document.head.append(style);
}
export function fitOnePage(sheet){
 if(!original.has(sheet))original.set(sheet,{zoom:sheet.style.zoom,width:sheet.style.width});
 printStyles();
 const scale=value=>{sheet.style.zoom=String(value);sheet.style.width=(190/value)+'mm';return sheet.getBoundingClientRect().height;};
 if(scale(1)<=HEIGHT)return;
 let low=.02,high=1;
 for(let i=0;i<14;i++){const mid=(low+high)/2;if(scale(mid)<=HEIGHT)low=mid;else high=mid;}
 scale(low);
}
export function restorePage(sheet){const old=original.get(sheet);if(old){sheet.style.zoom=old.zoom;sheet.style.width=old.width;original.delete(sheet);}}
window.addEventListener('beforeprint',()=>document.querySelectorAll('.one-page-sheet').forEach(fitOnePage));
window.addEventListener('afterprint',()=>{document.querySelectorAll('.one-page-sheet').forEach(restorePage);document.getElementById('ptcare-print-measure')?.remove();});
