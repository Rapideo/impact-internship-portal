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
    // Until H.2 lands, the panel is empty — there's nothing to render.
    // H.2's Status-tab task fills the inner markup and switches statusLoaded
    // to a real fetch + render. For H.1, this function is a placeholder
    // that intentionally does nothing.
    if (statusLoaded) return;
    statusLoaded = true;
  }

  /* ---- Boot ---- */

  document.addEventListener('DOMContentLoaded', function () {
    wireTabs();
    setActiveTab(getTabFromUrl(), { pushHistory: false });
  });
})();
