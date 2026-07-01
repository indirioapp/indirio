chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'indirioDownload',
    title: 'indirio ile İndir',
    contexts: ['page', 'link', 'video'],
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === 'indirioDownload') {
    const targetUrl = info.linkUrl || info.pageUrl;
    if (targetUrl) {
      chrome.storage.sync.get({ serverUrl: 'https://indirio.com.tr' }, (items) => {
        const redirectUrl = `${items.serverUrl}/?url=${encodeURIComponent(targetUrl)}`;
        chrome.tabs.create({ url: redirectUrl });
      });
    }
  }
});
