const scriptURL = "https://script.google.com/macros/s/AKfycbwvpj1MGcsqLbXIo03QyeMXh5iZ6vdoK67vQhN5rm0mfV_WruzSuSDtYQjck9CuVv_F/exec";

const hbg = document.getElementById('hbg');
const mob = document.getElementById('mob');

if (hbg && mob) {
  hbg.addEventListener('click', () => {
    hbg.classList.toggle('open');
    mob.classList.toggle('open');
  });

  mob.querySelectorAll('a').forEach(a =>
    a.addEventListener('click', () => {
      hbg.classList.remove('open');
      mob.classList.remove('open');
    })
  );
}

// fade-up
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    entries => entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('in');
    }),
    { threshold: 0.1 }
  );

  document.querySelectorAll('.fu').forEach(el => io.observe(el));
} else {
  document.querySelectorAll('.fu').forEach(el => el.classList.add('in'));
}

// toast
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._toastTimer);
  t._toastTimer = setTimeout(() => t.classList.remove('show'), 4500);
}

// waitlist elements
const waitlistForm = document.getElementById('waitlistForm');
const entityEl = document.getElementById('wl-entity');
const groupEl = document.getElementById('wl-group');
const facilityTypeEl = document.getElementById('wl-facility-type');
const cityEl = document.getElementById('wl-city');

const groupWrap = document.getElementById('wl-group-wrap');
const facilityWrap = document.getElementById('wl-facility-wrap');

let masterData = {
  cities: [],
  entityMap: {}
};

// load spots
async function loadSpots() {
  try {
    const res = await fetch(scriptURL);
    const data = await res.json();

    if (data.status === 'success') {
      const el = document.getElementById('spotNum');
      if (el) el.textContent = data.remainingSpots;
    }
  } catch (err) {
    console.error('Failed to load spots:', err);
  }
}

// load metadata
async function loadMetadata() {
  try {
    const res = await fetch(`${scriptURL}?action=metadata`);
    const data = await res.json();

    if (data.status !== 'success') {
      console.error('Failed to load metadata:', data.message);
      return;
    }

    masterData = data.data || { cities: [], entityMap: {} };
    populateCities(masterData.cities || []);
  } catch (err) {
    console.error('Failed to load metadata:', err);
  }
}

function populateCities(cityGroups) {
  if (!cityEl) return;

  cityEl.innerHTML = '<option value="" disabled selected>Select your city *</option>';

  cityGroups.forEach(group => {
    (group.options || []).forEach(city => {
      const option = document.createElement('option');
      option.value = city;
      option.textContent = city;
      cityEl.appendChild(option);
    });
  });
}

function populateSelect(selectEl, items, placeholder) {
  if (!selectEl) return;

  selectEl.innerHTML = `<option value="" disabled selected>${placeholder}</option>`;

  items.forEach(item => {
    const option = document.createElement('option');
    option.value = item;
    option.textContent = item;
    selectEl.appendChild(option);
  });
}

function hideField(el) {
  if (!el) return;
  el.classList.remove('show');
  el.style.display = 'none';
}

function showField(el) {
  if (!el) return;
  el.style.display = 'block';
  requestAnimationFrame(() => {
    el.classList.add('show');
  });
}

function resetDynamicFields() {
  hideField(groupWrap);
  hideField(facilityWrap);

  if (groupEl) {
    groupEl.innerHTML = '<option value="" disabled selected>Select group</option>';
    groupEl.required = false;
    groupEl.value = '';
  }

  if (facilityTypeEl) {
    facilityTypeEl.innerHTML = '<option value="" disabled selected>Select facility type</option>';
    facilityTypeEl.required = false;
    facilityTypeEl.value = '';
  }
}

function handleEntityChange() {
  resetDynamicFields();

  if (!entityEl) return;

  const entity = entityEl.value;
  const config = masterData.entityMap[entity];

  if (!config) return;

  const groups = config.groups || [];
  const facilityTypes = config.facilityTypes || [];

  if (entity === 'Patient' || entity === 'Investor' || entity === 'Other') {
    return;
  }

  if (entity === 'Clinic' || entity === 'Hospital') {
    if (groups.length > 0 && groupEl && groupWrap) {
      populateSelect(groupEl, groups, 'Select group');
      groupEl.required = true;
      showField(groupWrap);
    }

    if (facilityTypes.length > 0 && facilityTypeEl && facilityWrap) {
      populateSelect(facilityTypeEl, facilityTypes, 'Select facility type');
      facilityTypeEl.required = true;
      showField(facilityWrap);
    }

    return;
  }

  if (entity === 'Diagnostic Labs') {
    if (groups.length > 0 && groupEl && groupWrap) {
      populateSelect(groupEl, groups, 'Select group');
      groupEl.required = true;
      showField(groupWrap);
    }
  }
}

if (entityEl) {
  entityEl.addEventListener('change', handleEntityChange);
}

async function initWaitlist() {
  await Promise.all([loadSpots(), loadMetadata()]);
  resetDynamicFields();
}

initWaitlist();

// submit
if (waitlistForm) {
  waitlistForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const name = document.getElementById('wl-name')?.value.trim() || '';
    const email = document.getElementById('wl-email')?.value.trim() || '';
    const phone = document.getElementById('wl-phone')?.value.trim() || '';
    const entity = entityEl?.value || '';
    const city = cityEl?.value || '';
    const group = groupWrap && groupWrap.style.display !== 'none' ? (groupEl?.value || '') : '';
    const facilityType = facilityWrap && facilityWrap.style.display !== 'none' ? (facilityTypeEl?.value || '') : '';

    if (!name || !email || !entity || !city) {
      showToast('Please fill in all required fields.');
      return;
    }

    if ((entity === 'Clinic' || entity === 'Hospital') && (!group || !facilityType)) {
      showToast('Please select group and facility type.');
      return;
    }

    if (entity === 'Diagnostic Labs' && !group) {
      showToast('Please select group.');
      return;
    }

    const btn = this.querySelector('.sub-btn');
    const oldBtnText = btn ? btn.textContent : '';

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Submitting...';
    }

    try {
      const res = await fetch(scriptURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({
          name,
          email,
          phone,
          entity,
          group,
          facilityType,
          city
        })
      });

      const result = await res.json();

      if (result.status === 'success') {
        const el = document.getElementById('spotNum');
        if (el && typeof result.remainingSpots !== 'undefined') {
          el.textContent = result.remainingSpots;
        }

        this.reset();
        resetDynamicFields();
        showToast('Welcome, ' + name + '. Thank for your response. Our team will get back to you soon.');
      } else if (result.status === 'duplicate_email') {
        showToast('This email is already registered.');
      } else if (result.status === 'duplicate_phone') {
        showToast('This phone number is already registered.');
      } else if (result.status === 'full') {
        const el = document.getElementById('spotNum');
        if (el) el.textContent = '0';
        showToast('All 500 spots have been filled!!');
      } else {
        showToast(result.message || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      console.error(err);
      showToast('Unable to submit right now. Please try again.');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = oldBtnText || 'Secure My Early Access';
      }
    }
  });
}