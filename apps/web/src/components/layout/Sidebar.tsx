import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  PawPrint,
  AlertTriangle,
  ArrowLeftRight,
  Upload,
  Settings,
  LogOut,
  Heart,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import clsx from 'clsx';

const navItems = [
  { to: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard', exact: true },
  { to: '/animals', icon: PawPrint, labelKey: 'nav.animals' },
  { to: '/at-risk', icon: AlertTriangle, labelKey: 'At Risk' },
  { to: '/transfers', icon: ArrowLeftRight, labelKey: 'nav.transfers' },
  { to: '/import', icon: Upload, labelKey: 'nav.import' },
  { to: '/settings', icon: Settings, labelKey: 'nav.settings' },
];

export default function Sidebar() {
  const { t } = useTranslation();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-64 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-primary-900 px-6 pb-4">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center gap-2">
          <Heart className="h-8 w-8 text-primary-400" />
          <span className="text-xl font-bold text-white">Shelter Link</span>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" className="-mx-2 space-y-1">
                {navItems.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.exact}
                      className={({ isActive }) =>
                        clsx(
                          'group flex gap-x-3 rounded-md p-2 text-sm font-medium leading-6 transition-colors',
                          isActive
                            ? 'bg-primary-800 text-white'
                            : 'text-primary-200 hover:bg-primary-800 hover:text-white'
                        )
                      }
                    >
                      <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                      {item.labelKey.startsWith('nav.')
                        ? t(item.labelKey)
                        : item.labelKey}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </li>

            {/* Organization info */}
            {user && (
              <li className="mt-auto">
                <div className="px-2 py-3 border-t border-primary-800">
                  <p className="text-xs text-primary-400 mb-1">Organization</p>
                  <p className="text-sm font-medium text-white truncate">
                    {user.organizationName}
                  </p>
                </div>
                
                <button
                  onClick={logout}
                  className="group flex w-full gap-x-3 rounded-md p-2 text-sm font-medium leading-6 text-primary-200 hover:bg-primary-800 hover:text-white transition-colors"
                >
                  <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
                  {t('nav.logout')}
                </button>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
