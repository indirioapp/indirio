function injectYoutubeButton() {
  const container = document.querySelector('#top-level-buttons-computed');
  if (!container || document.querySelector('#indirio-btn-yt')) return;

  const btn = document.createElement('button');
  btn.id = 'indirio-btn-yt';
  btn.className =
    'yt-spec-button-shape-next yt-spec-button-shape-next--filled yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m yt-spec-button-shape-next--icon-leading';
  btn.style.marginLeft = '8px';
  btn.style.backgroundColor = '#6366f1';
  btn.style.color = '#ffffff';
  btn.style.borderRadius = '18px';
  btn.style.padding = '0 16px';
  btn.style.fontWeight = 'bold';
  btn.style.cursor = 'pointer';
  btn.innerHTML = 'indirio';

  btn.addEventListener('click', () => {
    chrome.storage.sync.get({ serverUrl: 'https://indirio.com.tr' }, (items) => {
      window.open(`${items.serverUrl}/?url=${encodeURIComponent(window.location.href)}`, '_blank');
    });
  });

  container.appendChild(btn);
}

if (window.location.hostname.includes('youtube.com')) {
  setInterval(injectYoutubeButton, 2000);
}
