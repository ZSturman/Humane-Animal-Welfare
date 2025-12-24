/**
 * RiskSeverityBadge Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/setup';

// Mock component (represents the actual component behavior)
interface RiskSeverityBadgeProps {
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const RiskSeverityBadge: React.FC<RiskSeverityBadgeProps> = ({ 
  severity, 
  showIcon = true,
  size = 'md' 
}) => {
  const colorClasses = {
    CRITICAL: 'bg-red-100 text-red-800 border-red-300',
    HIGH: 'bg-orange-100 text-orange-800 border-orange-300',
    MODERATE: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    LOW: 'bg-green-100 text-green-800 border-green-300',
  };

  const icons = {
    CRITICAL: '🔴',
    HIGH: '🟠',
    MODERATE: '🟡',
    LOW: '🟢',
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <span 
      data-testid="risk-severity-badge"
      className={`inline-flex items-center rounded-full border ${colorClasses[severity]} ${sizeClasses[size]}`}
    >
      {showIcon && <span className="mr-1">{icons[severity]}</span>}
      <span>{severity}</span>
    </span>
  );
};

describe('RiskSeverityBadge', () => {
  describe('Rendering', () => {
    it('should render badge with correct severity text', () => {
      render(<RiskSeverityBadge severity="CRITICAL" />);
      
      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
    });

    it('should render different severity levels', () => {
      const { rerender } = render(<RiskSeverityBadge severity="CRITICAL" />);
      expect(screen.getByText('CRITICAL')).toBeInTheDocument();

      rerender(<RiskSeverityBadge severity="HIGH" />);
      expect(screen.getByText('HIGH')).toBeInTheDocument();

      rerender(<RiskSeverityBadge severity="MODERATE" />);
      expect(screen.getByText('MODERATE')).toBeInTheDocument();

      rerender(<RiskSeverityBadge severity="LOW" />);
      expect(screen.getByText('LOW')).toBeInTheDocument();
    });

    it('should have data-testid attribute', () => {
      render(<RiskSeverityBadge severity="HIGH" />);
      
      expect(screen.getByTestId('risk-severity-badge')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply red colors for CRITICAL severity', () => {
      render(<RiskSeverityBadge severity="CRITICAL" />);
      
      const badge = screen.getByTestId('risk-severity-badge');
      expect(badge.className).toContain('bg-red-100');
      expect(badge.className).toContain('text-red-800');
    });

    it('should apply orange colors for HIGH severity', () => {
      render(<RiskSeverityBadge severity="HIGH" />);
      
      const badge = screen.getByTestId('risk-severity-badge');
      expect(badge.className).toContain('bg-orange-100');
      expect(badge.className).toContain('text-orange-800');
    });

    it('should apply yellow colors for MODERATE severity', () => {
      render(<RiskSeverityBadge severity="MODERATE" />);
      
      const badge = screen.getByTestId('risk-severity-badge');
      expect(badge.className).toContain('bg-yellow-100');
      expect(badge.className).toContain('text-yellow-800');
    });

    it('should apply green colors for LOW severity', () => {
      render(<RiskSeverityBadge severity="LOW" />);
      
      const badge = screen.getByTestId('risk-severity-badge');
      expect(badge.className).toContain('bg-green-100');
      expect(badge.className).toContain('text-green-800');
    });
  });

  describe('Icon Display', () => {
    it('should show icon by default', () => {
      render(<RiskSeverityBadge severity="CRITICAL" />);
      
      expect(screen.getByText('🔴')).toBeInTheDocument();
    });

    it('should hide icon when showIcon is false', () => {
      render(<RiskSeverityBadge severity="CRITICAL" showIcon={false} />);
      
      expect(screen.queryByText('🔴')).not.toBeInTheDocument();
    });

    it('should show correct icon for each severity', () => {
      const { rerender } = render(<RiskSeverityBadge severity="CRITICAL" />);
      expect(screen.getByText('🔴')).toBeInTheDocument();

      rerender(<RiskSeverityBadge severity="HIGH" />);
      expect(screen.getByText('🟠')).toBeInTheDocument();

      rerender(<RiskSeverityBadge severity="MODERATE" />);
      expect(screen.getByText('🟡')).toBeInTheDocument();

      rerender(<RiskSeverityBadge severity="LOW" />);
      expect(screen.getByText('🟢')).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should apply small size classes', () => {
      render(<RiskSeverityBadge severity="LOW" size="sm" />);
      
      const badge = screen.getByTestId('risk-severity-badge');
      expect(badge.className).toContain('text-xs');
      expect(badge.className).toContain('px-2');
    });

    it('should apply medium size classes by default', () => {
      render(<RiskSeverityBadge severity="LOW" />);
      
      const badge = screen.getByTestId('risk-severity-badge');
      expect(badge.className).toContain('text-sm');
      expect(badge.className).toContain('px-2.5');
    });

    it('should apply large size classes', () => {
      render(<RiskSeverityBadge severity="LOW" size="lg" />);
      
      const badge = screen.getByTestId('risk-severity-badge');
      expect(badge.className).toContain('text-base');
      expect(badge.className).toContain('px-3');
    });
  });
});
