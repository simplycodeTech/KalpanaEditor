/**
 * Table editing helpers that understand colspan / rowspan (merged cells).
 * All functions mutate the given table in place.
 */

type Cell = HTMLTableCellElement;

export interface TableGrid {
  /** grid[row][col] → cell that covers this slot */
  grid: (Cell | null)[][];
  /** origin (top-left slot) of each cell */
  origin: Map<Cell, { row: number; col: number }>;
  rows: HTMLTableRowElement[];
  width: number;
}

export const DEFAULT_CELL_STYLE = 'border: 1px solid #bfbfbf; padding: 6px 8px; min-width: 40px';

export function buildGrid(table: HTMLTableElement): TableGrid {
  const rows = Array.from(table.rows);
  const grid: (Cell | null)[][] = rows.map(() => []);
  const origin = new Map<Cell, { row: number; col: number }>();
  rows.forEach((tr, r) => {
    let c = 0;
    Array.from(tr.cells).forEach((cell) => {
      while (grid[r][c]) c++;
      const rs = Math.max(1, cell.rowSpan || 1);
      const cs = Math.max(1, cell.colSpan || 1);
      origin.set(cell, { row: r, col: c });
      for (let i = 0; i < rs && r + i < rows.length; i++) {
        for (let j = 0; j < cs; j++) {
          grid[r + i][c + j] = cell;
        }
      }
      c += cs;
    });
  });
  const width = grid.reduce((w, row) => Math.max(w, row.length), 0);
  grid.forEach((row) => {
    for (let i = 0; i < width; i++) if (row[i] === undefined) row[i] = null;
  });
  return { grid, origin, rows, width };
}

export function createCell(tag: 'td' | 'th', template?: Cell | null): Cell {
  const cell = document.createElement(tag) as Cell;
  cell.innerHTML = '<br>';
  const style = template?.getAttribute('style');
  cell.setAttribute('style', style || DEFAULT_CELL_STYLE);
  return cell;
}

/** Insert `cell` into `tr` so that it lands at grid column `col`. */
function insertCellAtColumn(g: TableGrid, tr: HTMLTableRowElement, cell: Cell, col: number): void {
  const before = Array.from(tr.cells).find((c) => (g.origin.get(c)?.col ?? 0) >= col);
  tr.insertBefore(cell, before ?? null);
}

export function insertRow(table: HTMLTableElement, ref: Cell, below: boolean): void {
  const g = buildGrid(table);
  const o = g.origin.get(ref);
  if (!o) return;
  const at = below ? o.row + Math.max(1, ref.rowSpan) : o.row;
  const tr = document.createElement('tr');
  const extended = new Set<Cell>();
  const headerCol = hasHeaderColumn(table);
  for (let c = 0; c < g.width; c++) {
    const above = at > 0 ? g.grid[at - 1]?.[c] : null;
    const spanning = above && at < g.rows.length && g.grid[at]?.[c] === above ? above : null;
    if (spanning) {
      if (!extended.has(spanning)) {
        spanning.rowSpan = spanning.rowSpan + 1;
        extended.add(spanning);
      }
      continue;
    }
    const tmpl = g.grid[Math.min(at, g.rows.length - 1)]?.[c] ?? null;
    const tag = c === 0 && headerCol ? 'th' : 'td';
    const cell = createCell(tag, tmpl && tmpl.tagName === 'TD' ? tmpl : null);
    if (tag === 'th') cell.setAttribute('scope', 'row');
    tr.appendChild(cell);
  }
  const refRow = g.rows[at];
  if (refRow) refRow.parentNode?.insertBefore(tr, refRow);
  else g.rows[g.rows.length - 1].parentNode?.appendChild(tr);
}

export function insertColumn(table: HTMLTableElement, ref: Cell, right: boolean): void {
  const g = buildGrid(table);
  const o = g.origin.get(ref);
  if (!o) return;
  const at = right ? o.col + Math.max(1, ref.colSpan) : o.col;
  const extended = new Set<Cell>();
  g.rows.forEach((tr, r) => {
    const cur = at < g.width ? g.grid[r][at] : null;
    const curOrigin = cur ? g.origin.get(cur)! : null;
    if (cur && curOrigin && curOrigin.col < at) {
      // a merged cell spans across the insertion point
      if (!extended.has(cur)) {
        cur.colSpan = cur.colSpan + 1;
        extended.add(cur);
      }
      return;
    }
    const neighbour = g.grid[r][Math.min(at, g.width - 1)] ?? g.grid[r][at - 1] ?? null;
    const tag = r === 0 && isHeaderRow(g) ? 'th' : 'td';
    insertCellAtColumn(g, tr, createCell(tag, neighbour && neighbour.tagName === 'TD' ? neighbour : null), at);
  });
}

function isHeaderRow(g: TableGrid): boolean {
  return g.grid[0]?.length > 0 && g.grid[0].every((c) => c?.tagName === 'TH');
}

