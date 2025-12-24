import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth';
import {
  User,
  Building2,
  Bell,
  Globe,
  Shield,
  Key,
  ChevronRight,
} from 'lucide-react';

export default function Settings() {
  const { t, i18n } = useTranslation(['common']);
  const user = useAuthStore((state) => state.user);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'pt', name: 'Português' },
    { code: 'zh', name: '中文' },
    { code: 'vi', name: 'Tiếng Việt' },
    { code: 'ko', name: '한국어' },
    { code: 'ja', name: '日本語' },
  ];

  return (
    <>
      <Helmet>
        <title>Settings | Shelter Link</title>
      </Helmet>

      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500 mt-1">
            Manage your account and preferences
          </p>
        </div>

        {/* Profile section */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <User className="h-5 w-5 text-slate-400" />
              Profile
            </h2>
          </div>
          <div className="card-body space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center">
                <User className="h-8 w-8 text-primary-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">{user?.name}</p>
                <p className="text-sm text-slate-500">{user?.email}</p>
              </div>
            </div>
            <button className="btn btn-secondary btn-sm">Edit Profile</button>
          </div>
        </div>

        {/* Organization section */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-slate-400" />
              Organization
            </h2>
          </div>
          <div className="card-body">
            <p className="font-medium text-slate-900">{user?.organizationName}</p>
            <p className="text-sm text-slate-500 mt-1">
              Role: {user?.role}
            </p>
          </div>
        </div>

        {/* Language section */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Globe className="h-5 w-5 text-slate-400" />
              Language
            </h2>
          </div>
          <div className="card-body">
            <select
              value={i18n.language}
              onChange={(e) => changeLanguage(e.target.value)}
              className="input max-w-xs"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Notifications section */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Bell className="h-5 w-5 text-slate-400" />
              Notifications
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            <SettingsRow
              label="Email notifications"
              description="Receive updates via email"
            />
            <SettingsRow
              label="Risk alerts"
              description="Get notified when animals reach critical risk"
            />
            <SettingsRow
              label="Transfer requests"
              description="Notifications for incoming transfer requests"
            />
          </div>
        </div>

        {/* Security section */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Shield className="h-5 w-5 text-slate-400" />
              Security
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            <button className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <Key className="h-5 w-5 text-slate-400" />
                <span className="text-slate-900">Change password</span>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function SettingsRow({
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  return (
    <div className="p-4 flex items-center justify-between">
      <div>
        <p className="font-medium text-slate-900">{label}</p>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" defaultChecked className="sr-only peer" />
        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
      </label>
    </div>
  );
}
