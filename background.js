importScripts('core.js');
chrome.storage.local.setAccessLevel({accessLevel: 'TRUSTED_CONTEXTS'});
chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (sender.id !== chrome.runtime.id) return;
  if (message.type === 'settings') { chrome.runtime.openOptionsPage(); reply({ok:true}); return; }
  if (message.type !== 'lookup' || !sender.tab?.url?.startsWith('https://connect.bracu.ac.bd/app/exam-controller/attendance/entry')) return;
  (async () => {
    const {apiKey} = await chrome.storage.local.get('apiKey');
    if (!apiKey) throw new Error('Add your API key in extension settings first.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(message.date) || !/^[A-Z]{2,}\d{3,}[A-Z]?$/.test(message.course) || !/^\d{6,12}$/.test(message.id)) throw new Error('Invalid lookup parameters.');
    const url = new URL('https://bracu.partho.org/api/attendance/status');
    url.search = new URLSearchParams({api_key:apiKey,date:message.date,student_id:message.id,course_code:message.course});
    const response = await fetch(url, {credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
    if (!response.ok) throw new Error(`API request failed (${response.status}).`);
    return {status:AttendanceCore.status(await response.text())};
  })().then(reply).catch(e => reply({error:e.name === 'TimeoutError' ? 'API timed out. Try again.' : /fetch/i.test(e.message) ? 'Cannot reach attendance API.' : e.message}));
  return true;
});
