/* Browser presentation only. Original game rules, artwork and save keys are retained. */
(() => {
  document.addEventListener('contextmenu', event => { if (event.target.closest('img,canvas,video')) event.preventDefault(); });
  document.addEventListener('dragstart', event => { if (event.target.closest('img,canvas,video')) event.preventDefault(); });
  addEventListener('keydown', event => {
    if (event.key === 'Escape' && parent !== window) parent.postMessage({type:'tea:close'}, location.origin);
  });
  document.addEventListener('visibilitychange', () => {
    const audio = typeof ac !== 'undefined' ? ac : null;
    if (audio) {
      if (document.hidden) audio.suspend().catch(() => {});
      else if (audio.state === 'suspended') audio.resume().catch(() => {});
    }
  });
})();
