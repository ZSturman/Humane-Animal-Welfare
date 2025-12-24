import { useTranslation } from 'react-i18next';
import { Bell, Search, User } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';

export default function Header() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Mobile logo */}
        <div className="flex items-center gap-2 lg:hidden">
          <span className="text-lg font-bold text-primary-900">Shelter Link</span>
        </div>

        {/* Search (desktop) */}
        <div className="hidden lg:flex lg:flex-1 lg:max-w-md">
          <div className="relative w-full">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder={t('actions.search')}
              className="input pl-10 py-1.5 text-sm"
              aria-label={t('actions.search')}
            />
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Search button (mobile) */}
          <button
            type="button"
            className="btn-icon btn-ghost lg:hidden"
            aria-label={t('actions.search')}
          >
            <Search className="h-5 w-5" />
          </button>

          {/* Notifications */}
          <button
            type="button"
            className="btn-icon btn-ghost relative"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
          </button>

          {/* User menu */}
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-100 transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
              <User className="h-4 w-4 text-primary-600" />
            </div>
            <span className="hidden sm:block text-sm font-medium text-slate-700 max-w-[120px] truncate">
              {user?.name}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