export function deleteRow(table: HTMLTableElement, ref: Cell): void {
  const g = buildGrid(table);
  const o = g.origin.get(ref);
  if (!o) return;
  const r = o.row;
  const tr = g.rows[r];
  const handled = new Set<Cell>();
  for (let c = 0; c < g.width; c++) {
    const cell = g.grid[r][c];
    if (!cell || handled.has(cell)) continue;
    handled.add(cell);
    const co = g.origin.get(cell)!;
    if (cell.rowSpan > 1) {
      if (co.row < r) {
        cell.rowSpan -= 1;
      } else {
        // starts in the deleted row → move down to next row
        const next = g.rows[r + 1];
        cell.rowSpan -= 1;
        if (next) insertCellAtColumn(g, next, cell, co.col);
      }
    }
  }
  tr.remove();
  if (!table.rows.length) removeTable(table);
}

export function deleteColumn(table: HTMLTableElement, ref: Cell): void {
  const g = buildGrid(table);
  const o = g.origin.get(ref);
  if (!o) return;
  const col = o.col;
  const handled = new Set<Cell>();
  for (let r = 0; r < g.rows.length; r++) {
    const cell = g.grid[r][col];
    if (!cell || handled.has(cell)) continue;
    handled.add(cell);
    if (cell.colSpan > 1) cell.colSpan -= 1;
    else cell.remove();
  }
  Array.from(table.rows).forEach((tr) => {
    if (!tr.cells.length) tr.remove();
  });
  if (!table.querySelector('td, th')) removeTable(table);
}

function removeTable(table: HTMLTableElement): void {
  const fig = table.closest('figure.table');
  (fig ?? table).remove();
}

function moveContent(from: Cell, to: Cell): void {
  const empty = (el: Element) => !el.textContent?.trim() && !el.querySelector('img, iframe, table');
  if (empty(from)) return;
  if (empty(to)) to.innerHTML = '';
  else to.appendChild(document.createElement('br'));
  while (from.firstChild) to.appendChild(from.firstChild);
}

export function canMerge(table: HTMLTableElement, ref: Cell, dir: 'right' | 'left' | 'down' | 'up'): boolean {
  return !!mergeTarget(buildGrid(table), ref, dir);
}

function mergeTarget(g: TableGrid, ref: Cell, dir: 'right' | 'left' | 'down' | 'up'): Cell | null {
  const o = g.origin.get(ref);
  if (!o) return null;
  const rs = Math.max(1, ref.rowSpan);
  const cs = Math.max(1, ref.colSpan);
  let other: Cell | null = null;
  if (dir === 'right') other = g.grid[o.row]?.[o.col + cs] ?? null;
  if (dir === 'left') other = o.col > 0 ? g.grid[o.row]?.[o.col - 1] ?? null : null;
  if (dir === 'down') other = g.grid[o.row + rs]?.[o.col] ?? null;
  if (dir === 'up') other = o.row > 0 ? g.grid[o.row - 1]?.[o.col] ?? null : null;
  if (!other || other === ref) return null;
  const oo = g.origin.get(other)!;
  if (dir === 'right' || dir === 'left') {
    if (oo.row !== o.row || Math.max(1, other.rowSpan) !== rs) return null;
  } else if (oo.col !== o.col || Math.max(1, other.colSpan) !== cs) {
    return null;
  }
  return other;
}

/** Merge `ref` with its neighbour. Returns the surviving cell. */
export function mergeCell(table: HTMLTableElement, ref: Cell, dir: 'right' | 'left' | 'down' | 'up'): Cell | null {
  const g = buildGrid(table);
  const other = mergeTarget(g, ref, dir);
  if (!other) return null;
  // keep the top-left cell
  const [keep, drop] = dir === 'left' || dir === 'up' ? [other, ref] : [ref, other];
  if (dir === 'right' || dir === 'left') keep.colSpan = Math.max(1, keep.colSpan) + Math.max(1, drop.colSpan);
  else keep.rowSpan = Math.max(1, keep.rowSpan) + Math.max(1, drop.rowSpan);
  moveContent(drop, keep);
  drop.remove();
  normalizeTable(table);
  return keep;
}

export function splitCellVertically(table: HTMLTableElement, ref: Cell): void {
  const g = buildGrid(table);
  const o = g.origin.get(ref);
  if (!o) return;
  const cs = Math.max(1, ref.colSpan);
  const fresh = createCell(ref.tagName === 'TH' ? 'th' : 'td', ref);
  fresh.rowSpan = Math.max(1, ref.rowSpan);
  if (cs > 1) {
    const left = Math.ceil(cs / 2);
    ref.colSpan = left;
    fresh.colSpan = cs - left;
  } else {
    // add a new grid column: every other cell in this column gets wider
    const handled = new Set<Cell>([ref]);
    for (let r = 0; r < g.rows.length; r++) {
      const cell = g.grid[r][o.col];
      if (!cell || handled.has(cell)) continue;
      handled.add(cell);
      cell.colSpan = Math.max(1, cell.colSpan) + 1;
    }
  }
  ref.parentElement?.insertBefore(fresh, ref.nextSibling);
  normalizeTable(table);
}

