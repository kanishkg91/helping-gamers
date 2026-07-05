import type { Grade } from '../../core/score';

export const GRADE_COLORS: Record<Grade, string> = {
  A: 'var(--grade-a)',
  B: 'var(--grade-b)',
  C: 'var(--grade-c)',
  D: 'var(--grade-d)',
  F: 'var(--grade-f)',
};

export const GRADE_HEX: Record<Grade, string> = {
  A: '#2fd483',
  B: '#a6d34d',
  C: '#f5b83d',
  D: '#f28444',
  F: '#f4655f',
};

/** The letter is always rendered with its color — never color alone. */
export function GradeBadge({ grade, size = 'sm' }: { grade: Grade; size?: 'sm' | 'lg' }) {
  return (
    <span
      className={`gradebadge ${size} grade-${grade}`}
      role="img"
      aria-label={`Survival grade ${grade}`}
    >
      {grade}
    </span>
  );
}
