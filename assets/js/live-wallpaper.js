/* CuraX live canyon: decorative, lightweight canvas over the existing wallpaper. */
(() => {
  'use strict';
  const canvas = document.querySelector('.live-wallpaper');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', {alpha:true});
  const hero = document.querySelector('.hero');
  const landscape = document.querySelector('.landscape');
  const toggle = document.querySelector('.wallpaper-toggle');
  if (!ctx) {if(toggle)toggle.hidden=true;return;}
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const sourceWidth=1672, sourceHeight=941;
  let width=0,height=0,scale=1,offsetX=0,offsetY=0,frame=0,lastDraw=0,lastTick=0,time=0,paused=false,inView=true;
  const mist = document.createElement('canvas');mist.width=512;mist.height=256;
  const m = mist.getContext('2d');
  let seed=31;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  // Pre-render an irregular, soft plume once rather than blurring each frame.
  for(let i=0;i<27;i++){
    const x=70+random()*372,y=65+random()*130,r=30+random()*58;
    const g=m.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0,'rgba(111,186,207,.13)');g.addColorStop(.4,'rgba(83,157,181,.07)');g.addColorStop(1,'rgba(56,121,155,0)');
    m.fillStyle=g;m.fillRect(x-r,y-r,r*2,r*2);
  }
  // Coordinates trace the cyan seams in the supplied canyon, not the text area.
  const routes=[
    [[.251,.086],[.260,.17],[.267,.26],[.266,.35],[.278,.41],[.281,.50],[.300,.57],[.302,.66],[.316,.75],[.329,.834]],
    [[.161,.386],[.166,.441],[.170,.49],[.176,.551],[.182,.612],[.179,.644]],
    [[.854,.016],[.849,.075],[.860,.144],[.871,.193],[.884,.249],[.879,.305],[.874,.36],[.872,.412],[.867,.482],[.855,.551],[.852,.636],[.838,.744],[.804,.898]]
  ].map(points=>{
    let total=0;const lengths=[0];
    for(let i=1;i<points.length;i++){total+=Math.hypot((points[i][0]-points[i-1][0])*sourceWidth,(points[i][1]-points[i-1][1])*sourceHeight);lengths.push(total);}
    return {points,lengths,total};
  });
  function point(route,p){
    const distance=Math.max(0,Math.min(1,p))*route.total;
    let i=1;while(i<route.lengths.length-1&&route.lengths[i]<distance)i++;
    const q=(distance-route.lengths[i-1])/(route.lengths[i]-route.lengths[i-1]);
    return [(route.points[i-1][0]+(route.points[i][0]-route.points[i-1][0])*q)*sourceWidth,(route.points[i-1][1]+(route.points[i][1]-route.points[i-1][1])*q)*sourceHeight];
  }
  const clouds=[
    [.19,.39,.19,.32,0],[.255,.59,.26,.39,1.3],[.32,.77,.33,.55,2.8],
    [.44,.865,.42,.63,4.4],[.57,.88,.46,.48,2.2],[.69,.83,.34,.48,5.2],
    [.775,.68,.25,.29,3.4],[.33,.87,.31,.51,6.3]
  ];
  function resize(){
    const r=landscape.getBoundingClientRect();
    // Cap resolution for lower-end phones while maintaining a clean atmospheric layer.
    const factor=Math.min(1.25,devicePixelRatio||1,1600/Math.max(r.width,r.height));
    width=Math.round(landscape.clientWidth*factor);height=Math.round(landscape.clientHeight*factor);
    canvas.width=Math.max(1,width);canvas.height=Math.max(1,height);
    scale=Math.max(width/sourceWidth,height/sourceHeight);
    offsetX=(width-sourceWidth*scale)*.5;offsetY=(height-sourceHeight*scale)*.48;
    if(reduced.matches||paused)ctx.clearRect(0,0,width,height);
  }
  function draw(t){
    ctx.clearRect(0,0,width,height);ctx.save();ctx.translate(offsetX,offsetY);ctx.scale(scale,scale);
    ctx.globalCompositeOperation='screen';ctx.lineCap='round';ctx.lineJoin='round';
    // Soft sheets carry a moving highlight downhill; no hard neon outlines.
    routes.forEach((route,index)=>{
      for(let strand=0;strand<3;strand++){
        ctx.beginPath();route.points.forEach((p,i)=>{const x=p[0]*sourceWidth+(strand-1)*2.3,y=p[1]*sourceHeight;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});
        ctx.strokeStyle=`rgba(44,173,216,${strand===1?.12:.055})`;ctx.lineWidth=strand===1?4.5:2;ctx.stroke();
      }
      for(let n=0;n<16;n++){
        const p=(t*(index===1?.068:.037)+n/16+index*.19)%1;
        const a=point(route,p),b=point(route,Math.min(1,p+.022));
        const intensity=Math.sin(Math.PI*p)*(.20+.10*Math.sin(n*2.7+t*.8));
        ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);
        ctx.strokeStyle=`rgba(115,222,250,${intensity})`;ctx.lineWidth=1.1+(n%3)*.65;ctx.stroke();
        ctx.beginPath();ctx.moveTo(a[0]+2.2,a[1]);ctx.lineTo(b[0]+2.2,b[1]);
        ctx.strokeStyle=`rgba(52,168,218,${intensity*.3})`;ctx.lineWidth=5;ctx.stroke();
      }
    });
    // Very quiet ripples confined to the water at the foot of the canyon.
    ctx.save();ctx.beginPath();ctx.moveTo(830,875);ctx.lineTo(1080,875);ctx.lineTo(1050,915);ctx.lineTo(1170,941);ctx.lineTo(670,941);ctx.lineTo(790,901);ctx.closePath();ctx.clip();
    for(let i=0;i<18;i++){
      const y=879+((i*4+t*2.8)%62),x=856+Math.sin(i*4.2+t*.12)*70;
      const g=ctx.createLinearGradient(x-65,y,x+65,y);g.addColorStop(0,'rgba(72,172,204,0)');g.addColorStop(.5,`rgba(94,200,228,${.08+.045*Math.sin(t*.4+i)})`);g.addColorStop(1,'rgba(72,172,204,0)');
      ctx.strokeStyle=g;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-65,y);ctx.quadraticCurveTo(x,y-1,x+65,y);ctx.stroke();
    }ctx.restore();
    clouds.forEach(([x,y,w,opacity,phase],i)=>{
      const drift=Math.sin(t*.055+phase)*34+Math.sin(t*.025+phase)*13;
      const rise=Math.sin(t*.045+phase)*10;
      const cloudWidth=w*sourceWidth,cloudHeight=cloudWidth*.47;
      ctx.globalAlpha=opacity*(.82+.18*Math.sin(t*.07+phase));
      ctx.drawImage(mist,x*sourceWidth-cloudWidth/2+drift,y*sourceHeight-cloudHeight/2+rise,cloudWidth,cloudHeight);
    });
    ctx.restore();
  }
  function tick(now){
    frame=0;if(!active())return;
    if(!lastTick)lastTick=now;
    time+=Math.min(.1,(now-lastTick)/1000);lastTick=now;
    if(now-lastDraw>=1000/30){draw(time);lastDraw=now;}
    frame=requestAnimationFrame(tick);
  }
  function active(){return !reduced.matches&&!paused&&!document.hidden&&inView;}
  function sync(){
    document.dispatchEvent(new CustomEvent('curax:background-motion',{detail:{paused:paused||reduced.matches}}));
    if(toggle){toggle.disabled=reduced.matches;toggle.textContent=reduced.matches?'Motion reduced':paused?'Resume background':'Pause background';}
    if(active()){if(!frame){lastTick=0;frame=requestAnimationFrame(tick);}}
    else {if(frame)cancelAnimationFrame(frame);frame=0;lastTick=0;if(reduced.matches)ctx.clearRect(0,0,width,height);}
  }
  if(toggle)toggle.addEventListener('click',()=>{paused=!paused;sync();});
  document.addEventListener('visibilitychange',sync);
  if(reduced.addEventListener)reduced.addEventListener('change',sync);else reduced.addListener(sync);
  if('IntersectionObserver' in window){new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;sync();},{threshold:0}).observe(hero);}
  window.addEventListener('resize',resize,{passive:true});
  resize();sync();
})();
