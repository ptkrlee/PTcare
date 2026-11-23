const neutral=region=>[1,2,3].map(trial=>[`sca-${region}-${trial}`,`중립 ${trial}`]);

export const cervicalMeasurements=neutral('cca');
export const thoracolumbarMeasurements=[
 ...neutral('tca'),
 ['sca-tca-left','왼쪽 옆굽힘'],
 ['sca-tca-right','오른쪽 옆굽힘'],
];
export const headPostureMeasurements=[
 ['sca-fhp-speed','걷기 속도'],
 ...[15,20,25].map(seconds=>[`sca-fhp-cv-${seconds}`,`${seconds}초`]),
];
