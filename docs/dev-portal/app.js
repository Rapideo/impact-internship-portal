/**
 * IMPACT dev-portal — tab routing and Status tab data loader.
 *
 * Tab state is persisted in the URL via ?tab=<slug> so individual tabs
 * are shareable links. The default tab is "overview" when no query is
 * present.
 *
 * No framework, no build step. Plain ES2020 modules-free script.
 */

(function () {
  'use strict';

  const VALID_TABS = ['overview', 'phasing', 'stack', 'supabase', 'workflow', 'status'];
  const DEFAULT_TAB = 'overview';

  function getTabFromUrl() {
    const url = new URL(window.location.href);
    const t = url.searchParams.get('tab');
    return VALID_TABS.indexOf(t) !== -1 ? t : DEFAULT_TAB;
  }

  function setActiveTab(slug, options) {
    const opts = options || {};
    const pushHistory = opts.pushHistory !== false;
    if (VALID_TABS.indexOf(slug) === -1) {
      slug = DEFAULT_TAB;
    }

    document.querySelectorAll('.portal-tab').forEach(function (btn) {
      const isActive = btn.dataset.tab === slug;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    document.querySelectorAll('.portal-section').forEach(function (section) {
      const isActive = section.dataset.tabPanel === slug;
      section.classList.toggle('is-active', isActive);
      section.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    });

    if (pushHistory) {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', slug);
      window.history.pushState({ tab: slug }, '', url.toString());
    }

    if (slug === 'status') {
      renderStatusTab();
    }

    // Reset scroll to the top of <main> when switching tabs.
    const main = document.querySelector('.portal-main');
    if (main) {
      main.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  }

  function wireTabs() {
    document.querySelectorAll('.portal-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setActiveTab(btn.dataset.tab);
      });
    });

    window.addEventListener('popstate', function (event) {
      const state = event.state || {};
      setActiveTab(state.tab || getTabFromUrl(), { pushHistory: false });
    });
  }

  /* ---- Status tab loader ---- */

  let statusLoaded = false;

  function renderStatusTab() {
    const panel = document.getElementById('tab-status');
    if (!panel) return;
    if (statusLoaded) return;
    statusLoaded = true;

    const grid = document.getElementById('status-grid');
    const asOf = document.getElementById('status-asof');
    if (!grid || !asOf) return;

    fetch('data/status.json', { cache: 'no-cache' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        asOf.textContent = data.asOf || 'unknown';
        const cards = (data.subProjects || []).map(function (sp) {
          const statusKey = sp.status || 'not-started';
          const pillLabel = statusKey.replace(/-/g, ' ');
          const cardCls = 'status-card status-card--' + statusKey;
          const pillCls = 'status-card__pill status-card__pill--' + statusKey;
          return [
            '<article class="' + cardCls + '">',
            '  <div class="status-card__head">',
            '    <h3 class="status-card__title">SP ' + sp.id + ' &middot; ' + escapeHtml(sp.name) + '</h3>',
            '    <span class="' + pillCls + '">' + escapeHtml(pillLabel) + '</span>',
            '  </div>',
            '  <p class="status-card__summary">' + escapeHtml(sp.summary || '') + '</p>',
            '  <div class="status-card__metrics">',
            '    <span><strong>' + (sp.taskCount || 0) + '</strong>tasks</span>',
            '    <span><strong>' + (sp.prCount || 0) + '</strong>PRs</span>',
            '  </div>',
            '</article>',
          ].join('\n');
        });
        grid.innerHTML = cards.join('\n');
      })
      .catch(function (err) {
        grid.innerHTML = '<p class="status-error">Could not load status: ' + escapeHtml(String(err && err.message)) + '</p>';
      });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ---- Boot ---- */

  document.addEventListener('DOMContentLoaded', function () {
    wireTabs();
    setActiveTab(getTabFromUrl(), { pushHistory: false });
  });
})();
