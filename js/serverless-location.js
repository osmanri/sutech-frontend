// Keep existing shared links usable after moving the Mini App to Telegram.
(function(){
  'use strict';
  function migrate(){
    if(window.location.hostname!=='frontend-2-mauve.vercel.app')return;
    if(!(window.Telegram&&window.Telegram.WebApp&&window.Telegram.WebApp.initData))return;
    window.location.replace('https://app8796056339.tgcloud.ai/'+window.location.search+window.location.hash);
  }
  window.addEventListener('telegram-ready',migrate);
  migrate();
})();
