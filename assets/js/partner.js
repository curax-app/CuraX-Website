(() => {
  'use strict';
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const nav=document.getElementById('nav'),menu=document.getElementById('partner-navigation'),toggle=document.querySelector('.nav-toggle');
  const back=document.querySelector('.back-top');
  let scrollFrame=0,lastFocus=null;
  function closeMenu(focus=false){menu.classList.remove('is-open');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Open navigation');if(focus)toggle.focus();}
  toggle.addEventListener('click',()=>{const open=menu.classList.toggle('is-open');toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Close navigation':'Open navigation');});
  menu.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>closeMenu()));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.classList.contains('is-open'))closeMenu(true);});
  document.addEventListener('click',e=>{if(!nav.contains(e.target))closeMenu();});
  function update(){scrollFrame=0;nav.classList.toggle('scrolled',scrollY>35);back.hidden=scrollY<550;}
  window.addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(update);},{passive:true});update();
  back.addEventListener('click',()=>window.scrollTo({top:0,behavior:motion.matches?'auto':'smooth'}));
  if(!motion.matches&&'IntersectionObserver' in window){document.documentElement.classList.add('js-reveals');const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target);}}),{threshold:.12});document.querySelectorAll('.reveal').forEach(e=>observer.observe(e));}
  const revealAll=()=>{if(motion.matches)document.querySelectorAll('.reveal').forEach(e=>e.classList.add('visible'));};
  if(motion.addEventListener)motion.addEventListener('change',revealAll);else motion.addListener(revealAll);
  const dialog=document.getElementById('partner-invite'),form=document.getElementById('partner-invite-form');
  const config=window.CURAX_CONFIG||{};
  document.querySelectorAll('[data-invite]').forEach(button=>button.addEventListener('click',()=>{
    closeMenu();lastFocus=button;
    if(typeof config.partnerRegistrationUrl==='string'&&config.partnerRegistrationUrl.startsWith('https://')){location.href=config.partnerRegistrationUrl;return;}
    if(button.dataset.category)document.getElementById('facility-category').value=button.dataset.category;
    document.getElementById('invite-status').hidden=true;dialog.showModal();
  }));
  dialog.querySelector('.close-dialog').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{if(lastFocus)lastFocus.focus();});
  dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
  form.addEventListener('submit',e=>{
    e.preventDefault();if(!form.reportValidity())return;
    const data=new FormData(form),field=name=>String(data.get(name)||'').trim();
    const body=`Hello CuraX team,\n\nI would like to request a CuraX Partner invite.\n\nName: ${field('name')}\nWork email: ${field('email')}\nFacility: ${field('facility')}\nCategory: ${field('category')}\nCity: ${field('city')}\nPhone: ${field('phone')||'Not supplied'}\n\nI consent to being contacted by CuraX about this partner request using the details above.\n\nPlease share the next steps for onboarding and verification.\n\nThank you.`;
    const contact=typeof config.partnerContactEmail==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.partnerContactEmail)?config.partnerContactEmail:'curaxapp@gmail.com';
    const status=document.getElementById('invite-status');status.hidden=false;status.textContent='Your email app will open. Review and send the prepared request there. If it does not open, contact '+contact+'.';
    location.href=`mailto:${contact}?subject=${encodeURIComponent('CuraX Partner — Invite request')}&body=${encodeURIComponent(body)}`;
  });
  if(location.hash==='#invite')dialog.showModal();
})();
