// The time a test is scored against is separate from the maximum recordable observation.
export const expandedSecondsMax=limit=>({10:30,30:60,60:120}[limit]??limit);
const nominal={
 'sppb-side':10,'sppb-semi':10,'sppb-tandem':10,'sppb-chair-time':60,
 'ols-open-right':30,'ols-open-left':30,'ols-closed-right':10,'ols-closed-left':10,
 'bbs-5-seconds':10,'bbs-6-seconds':60,'bbs-12-seconds':30,'bbs-13-seconds':10
};
export const secondsInputMax=(id,fallback=3600)=>nominal[id]===undefined?fallback:expandedSecondsMax(nominal[id]);
export const hasHundredthPrecision=n=>Number.isFinite(n)&&Math.abs(n*100-Math.round(n*100))<0.000001;
