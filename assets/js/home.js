(() => {
    'use strict';
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const hero = document.querySelector('.hero');
    const content = document.getElementById('hero-content');
    const landscape = document.querySelector('.landscape');
    const nav = document.getElementById('nav');
    const back = document.querySelector('.back-top');
    const logo = document.querySelector('.glass-logo');
    const logoSlot = document.querySelector('.logo-slot');
    function positionLogo() {
      const slotRect=logoSlot.getBoundingClientRect(),heroRect=hero.getBoundingClientRect();
      logo.style.left=`${slotRect.left-heroRect.left}px`;logo.style.top=`${slotRect.top-heroRect.top}px`;
      logo.style.width=`${slotRect.width}px`;logo.style.height=`${slotRect.height}px`;
      logo.style.opacity=motion.matches?'1':content.style.getPropertyValue('--hero-opacity')||'1';
    }
    if(document.fonts)document.fonts.ready.then(positionLogo);
    window.addEventListener('load',positionLogo,{once:true});
    const menuButton=document.querySelector('.nav-toggle'),menu=document.getElementById('main-navigation');
    function closeMenu(returnFocus=false){menu.classList.remove('is-open');menuButton.setAttribute('aria-expanded','false');menuButton.setAttribute('aria-label','Open navigation');if(returnFocus)menuButton.focus();}
    menuButton.addEventListener('click',()=>{const open=menu.classList.toggle('is-open');menuButton.setAttribute('aria-expanded',String(open));menuButton.setAttribute('aria-label',open?'Close navigation':'Open navigation');});
    menu.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>closeMenu()));
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.classList.contains('is-open'))closeMenu(true);});
    document.addEventListener('click',e=>{if(!nav.contains(e.target))closeMenu();});

    let scrollFrame = 0, tiltFrame = 0, lastFocus = null, focusEmailOnTop = false, heroFocusTarget = document.getElementById('email');
    const clamp = (n,min,max) => Math.min(max,Math.max(min,n));
    function updateScroll() {
      scrollFrame = 0;
      const y = window.scrollY;
      nav.classList.toggle('scrolled',y>35);
      back.hidden = y<hero.offsetHeight*.7;
      if(focusEmailOnTop && y<2){content.inert=false;heroFocusTarget.focus({preventScroll:true});focusEmailOnTop=false;}
      if (motion.matches) {positionLogo();return;}
      const progress = clamp(y/(hero.offsetHeight*.72),0,1);
      content.style.setProperty('--hero-opacity',String(1-progress));
      content.style.setProperty('--hero-scale',String(1-progress*.09));
      content.style.setProperty('--hero-y',`${clamp(y*.19,0,180)}px`);
      landscape.style.setProperty('--bg-y',`${clamp(y*.28,0,300)}px`);
      // The invisible hero form must not remain keyboard-focusable below the fold.
      content.inert = progress>=.98 && !focusEmailOnTop;
      positionLogo();
    }
    const scheduleScroll = () => {if(!scrollFrame)scrollFrame=requestAnimationFrame(updateScroll);};
    window.addEventListener('scroll',scheduleScroll,{passive:true});
    window.addEventListener('resize',scheduleScroll,{passive:true});
    updateScroll();
    function syncMotion() {
      if(motion.matches){
        for(const property of ['--hero-opacity','--hero-scale','--hero-y'])content.style.removeProperty(property);
        landscape.style.removeProperty('--bg-y');content.inert=false;
        logo.style.removeProperty('--rx');logo.style.removeProperty('--ry');
        document.querySelectorAll('.reveal').forEach(n=>n.classList.add('visible'));
      }
      positionLogo();scheduleScroll();
    }
    syncMotion();
    if(motion.addEventListener)motion.addEventListener('change',syncMotion);else motion.addListener(syncMotion);
    if(!motion.matches && 'IntersectionObserver' in window){
      document.documentElement.classList.add('js-reveals');
      const observer = new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);}}),{threshold:.12});
      document.querySelectorAll('.reveal').forEach(n=>observer.observe(n));
    }
    logo.addEventListener('pointerenter',e=>{if(!motion.matches&&e.pointerType==='mouse')logo.classList.add('hover');});
    logo.addEventListener('pointermove',e=>{
      if(motion.matches||e.pointerType!=='mouse'||tiltFrame)return;
      const rect=logo.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width-.5,y=(e.clientY-rect.top)/rect.height-.5;
      tiltFrame=requestAnimationFrame(()=>{tiltFrame=0;logo.style.setProperty('--rx',`${-y*14}deg`);logo.style.setProperty('--ry',`${x*18}deg`);});
    });
    logo.addEventListener('pointerleave',()=>{logo.classList.remove('hover');logo.style.setProperty('--rx','0deg');logo.style.setProperty('--ry','0deg');});
    back.addEventListener('click',()=>window.scrollTo({top:0,behavior:motion.matches?'auto':'smooth'}));
    // Return to the full hero before focusing; scrolling directly to the form
    // would otherwise fade it along with the rest of the hero.
    document.querySelectorAll('a[href="#subscribe"], a[href="#download"]').forEach(link=>link.addEventListener('click',e=>{
      e.preventDefault();content.inert=false;focusEmailOnTop=true;
      heroFocusTarget=link.getAttribute('href')==='#download'?document.getElementById('google-play-button'):document.getElementById('email');
      if(link.hasAttribute('data-launch-updates')){lastFocus=null;document.getElementById('app-launch').close();}
      window.scrollTo({top:0,behavior:motion.matches?'auto':'smooth'});
      scheduleScroll();
    }));
    if(['#subscribe','#download'].includes(location.hash))window.addEventListener('load',()=>window.scrollTo({top:0,behavior:'instant'}),{once:true});
    document.getElementById('subscribe').addEventListener('submit',e=>{
      e.preventDefault();const form=e.currentTarget;if(!form.reportValidity())return;
      const email=document.getElementById('email').value.trim();
      const body=`Hello CuraX team,\n\nPlease add ${email} to CuraX updates. I consent to receiving CuraX launch and product updates by email.\n\nThank you.`;
      const status=document.getElementById('form-status');status.hidden=false;
      status.textContent='Your email app will open. Send the prepared request there to subscribe.';
      location.href=`mailto:curaxapp@gmail.com?subject=${encodeURIComponent('CuraX — Subscribe to updates')}&body=${encodeURIComponent(body)}`;
    });
    const appConfig=window.CURAX_CONFIG||{};
    let liveStores=0;
    document.querySelectorAll('[data-store]').forEach(link=>{
      const key=link.dataset.store,url=appConfig[key+'Url'];
      const valid=typeof url==='string'&&(key==='googlePlay'?url.startsWith('https://play.google.com/'):url.startsWith('https://apps.apple.com/'));
      if(!valid)return;
      liveStores++;link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.removeAttribute('data-open');
      link.querySelector('small').textContent=key==='googlePlay'?'GET IT ON':'DOWNLOAD ON THE';
      link.setAttribute('aria-label',key==='googlePlay'?'Download CuraX on Google Play':'Download CuraX on the App Store');
    });
    if(liveStores)document.querySelector('.app-availability').textContent=liveStores===2?'CuraX User App · Android & iOS':'Download CuraX on the available store. Other platform coming soon.';
    document.querySelectorAll('[data-open]').forEach(button=>button.addEventListener('click',e=>{e.preventDefault();lastFocus=button;document.getElementById(button.dataset.open).showModal();}));
    if(location.hash==='#privacy') { const privacy=document.getElementById('privacy'); if(privacy && !privacy.open) privacy.showModal(); }
    document.querySelectorAll('dialog').forEach(dialog=>{
      dialog.querySelector('.close-dialog').addEventListener('click',()=>dialog.close());
      dialog.addEventListener('close',()=>{if(lastFocus)lastFocus.focus();});
      dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
    });
  })();