export function splitCellHorizontally(table: HTMLTableElement, ref: Cell): void {
  const g = buildGrid(table);
  const o = g.origin.get(ref);
  if (!o) return;
  const rs = Math.max(1, ref.rowSpan);
  const fresh = createCell(ref.tagName === 'TH' ? 'th' : 'td', ref);
  fresh.colSpan = Math.max(1, ref.colSpan);
  if (rs > 1) {
    const top = Math.ceil(rs / 2);
    ref.rowSpan = top;
    fresh.rowSpan = rs - top;
    const targetRow = g.rows[o.row + top];
    if (targetRow) insertCellAtColumn(g, targetRow, fresh, o.col);
  } else {
    // add a new grid row below: every other cell in this row gets taller
    const handled = new Set<Cell>([ref]);
    for (let c = 0; c < g.width; c++) {
      const cell = g.grid[o.row][c];
      if (!cell || handled.has(cell)) continue;
      handled.add(cell);
      cell.rowSpan = Math.max(1, cell.rowSpan) + 1;
    }
    const tr = document.createElement('tr');
    tr.appendChild(fresh);
    g.rows[o.row].parentNode?.insertBefore(tr, g.rows[o.row].nextSibling);
  }
  normalizeTable(table);
}

/** Remove empty rows left behind by merges and fix rowspans that point past the table. */
export function normalizeTable(table: HTMLTableElement): void {
  let changed = true;
  while (changed) {
    changed = false;
    const g = buildGrid(table);
    for (let r = 0; r < g.rows.length; r++) {
      if (g.rows[r].cells.length === 0) {
        const handled = new Set<Cell>();
        for (let c = 0; c < g.width; c++) {
          const cell = g.grid[r][c];
          if (cell && !handled.has(cell) && cell.rowSpan > 1) {
            handled.add(cell);
            cell.rowSpan -= 1;
          }
        }
        g.rows[r].remove();
        changed = true;
        break;
      }
    }
  }
  const g = buildGrid(table);
  g.origin.forEach((o, cell) => {
    const maxRs = g.rows.length - o.row;
    if (cell.rowSpan > maxRs) cell.rowSpan = maxRs;
    if (cell.rowSpan <= 1) cell.removeAttribute('rowspan');
    if (cell.colSpan <= 1) cell.removeAttribute('colspan');
  });
}

function renameCell(cell: Cell, tag: 'td' | 'th'): Cell {
  if (cell.tagName.toLowerCase() === tag) return cell;
  const n = document.createElement(tag) as Cell;
  Array.from(cell.attributes).forEach((a) => n.setAttribute(a.name, a.value));
  while (cell.firstChild) n.appendChild(cell.firstChild);
  cell.replaceWith(n);
  if (tag === 'td') n.removeAttribute('scope');
  return n;
}

export function hasHeaderRow(table: HTMLTableElement): boolean {
  const first = table.rows[0];
  return !!first && Array.from(first.cells).every((c) => c.tagName === 'TH');
}

export function hasHeaderColumn(table: HTMLTableElement): boolean {
  const g = buildGrid(table);
  const start = hasHeaderRow(table) ? 1 : 0;
  if (g.rows.length <= start) return false;
  for (let r = start; r < g.rows.length; r++) {
    if (g.grid[r][0]?.tagName !== 'TH') return false;
  }
  return true;
}

export function toggleHeaderRow(table: HTMLTableElement): void {
  const first = table.rows[0];
  if (!first) return;
  const on = !hasHeaderRow(table);
  const headerCol = hasHeaderColumn(table);
  Array.from(first.cells).forEach((c, i) => {
    const n = renameCell(c, on || (headerCol && i === 0) ? 'th' : 'td');
    if (on) n.setAttribute('scope', 'col');
  });
}

export function toggleHeaderColumn(table: HTMLTableElement): void {
  const on = !hasHeaderColumn(table);
  const headerRow = hasHeaderRow(table);
  const g = buildGrid(table);
  const handled = new Set<Cell>();
  for (let r = 0; r < g.rows.length; r++) {
    const cell = g.grid[r][0];
    if (!cell || handled.has(cell)) continue;
    handled.add(cell);
    if (r === 0 && headerRow) continue;
    const n = renameCell(cell, on ? 'th' : 'td');
    if (on) n.setAttribute('scope', 'row');
  }
}

/** Return the next/previous cell in reading order (used for Tab navigation). */
export function siblingCell(table: HTMLTableElement, ref: Cell, backwards: boolean): Cell | null {
  const cells = Array.from(table.querySelectorAll<Cell>('td, th')).filter((c) => c.closest('table') === table);
  const i = cells.indexOf(ref);
  if (i === -1) return null;
  return cells[backwards ? i - 1 : i + 1] ?? null;
}
