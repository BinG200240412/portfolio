/* Only observers attached to a parent document outlive an embedded document's
 * own DOM. Own them explicitly; never patch the native observer constructor. */
(() => {
  'use strict';
  if (window.PortfolioLifecycle) return;
  const parents = new Map(), callbacks = new Set();
  let lookup = new WeakMap(), state = 'active';
  const copyOptions = options => ({...options, ...(options.attributeFilter ? {attributeFilter:[...options.attributeFilter]} : {})});
  function publish() {
    document.documentElement.dataset.lifecycleState = state;
    document.documentElement.dataset.lifecycleObservers = String(parents.size);
  }
  function trackParent(observer, target, options) {
    if (!observer || !target) return observer;
    if (state === 'disposed') { observer.disconnect(); return observer; }
    let targets = parents.get(observer);
    if (!targets) { targets = new Map(); parents.set(observer, targets); }
    targets.set(target, copyOptions(options));
    if (state === 'suspended') observer.disconnect();
    publish();
    return observer;
  }
  function observeParent(target, callback, options) {
    if (!target) return null;
    let observers = lookup.get(target);
    if (!observers) { observers = new Map(); lookup.set(target, observers); }
    let observer = observers.get(callback);
    if (!observer) { observer = new MutationObserver(callback); observers.set(callback, observer); }
    if (state === 'active') observer.observe(target, options);
    return trackParent(observer, target, options);
  }
  function forgetParent(observer) {
    observer?.disconnect(); parents.delete(observer); publish();
  }
  function onDispose(callback) {
    if (typeof callback !== 'function') return () => {};
    if (state === 'disposed') { callback(); return () => {}; }
    callbacks.add(callback);
    return () => callbacks.delete(callback);
  }
  function pause() {
    if (state !== 'active') return;
    state = 'suspended';
    parents.forEach((_, observer) => observer.disconnect());
    publish();
  }
  function resume() {
    if (state !== 'suspended') return;
    state = 'active';
    parents.forEach((targets, observer) => targets.forEach((options, target) => observer.observe(target, options)));
    publish();
  }
  function dispose() {
    if (state === 'disposed') return;
    state = 'disposed';
    parents.forEach((_, observer) => observer.disconnect());
    parents.clear(); lookup = new WeakMap();
    const pending = [...callbacks]; callbacks.clear();
    pending.forEach(callback => { try { callback(); } catch (error) { console.warn('Page cleanup failed', error); } });
    publish();
  }
  window.PortfolioLifecycle = Object.freeze({observeParent, trackParent, forgetParent, onDispose, dispose,
    status:() => ({state, observers:parents.size, cleanups:callbacks.size})});
  addEventListener('pagehide', event => event.persisted ? pause() : dispose());
  addEventListener('pageshow', resume);
  publish();
})();
