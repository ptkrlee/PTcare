export const icons={
brain:'<path d="M12 4a4 4 0 0 0-7-1 4 4 0 0 0-2 7 4 4 0 0 0 1 7 4 4 0 0 0 8 3V4Zm0 0a4 4 0 0 1 7-1 4 4 0 0 1 2 7 4 4 0 0 1-1 7 4 4 0 0 1-8 3M6 8l2 2m10-2-2 2M6 16l2-2m10 2-2-2"/>',
hand:'<path d="M7 12V6a2 2 0 0 1 4 0v5-7a2 2 0 0 1 4 0v7-5a2 2 0 0 1 4 0v7l2-2 1 1-3 7a5 5 0 0 1-5 3h-2a5 5 0 0 1-4-2l-5-6a2 2 0 0 1 3-2l1 1Z"/>',
chair:'<path d="M6 14V4h10v10M4 14h16v3H4zm2 3v5m12-5v5M9 8h4"/>',
walk:'<circle cx="14" cy="3" r="2"/><path d="m12 7-3 6 4 4-2 5m3-14 3 5h4M10 10l-5 2m8 5 5 5"/>',
ruler:'<path d="m3 16 13-13 5 5L8 21Zm4-4 3 3m0-6 3 3m0-6 3 3"/>',
muscle:'<path d="m8 8 1-5 5 1 1 4-3 1m-4-1-3 7a5 5 0 0 0 5 6h7a5 5 0 0 0 4-8l-4-4-4 4-3-2M9 17h7"/>',

plus:'<path d="M12 5v14M5 12h14"/>',balance:'<path d="M12 4v16M5 20h14M4 8h16M6 8l-4 7h8L6 8Zm12 0-4 7h8l-4-7Z"/>',activity:'<path d="M3 12h4l3-8 4 16 3-8h4"/>',heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',arrow:'<path d="m9 5 7 7-7 7"/>',check:'<path d="m5 12 4 4L19 6"/>',lock:'<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',reset:'<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',sheet:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',print:'<path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/>',back:'<path d="m12 5-7 7 7 7M5 12h14"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>'};
export const icon=(name,cls='')=>`<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.sheet}</svg>`;
export const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const localDate=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
