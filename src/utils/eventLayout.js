import moment from 'moment';

/**
 * Assigns each event a column index + total column count within its
 * time-overlap cluster, so events that overlap in the same room column
 * render side-by-side instead of stacking on top of each other
 * (Google-Calendar-style day view layout).
 *
 * @param {Array<{id: number|string, start: string, end: string}>} events
 * @returns {Map<number|string, {col: number, cols: number}>}
 */
export function layoutOverlaps(events) {
  const layout = new Map();
  if (!events.length) return layout;

  const sorted = [...events].sort((a, b) => {
    const startDiff = moment(a.start).valueOf() - moment(b.start).valueOf();
    if (startDiff !== 0) return startDiff;
    return moment(a.end).valueOf() - moment(b.end).valueOf();
  });

  let cluster = [];
  let clusterEnd = null;

  const flushCluster = () => {
    if (!cluster.length) return;
    // Greedy column assignment: place each event in the first column whose
    // last-placed event already ended, otherwise open a new column.
    const columnEnds = [];
    for (const ev of cluster) {
      const start = moment(ev.start).valueOf();
      const end = moment(ev.end).valueOf();
      let col = columnEnds.findIndex((endTime) => endTime <= start);
      if (col === -1) {
        col = columnEnds.length;
        columnEnds.push(end);
      } else {
        columnEnds[col] = end;
      }
      layout.set(ev.id, { col, cols: 0 }); // cols filled in below once known
    }
    const cols = columnEnds.length;
    for (const ev of cluster) {
      layout.get(ev.id).cols = cols;
    }
    cluster = [];
    clusterEnd = null;
  };

  for (const ev of sorted) {
    const start = moment(ev.start).valueOf();
    const end = moment(ev.end).valueOf();
    if (clusterEnd !== null && start >= clusterEnd) {
      flushCluster();
    }
    cluster.push(ev);
    clusterEnd = clusterEnd === null ? end : Math.max(clusterEnd, end);
  }
  flushCluster();

  return layout;
}
