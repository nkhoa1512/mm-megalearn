const BUCKET_MS = 30000;

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export function currentBucket(now = Date.now()) {
  return Math.floor(now / BUCKET_MS);
}

export function secondsUntilNextBucket(now = Date.now()) {
  return Math.ceil((BUCKET_MS - (now % BUCKET_MS)) / 1000);
}

export function sessionQrSecret(session) {
  return session?.qrSecret || session?.id || 'unknown-session';
}

export function generateQrToken(sessionId, qrSecret, phase, bucket = currentBucket()) {
  return `${phase}-${hashString(`${sessionId}:${qrSecret}:${phase}:${bucket}`)}`;
}

export function isQrTokenValid(token, sessionId, qrSecret, phase, now = Date.now()) {
  const bucket = currentBucket(now);
  return (
    token === generateQrToken(sessionId, qrSecret, phase, bucket) ||
    token === generateQrToken(sessionId, qrSecret, phase, bucket - 1)
  );
}

function combineDateTime(dateStr, timeStr, offsetMinutes = 0) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  // Real seeded session.time values are range strings like '08:30 - 11:30 (3.0 hours)',
  // not bare 'HH:MM' — take only the leading HH:MM before parsing, otherwise the
  // minutes component silently becomes NaN and every derived window is truncated
  // to the top of the hour.
  const leadingTime = (timeStr || '09:00').trim().split(/[\s-]/)[0];
  const [hh, mm] = leadingTime.split(':').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1, Number.isFinite(hh) ? hh : 9, Number.isFinite(mm) ? mm : 0);
  dt.setMinutes(dt.getMinutes() + offsetMinutes);
  return dt.toISOString();
}

export function deriveAttendanceWindows(session) {
  if (session?.checkInWindowStart && session?.checkInWindowEnd && session?.checkOutWindowStart && session?.checkOutWindowEnd) {
    return {
      checkIn: { start: session.checkInWindowStart, end: session.checkInWindowEnd },
      checkOut: { start: session.checkOutWindowStart, end: session.checkOutWindowEnd },
    };
  }
  return {
    checkIn: { start: combineDateTime(session?.date, session?.time, -15), end: combineDateTime(session?.date, session?.time, 30) },
    checkOut: { start: combineDateTime(session?.date, session?.time, 90), end: combineDateTime(session?.date, session?.time, 180) },
  };
}
