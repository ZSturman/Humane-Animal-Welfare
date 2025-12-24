import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

type Severity = 'CRITICAL' | 'HIGH' | 'ELEVATED' | 'MODERATE' | 'LOW' | string;

interface RiskSeverityBadgeProps {
  severity: Severity;
  size?: 'sm' | 'md' | 'lg';
  showPulse?: boolean;
}

export default function RiskSeverityBadge({
  severity,
  size = 'md',
  showPulse = false,
}: RiskSeverityBadgeProps) {
  const { t } = useTranslation('risk');
  
  const normalize = (s?: Severity) => {
    const val = (s ?? 'low').toString().trim().toLowerCase();
    if (val.includes('critical')) return 'critical';
    if (val.includes('high')) return 'high';
    if (val.includes('elevated')) return 'elevated';
    if (val.includes('moderate')) return 'moderate';
    return 'low';
  };

  const normalizedSeverity = normalize(severity) as
    | 'critical'
    | 'high'
    | 'elevated'
    | 'moderate'
    | 'low';

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px]',
    md: 'px-2 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm',
  };

  return (
    <span
      className={clsx(
        'risk-badge',
        `risk-badge-${normalizedSeverity}`,
        sizeClasses[size],
        showPulse && normalizedSeverity === 'critical' && 'animate-pulse-risk'
      )}
    >
      {t(`severity.${normalizedSeverity}`)}
    </span>
  );
}
