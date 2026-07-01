document.addEventListener('DOMContentLoaded', () => {
  const downloadBtn = document.getElementById('download-btn');
  const serverUrlInput = document.getElementById('server-url');

  chrome.storage.sync.get({ serverUrl: 'https://indirio.com.tr' }, (items) => {
    serverUrlInput.value = items.serverUrl;
  });

  serverUrlInput.addEventListener('input', () => {
    chrome.storage.sync.set({ serverUrl: serverUrlInput.value });
  });

  downloadBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        const activeUrl = tabs[0].url;
        if (activeUrl) {
          chrome.storage.sync.get({ serverUrl: 'https://indirio.com.tr' }, (items) => {
            const redirectUrl = `${items.serverUrl}/?url=${encodeURIComponent(activeUrl)}`;
            chrome.tabs.create({ url: redirectUrl });
          });
        }
      }
    });
  });
});
