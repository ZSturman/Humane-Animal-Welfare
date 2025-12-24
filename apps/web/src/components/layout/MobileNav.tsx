import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  PawPrint,
  AlertTriangle,
  ArrowLeftRight,
  Menu,
} from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { to: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard', exact: true },
  { to: '/animals', icon: PawPrint, labelKey: 'nav.animals' },
  { to: '/at-risk', icon: AlertTriangle, labelKey: 'At Risk' },
  { to: '/transfers', icon: ArrowLeftRight, labelKey: 'nav.transfers' },
  { to: '/more', icon: Menu, labelKey: 'More' },
];

export default function MobileNav() {
  const { t } = useTranslation();
  const location = useLocation();

  // Hide on login page
  if (location.pathname === '/login') {
    return null;
  }

  return (
    <nav className="mobile-nav lg:hidden" aria-label="Mobile navigation">
      {navItems.map((item) => {
        const isActive = item.exact
          ? location.pathname === item.to
          : location.pathname.startsWith(item.to);

        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={clsx('mobile-nav-item', isActive && 'active')}
            aria-current={isActive ? 'page' : undefined}
          >
            <item.icon
              className={clsx('h-6 w-6', isActive ? 'text-primary-600' : 'text-slate-400')}
              aria-hidden="true"
            />
            <span className="text-xs font-medium">
              {item.labelKey.startsWith('nav.') ? t(item.labelKey) : item.labelKey}
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
}
