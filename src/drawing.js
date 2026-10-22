// Persist vector strokes during pointer movement, including an unfinished stroke.
export function mountDrawing(canvas,initial,onChange,{background=null}={}){
 let strokes=structuredClone(initial||[]),active=null;
 const ctx=canvas.getContext('2d');
 function paint(){ctx.clearRect(0,0,canvas.width,canvas.height);background?.(ctx);ctx.strokeStyle='#253c36';ctx.lineWidth=3;ctx.lineCap='round';ctx.lineJoin='round';for(const stroke of strokes){if(!stroke.length)continue;ctx.beginPath();ctx.moveTo(...stroke[0]);for(const point of stroke.slice(1))ctx.lineTo(...point);if(stroke.length===1)ctx.lineTo(stroke[0][0]+.1,stroke[0][1]+.1);ctx.stroke();}}
 function point(event){const r=canvas.getBoundingClientRect();return [Math.round((event.clientX-r.left)*canvas.width/r.width),Math.round((event.clientY-r.top)*canvas.height/r.height)];}
 canvas.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();canvas.setPointerCapture(event.pointerId);active=[point(event)];strokes.push(active);paint();onChange(structuredClone(strokes));});
 canvas.addEventListener('pointermove',event=>{if(!active)return;event.preventDefault();active.push(point(event));paint();onChange(structuredClone(strokes));});
 const end=()=>{active=null;};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);paint();
 return {redraw:paint,replace(value){strokes=structuredClone(value||[]);active=null;paint();},clear(){strokes=[];active=null;paint();onChange([]);}};
}
