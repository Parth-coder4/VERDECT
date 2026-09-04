/**
 * Formats a timestamp into human-readable local date/time, relative time, and formatted timestamps.
 */
export function formatAuditTimestamp(isoOrDateStr?: string | null): {
  formattedDate: string;
  relativeTime: string;
  timeOnly: string;
  dateOnly: string;
  raw: string;
} {
  if (!isoOrDateStr) {
    const now = new Date();
    const dateOnly = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeOnly = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    return {
      formattedDate: `${dateOnly}, ${timeOnly}`,
      relativeTime: 'Just now',
      timeOnly,
      dateOnly,
      raw: now.toISOString()
    };
  }

  try {
    let d: Date;
    if (typeof isoOrDateStr === 'number' || /^\d+$/.test(isoOrDateStr)) {
      d = new Date(Number(isoOrDateStr));
    } else if (isoOrDateStr.includes('T')) {
      d = new Date(isoOrDateStr);
    } else {
      // Handles formats like "2026-09-04 18:19:01" or "2026-09-04"
      d = new Date(isoOrDateStr.replace(' ', 'T'));
      if (isNaN(d.getTime())) {
        d = new Date(isoOrDateStr);
      }
    }

    if (isNaN(d.getTime())) {
      return {
        formattedDate: isoOrDateStr,
        relativeTime: isoOrDateStr,
        timeOnly: isoOrDateStr,
        dateOnly: isoOrDateStr,
        raw: isoOrDateStr
      };
    }

    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    let relativeTime = 'Just now';
    if (diffSec < 45 && diffSec >= -10) {
      relativeTime = 'Just now';
    } else if (diffMin < 60 && diffMin >= 1) {
      relativeTime = `${diffMin} min${diffMin > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24 && diffHours >= 1) {
      relativeTime = `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays === 1) {
      relativeTime = 'Yesterday';
    } else if (diffDays > 1 && diffDays < 30) {
      relativeTime = `${diffDays} days ago`;
    } else {
      relativeTime = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    const dateOnly = d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const timeOnly = d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    return {
      formattedDate: `${dateOnly}, ${timeOnly}`,
      relativeTime,
      timeOnly,
      dateOnly,
      raw: isoOrDateStr
    };
  } catch {
    return {
      formattedDate: String(isoOrDateStr),
      relativeTime: String(isoOrDateStr),
      timeOnly: String(isoOrDateStr),
      dateOnly: String(isoOrDateStr),
      raw: String(isoOrDateStr)
    };
  }
}

