(function (root) {
  const api = {
    date(text) {
      const m = text.match(/\b(\d{2})-(\d{2})-(\d{4})\b/);
      if (!m) throw new Error('Choose a class with a date first.');
      const iso = `${m[3]}-${m[2]}-${m[1]}`;
      const d = new Date(iso + 'T00:00:00Z');
      if (!Number.isFinite(+d) || d.toISOString().slice(0, 10) !== iso) throw new Error('Invalid class date.');
      return iso;
    },
    course(text) {
      const m = text.match(/^\s*([A-Z]{2,}\s*\d{3,}[A-Z]?)\b/i);
      if (!m) throw new Error('Choose a course first.');
      return m[1].replace(/\s/g, '').toUpperCase();
    },
    status(body) {
      let data = body.trim();
      try { data = JSON.parse(data); } catch {}
      if (data && typeof data === 'object') data = data.status ?? data.attendance_status ?? data.data?.status;
      if (data !== 'A' && data !== 'P') throw new Error('API did not return A or P.');
      return data;
    }
  };
  root.AttendanceCore = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
