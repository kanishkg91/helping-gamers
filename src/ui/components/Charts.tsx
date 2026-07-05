import type { Grade } from '../../core/score';
import { GRADE_HEX } from './GradeBadge';

/*
 * Chart rules honored throughout (see HANDOFF): single-series charts use ONE
 * hue with direct labels + native tooltips; no dual axes; text is always in
 * ink/dim colors, never the series color; grade colors are only ever used
 * together with the visible grade letter.
 */

export interface ColumnDatum {
  label: string;
  value: number;
  title?: string;
}

/** Single-series column chart (e.g. deaths per year), brand red on dark. */
export function ColumnChart({ data, height = 220 }: { data: ColumnDatum[]; height?: number }) {
  if (data.length === 0) return null;
  const w = 700;
  const pad = { top: 26, bottom: 26, left: 8, right: 8 };
  const innerW = w - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(...data.map((d) => d.value), 1);
  const step = innerW / data.length;
  const barW = Math.min(52, step * 0.62);

  return (
    <div className="chart" role="img" aria-label={`Column chart: ${data.map((d) => `${d.label} ${d.value}`).join(', ')}`}>
      <svg viewBox={`0 0 ${w} ${height}`}>
        {data.map((d, i) => {
          const h = (d.value / max) * innerH;
          const x = pad.left + step * i + (step - barW) / 2;
          const y = pad.top + innerH - h;
          return (
            <g key={d.label}>
              <rect className="bar" x={x} y={y} width={barW} height={Math.max(h, 1)} rx="4" fill="var(--brand)">
                <title>{d.title ?? `${d.label}: ${d.value}`}</title>
              </rect>
              <text className="dlabel" x={x + barW / 2} y={y - 7} textAnchor="middle">
                {d.value}
              </text>
              <text className="axis" x={x + barW / 2} y={height - 8} textAnchor="middle">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export interface HBarDatum {
  label: string;
  value: number;
  href?: string;
  title?: string;
}

/** Single-series horizontal bars (e.g. publisher kill counts). */
export function HBarChart({ data }: { data: HBarDatum[] }) {
  if (data.length === 0) return null;
  const w = 700;
  const rowH = 34;
  const labelW = 190;
  const valueW = 34;
  const h = data.length * rowH + 6;
  const max = Math.max(...data.map((d) => d.value), 1);
  const barMax = w - labelW - valueW - 16;

  return (
    <div className="chart" role="img" aria-label={`Bar chart: ${data.map((d) => `${d.label} ${d.value}`).join(', ')}`}>
      <svg viewBox={`0 0 ${w} ${h}`}>
        {data.map((d, i) => {
          const y = i * rowH + 4;
          const bw = Math.max((d.value / max) * barMax, 2);
          const row = (
            <g key={d.label}>
              <text className="blabel" x={labelW - 10} y={y + rowH / 2 + 1} textAnchor="end" dominantBaseline="middle">
                {d.label.length > 24 ? `${d.label.slice(0, 23)}…` : d.label}
              </text>
              <rect className="bar" x={labelW} y={y + 6} width={bw} height={rowH - 14} rx="4" fill="var(--brand)">
                <title>{d.title ?? `${d.label}: ${d.value}`}</title>
              </rect>
              <text className="dlabel" x={labelW + bw + 8} y={y + rowH / 2 + 1} dominantBaseline="middle">
                {d.value}
              </text>
            </g>
          );
          return d.href ? (
            <a key={d.label} href={d.href}>
              {row}
            </a>
          ) : (
            row
          );
        })}
      </svg>
    </div>
  );
}

export interface GradeCount {
  grade: Grade;
  count: number;
}

/**
 * Stacked grade-distribution bar. Grade colors are always paired with the
 * visible letter + count inside (or above) each segment — never color alone.
 */
export function StackedGradeBar({ counts }: { counts: GradeCount[] }) {
  const total = counts.reduce((s, c) => s + c.count, 0);
  if (total === 0) return null;
  const w = 700;
  const barH = 46;
  const h = barH + 30;
  let x = 0;

  return (
    <div className="chart" role="img" aria-label={counts.map((c) => `${c.count} grade ${c.grade}`).join(', ')}>
      <svg viewBox={`0 0 ${w} ${h}`}>
        {counts
          .filter((c) => c.count > 0)
          .map((c) => {
            const bw = (c.count / total) * w;
            const cx = x + bw / 2;
            const wide = bw >= 44;
            const seg = (
              <g key={c.grade}>
                <rect className="bar" x={x} y={0} width={bw - 2} height={barH} rx="6" fill={GRADE_HEX[c.grade]} fillOpacity="0.22" stroke={GRADE_HEX[c.grade]} strokeWidth="1.5">
                  <title>{`Grade ${c.grade}: ${c.count} game${c.count === 1 ? '' : 's'}`}</title>
                </rect>
                <text x={cx} y={wide ? barH / 2 + 1 : barH + 20} textAnchor="middle" dominantBaseline="middle" fontFamily="var(--mono)" fontSize="15" fontWeight="800" fill={GRADE_HEX[c.grade]}>
                  {c.grade}
                  <tspan fontSize="12" fontWeight="600" fill="var(--ink)">
                    {' '}
                    ×{c.count}
                  </tspan>
                </text>
              </g>
            );
            x += bw;
            return seg;
          })}
      </svg>
    </div>
  );
}
