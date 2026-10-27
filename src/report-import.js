// This parser only proposes labelled measurements. It never maps whole-body SMM to ASM.
export function reportCandidates(text=''){
 const lines=String(text).normalize('NFKC').split(/\r?\n/).map(x=>x.trim()).filter(Boolean),found={};
 const add=(id,label,value,unit,source)=>{if(!Number.isFinite(value))return;(found[id]||=[]).push({id,label,value,unit,source});};
 for(let i=0;i<lines.length;i++){
  const line=lines[i],joined=line+' '+(lines[i+1]||'');
  for(const [id,label,regex,unit,min,max] of [
   ['asm-height','키',/(?:신장|키|Height)\s*(?:\(\s*cm\s*\))?\s*[:：]?\s*(\d{2,3}(?:\.\d+)?)\s*(?:cm)?/i,'cm',80,250],
   ['asm-mass','사지골격근량 (ASM)',/(?:사지\s*(?:골격)?근량|Appendicular\s+(?:skeletal\s+)?muscle\s+mass|\bASM\b)\s*(?:\(\s*kg\s*\))?\s*[:：]?\s*(\d{1,2}(?:\.\d+)?)\s*(?:kg)?/i,'kg',1,100],
   ['asm-index','ASM 지수 (SMI)',/(?:\bSMI\b|사지\s*(?:골격)?근량\s*지수|\bASMI\b)\s*(?:\(\s*kg\s*\/\s*m[2²]\s*\))?\s*[:：]?\s*(\d{1,2}(?:\.\d+)?)/i,'kg/m²',1,50]
  ]){const match=joined.match(regex);if(match){const n=Number(match[1]);if(n>=min&&n<=max)add(id,label,n,unit,match[0]);}}
  // Segmental lean mass is offered only in a section explicitly labelled lean/muscle analysis.
  const context=lines.slice(Math.max(0,i-15),i+1).join(' '),lean=/부위별\s*(?:근육|제지방)|Segmental\s+Lean/i.test(context),fat=/부위별\s*체지방|Segmental\s+Fat/i.test(context.slice(context.search(/부위별|Segmental/i)));
  if(lean&&!fat&&!/지방|Fat|몸통|Trunk/i.test(line))for(const [id,label,regex] of [['right-arm','오른팔',/(?:오른팔|우측\s*상지|Right\s*Arm)/i],['left-arm','왼팔',/(?:왼팔|좌측\s*상지|Left\s*Arm)/i],['right-leg','오른다리',/(?:오른(?:쪽)?\s*다리|우측\s*하지|Right\s*Leg)/i],['left-leg','왼다리',/(?:왼(?:쪽)?\s*다리|좌측\s*하지|Left\s*Leg)/i]]){
   const labelMatch=line.match(regex);if(!labelMatch)continue;const n=line.slice(labelMatch.index+labelMatch[0].length).match(/^\s*[:：]?\s*(\d{1,2}(?:\.\d+)?)\s*kg\b/i);if(n&&Number(n[1])>0&&Number(n[1])<=30)add(id,label+' 제지방/근육량',Number(n[1]),'kg',labelMatch[0]+' '+n[0]);
  }
 }
 return Object.values(found).map(values=>{const unique=[...new Map(values.map(v=>[v.value,v])).values()];return unique.length===1?unique[0]:{id:unique[0].id,label:unique[0].label,ambiguous:true,alternatives:unique.map(x=>x.value),unit:unique[0].unit};});
}
export async function readReport(file,onProgress=()=>{}){
 if(!file||file.size>15*1024*1024)throw new Error('PDF·사진은 15MB 이하로 선택해 주세요.');
 let worker,pdf,pdfTask;const canvases=[];let text='';
 try{
  const ocr=async source=>{
   onProgress('사진의 글자와 숫자를 읽고 있습니다.');
   if(!worker){const {createWorker}=await import('tesseract.js');worker=await createWorker(['kor','eng'],1,{workerPath:'/import-runtime/worker.min.js',corePath:'/import-runtime/core',langPath:'/import-runtime/lang',cacheMethod:'none',logger:m=>{if(m.status==='recognizing text')onProgress('문자 인식 '+Math.round((m.progress||0)*100)+'%');}});}
   const result=await worker.recognize(source);return result.data.text;
  };
  if(file.type==='application/pdf'||/\.pdf$/i.test(file.name)){
   const {getDocument,GlobalWorkerOptions}=await import('pdfjs-dist');GlobalWorkerOptions.workerSrc=new URL('pdfjs-dist/build/pdf.worker.min.mjs',import.meta.url).href;
   pdfTask=getDocument({data:new Uint8Array(await file.arrayBuffer()),cMapUrl:'/import-runtime/pdf/cmaps/',cMapPacked:true,standardFontDataUrl:'/import-runtime/pdf/standard_fonts/',wasmUrl:'/import-runtime/pdf/wasm/',isEvalSupported:false});pdf=await pdfTask.promise;
   if(pdf.numPages>3)throw new Error('결과지 부분만 3페이지 이내 PDF로 선택해 주세요.');
   for(let number=1;number<=pdf.numPages;number++){
    onProgress(`PDF ${number}/${pdf.numPages}쪽 확인 중`);const page=await pdf.getPage(number),content=await page.getTextContent(),rows=new Map();
    for(const item of content.items){const y=Math.round(item.transform[5]/3)*3;if(!rows.has(y))rows.set(y,[]);rows.get(y).push(item);}
    const pageText=[...rows].sort((a,b)=>b[0]-a[0]).map(([,items])=>items.sort((a,b)=>a.transform[4]-b.transform[4]).map(item=>item.str).join(' ')).join('\n');
    // Image PDFs have no text layer. OCR the rendered page locally.
    if(reportCandidates(pageText).length)text+=pageText+'\n';else{
     const base=page.getViewport({scale:1}),view=page.getViewport({scale:Math.min(2.5,2300/Math.max(base.width,base.height))}),canvas=document.createElement('canvas');canvas.width=Math.ceil(view.width);canvas.height=Math.ceil(view.height);canvases.push(canvas);await page.render({canvasContext:canvas.getContext('2d'),viewport:view}).promise;text+=await ocr(canvas)+'\n';
    }
   }
  }else if(/^image\//.test(file.type)||/\.(png|jpe?g|webp|heic|heif)$/i.test(file.name)){
   const url=URL.createObjectURL(file);try{const image=new Image();image.src=url;await image.decode();const ratio=Math.min(1,2300/Math.max(image.naturalWidth,image.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.round(image.naturalWidth*ratio);canvas.height=Math.round(image.naturalHeight*ratio);canvases.push(canvas);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);text=await ocr(canvas);}finally{URL.revokeObjectURL(url);}
  }else throw new Error('PDF 또는 사진(JPEG·PNG·WebP)을 선택해 주세요.');
  return {candidates:reportCandidates(text)};
 }finally{if(worker)await worker.terminate();if(pdfTask)await pdfTask.destroy();for(const canvas of canvases){canvas.width=0;canvas.height=0;}}
}
