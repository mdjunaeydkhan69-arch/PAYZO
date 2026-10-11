
(() => {
  const cfg = window.PAYZO_CONFIG || {};
  const key = cfg.SUPABASE_PUBLISHABLE_KEY || '';
  const configured = !!(
    cfg.SUPABASE_URL &&
    key &&
    !key.includes('PASTE_YOUR_')
  );

  const $ = id => document.getElementById(id);
  let sb = null;
  let requestedRole = 'host';

  if (!configured) {
    $('configNotice').hidden = false;
  } else if (window.supabase) {
    sb = window.supabase.createClient(cfg.SUPABASE_URL, key);
  }

  window.showLogin = role => {
    requestedRole = role;
    $('landing').hidden = true;
    $('loginPanel').hidden = false;
    $('loginPanel').classList.add('show');
    $('loginTitle').textContent =
      role === 'agency' ? 'Agency Login' : 'Host Login';
    $('loginMessage').replaceChildren();
    $('loginForm').reset();
  };

  window.backHome = () => {
    $('loginPanel').classList.remove('show');
    $('loginPanel').hidden = true;
    $('landing').hidden = false;
    $('loginForm').reset();
    $('loginMessage').replaceChildren();
  };

  function msg(el, text, type = 'error') {
    el.replaceChildren();
    const d = document.createElement('div');
    d.className = 'message ' + type;
    d.textContent = text;
    el.appendChild(d);
  }

  async function loadProfile(user) {
    const { data, error } = await sb
      .from('profiles')
      .select('id,uid,full_name,role,status,agency_id')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      throw new Error(
        'Could not verify your profile. Please check database permissions.'
      );
    }

    if (!data) {
      throw new Error(
        'No PAYZO profile exists for this account. Contact the administrator.'
      );
    }

    if (data.status !== 'active') {
      throw new Error('This account is not active.');
    }

    if (data.role !== requestedRole) {
      throw new Error(
        'This account is not authorized for ' +
        (requestedRole === 'agency' ? 'Agency' : 'Host') +
        ' Login.'
      );
    }

    return data;
  }

  async function loadWithdrawals(user, profile) {
    const el = $('withdrawals');
    el.textContent = 'Loading withdrawal requests...';

    let q = sb
      .from('withdrawals')
      .select(
        'id,app_name,payment_source,amount,payout_method,status,created_at'
      )
      .order('created_at', { ascending: false })
      .limit(30);

    if (profile.role === 'host') {
      q = q.eq('host_id', user.id);
    } else {
      q = q.eq('agency_id', profile.agency_id);
    }

    const { data, error } = await q;

    if (error) {
      el.textContent =
        'Withdrawal information could not be loaded. Check database permissions.';
      return;
    }

    if (!data || !data.length) {
      el.textContent = 'No withdrawal requests yet.';
      $('withdrawalsCopy').textContent = 'No withdrawal requests yet.';
      return;
    }

    el.replaceChildren();

    data.forEach(w => {
      const item = document.createElement('div');
      item.className = 'listitem';

      const title = document.createElement('b');
      title.textContent =
        (w.app_name || 'App') + ' • ' + (w.status || 'Pending');

      const p = document.createElement('p');
      p.className = 'small';
      p.textContent =
        'Amount: ' + w.amount +
        ' | Payout: ' + (w.payout_method || '—') +
        ' | Source: ' + (w.payment_source || '—') +
        ' | ' + new Date(w.created_at).toLocaleString();

      item.append(title, p);
      el.appendChild(item);
    });

    const copy = $('withdrawalsCopy');
    if (copy) {
      copy.replaceChildren(...Array.from(el.children).map(item =>
        item.cloneNode(true)
      ));
    }
  }

  async function loadHosts(profile) {
    const el = $('agencyHosts');
    el.textContent = 'Loading hosts...';

    if (!profile.agency_id) {
      el.textContent = 'No agency ID is assigned to this account.';
      return;
    }

    const { data, error } = await sb
      .from('profiles')
      .select('uid,full_name,status')
      .eq('agency_id', profile.agency_id)
      .eq('role', 'host')
      .order('full_name');

    if (error) {
      el.textContent = 'Host list could not be loaded.';
      return;
    }

    if (!data || !data.length) {
      el.textContent = 'No hosts assigned yet.';
      return;
    }

    el.replaceChildren();

    data.forEach(h => {
      const item = document.createElement('div');
      item.className = 'listitem';

      const title = document.createElement('b');
      title.textContent = h.full_name || 'Host';

      const p = document.createElement('p');
      p.className = 'small';
      p.textContent =
        'UID: ' + (h.uid || '—') +
        ' | Status: ' + (h.status || '—');

      item.append(title, p);
      el.appendChild(item);
    });
  }

  async function showDashboard(user, profile) {
    $('loginPanel').classList.remove('show');
    $('loginPanel').hidden = true;
    $('landing').hidden = true;
    $('dashboard').hidden = false;
    $('dashboard').classList.add('show');

    $('rolePill').textContent = profile.role.toUpperCase();
    $('welcome').textContent =
      'Welcome, ' + (profile.full_name || profile.uid || 'PAYZO Member');

    $('profileInfo').textContent =
      'PAYZO UID: ' + (profile.uid || '—') +
      ' | Role: ' + profile.role +
      ' | Status: ' + profile.status;

    $('profileCopy').textContent = $('profileInfo').textContent;

    $('agencyHostsWrap').hidden = profile.role !== 'agency';

    await loadWithdrawals(user, profile);

    if (profile.role === 'agency') {
      await loadHosts(profile);
    }
  }

  $('loginForm').addEventListener('submit', async event => {
    event.preventDefault();

    if (!sb) {
      msg(
        $('loginMessage'),
        'Supabase is not configured. Please check config.js.'
      );
      return;
    }

    const button = $('submitLogin');
    button.disabled = true;
    button.textContent = 'Signing in...';

    try {
      const { data, error } = await sb.auth.signInWithPassword({
        email: $('email').value.trim(),
        password: $('password').value
      });

      if (error) {
        throw new Error('Login failed. Check your email and password.');
      }

      const profile = await loadProfile(data.user);
      await showDashboard(data.user, profile);

    } catch (err) {
      if (sb) await sb.auth.signOut();
      msg($('loginMessage'), err.message || 'Unable to log in.');
    } finally {
      button.disabled = false;
      button.textContent = 'Login Securely';
    }
  });

  window.signOut = async () => {
    if (sb) await sb.auth.signOut();

    $('dashboard').classList.remove('show');
    $('dashboard').hidden = true;
    $('loginPanel').classList.remove('show');
    $('loginPanel').hidden = true;
    $('landing').hidden = false;
    $('loginForm').reset();
    $('loginMessage').replaceChildren();
  };

  if (sb) {
    sb.auth.getSession().then(async ({ data, error }) => {
      if (error || !data.session) return;

      try {
        const user = data.session.user;
        const { data: profile, error: profileError } = await sb
          .from('profiles')
          .select('id,uid,full_name,role,status,agency_id')
          .eq('id', user.id)
          .maybeSingle();

        if (
          !profileError &&
          profile &&
          profile.status === 'active' &&
          ['host', 'agency'].includes(profile.role)
        ) {
          requestedRole = profile.role;
          await showDashboard(user, profile);
        }
      } catch (err) {
        console.error('Session restore failed:', err);
      }
    });
  }
})();
 
