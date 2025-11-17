// anti-adblock.js
setTimeout(() => {
  let blocked = false;

  // 1) Probar cargar un script falso de Google Ads (los adblockers lo bloquean)
  const testScript = document.createElement("script");
  testScript.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?testblock=true";
  testScript.onerror = () => {
    blocked = true;
    showPopup();
  };
  document.body.appendChild(testScript);

  // 2) Bait clásico como respaldo
  const bait = document.createElement("div");
  bait.className = "adsbygoogle";
  bait.style.display = "block";
  document.body.appendChild(bait);

  setTimeout(() => {
    if ((!bait.offsetHeight && !bait.offsetWidth) && !blocked) {
      blocked = true;
      showPopup();
    }
    bait.remove();
  }, 300);

  function showPopup() {
    const popup = document.getElementById("adblock-popup");
    if (popup) popup.style.display = "flex";
  }
}, 300);
