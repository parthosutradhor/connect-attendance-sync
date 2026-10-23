const key = document.querySelector('#key');
const message = document.querySelector('#message');
chrome.storage.local.get('apiKey').then(data => { key.value = data.apiKey || ''; });
document.querySelector('#settings').addEventListener('submit', async event => {
  event.preventDefault();
  if (!key.value.trim()) return;
  try { await chrome.storage.local.set({apiKey:key.value.trim()}); message.textContent = 'Settings saved. You can now sync a class in Connect.'; }
  catch { message.textContent = 'Could not save settings. Please try again.'; }
});
document.querySelector('#show').onclick = event => { key.type = key.type === 'password' ? 'text' : 'password'; event.target.textContent = key.type === 'password' ? 'Show' : 'Hide'; };
document.querySelector('#remove').onclick = async () => { await chrome.storage.local.remove('apiKey'); key.value = ''; message.textContent = 'API key removed.'; };
