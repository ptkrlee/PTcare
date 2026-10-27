import {cp,mkdir,readdir} from 'node:fs/promises';
const out='public/import-runtime';
await mkdir(out+'/core',{recursive:true});await mkdir(out+'/lang',{recursive:true});
await cp('node_modules/tesseract.js/dist/worker.min.js',out+'/worker.min.js');
for(const file of await readdir('node_modules/tesseract.js-core'))if(/\.wasm(?:\.js)?$/.test(file))await cp('node_modules/tesseract.js-core/'+file,out+'/core/'+file);
for(const lang of ['eng','kor'])await cp(`node_modules/@tesseract.js-data/${lang}/4.0.0_best_int/${lang}.traineddata.gz`,`${out}/lang/${lang}.traineddata.gz`);
for(const name of ['cmaps','standard_fonts','wasm'])await cp('node_modules/pdfjs-dist/'+name,out+'/pdf/'+name,{recursive:true});
