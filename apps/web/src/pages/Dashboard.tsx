import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  PawPrint,
  ArrowLeftRight,
  TrendingUp,
  Clock,
  Heart,
} from 'lucide-react';
import { api } from '@/lib/api';
import RiskSeverityBadge from '@/components/risk/RiskSeverityBadge';
import { Link } from 'react-router-dom';

interface DashboardStats {
  summary: {
    critical: number;
    high: number;
    elevated: number;
    moderate: number;
    low: number;
  };
  topAtRisk: Array<{
    id: string;
    name: string;
    species: string;
    urgencyScore: number;
    riskSeverity: string;
    daysInShelter: number;
    primaryPhotoUrl: string | null;
  }>;
  recentChanges: Array<{
    animalId: string;
    animalName: string;
    eventType: string;
    occurredAt: string;
  }>;
  generatedAt: string;
}

interface OrgStats {
  animals: {
    total: number;
    byStatus: Record<string, number>;
    bySpecies: Record<string, number>;
  };
  adoptions: {
    thisMonth: number;
    lastMonth: number;
  };
  transfers: {
    pending: number;
    completed: number;
  };
  capacity: {
    current: number;
    max: number;
    percentage: number;
  };
}

export default function Dashboard() {
  const { t } = useTranslation(['dashboard', 'risk', 'common']);

  const { data: riskData, isLoading: riskLoading } = useQuery({
    queryKey: ['risk-dashboard'],
    queryFn: async () => {
      const response = await api.get<DashboardStats>('/risk/dashboard');
      return response.data;
    },
  });

  const { data: orgStats, isLoading: statsLoading } = useQuery({
    queryKey: ['org-stats'],
    queryFn: async () => {
      const response = await api.get<OrgStats>('/organizations/current/stats');
      return response.data;
    },
  });

  const totalAtRisk = riskData?.summary
    ? riskData.summary.critical + riskData.summary.high
    : 0;

  return (
    <>
      <Helmet>
        <title>Dashboard | Shelter Link</title>
      </Helmet>

      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">
            Overview of shelter operations and at-risk animals
          </p>
        </div>

        {/* Alert banner for critical animals */}
        {totalAtRisk > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-4">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-red-900">
                {totalAtRisk} animals need urgent attention
              </p>
              <p className="text-sm text-red-700">
                {riskData?.summary?.critical} critical, {riskData?.summary?.high} high risk
              </p>
            </div>
            <Link to="/at-risk" className="btn btn-danger btn-sm">
              View All
            </Link>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={PawPrint}
            label="Animals in Care"
            value={orgStats?.animals?.total ?? 0}
            loading={statsLoading}
            color="blue"
          />
          <StatCard
            icon={Heart}
            label="Adoptions This Month"
            value={orgStats?.adoptions?.thisMonth ?? 0}
            change={orgStats?.adoptions ? orgStats.adoptions.thisMonth - orgStats.adoptions.lastMonth : 0}
            loading={statsLoading}
            color="green"
          />
          <StatCard
            icon={ArrowLeftRight}
            label="Pending Transfers"
            value={orgStats?.transfers?.pending ?? 0}
            loading={statsLoading}
            color="purple"
          />
          <StatCard
            icon={TrendingUp}
            label="Capacity"
            value={`${orgStats?.capacity?.percentage ?? 0}%`}
            loading={statsLoading}
            color={
              (orgStats?.capacity?.percentage ?? 0) > 90
                ? 'red'
                : (orgStats?.capacity?.percentage ?? 0) > 75
                ? 'yellow'
                : 'green'
            }
          />
        </div>

        {/* Risk summary and top at-risk */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Risk severity breakdown */}
          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold text-slate-900">Risk Summary</h2>
            </div>
            <div className="card-body space-y-3">
              <RiskRow
                severity="critical"
                count={riskData?.summary?.critical ?? 0}
                loading={riskLoading}
              />
              <RiskRow
                severity="high"
                count={riskData?.summary?.high ?? 0}
                loading={riskLoading}
              />
              <RiskRow
                severity="elevated"
                count={riskData?.summary?.elevated ?? 0}
                loading={riskLoading}
              />
              <RiskRow
                severity="moderate"
                count={riskData?.summary?.moderate ?? 0}
                loading={riskLoading}
              />
              <RiskRow
                severity="low"
                count={riskData?.summary?.low ?? 0}
                loading={riskLoading}
              />
            </div>
          </div>

          {/* Top at-risk animals */}
          <div className="card lg:col-span-2">
            <div className="card-header flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Top At-Risk Animals</h2>
              <Link to="/at-risk" className="text-sm text-primary-600 hover:text-primary-700">
                View all →
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {riskLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-4 flex items-center gap-4">
                    <div className="skeleton h-12 w-12 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-4 w-32" />
                      <div className="skeleton h-3 w-24" />
                    </div>
                    <div className="skeleton h-6 w-16 rounded-full" />
                  </div>
                ))
              ) : riskData?.topAtRisk.length === 0 ? (
                <div className="p-8 text-center">
                  <Heart className="h-12 w-12 text-green-500 mx-auto mb-2" />
                  <p className="text-slate-600">{t('risk:empty.title')}</p>
                  <p className="text-sm text-slate-500">{t('risk:empty.description')}</p>
                </div>
              ) : (
                riskData?.topAtRisk.slice(0, 5).map((animal) => (
                  <Link
                    key={animal.id}
                    to={`/animals/${animal.id}`}
                    className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="h-12 w-12 rounded-lg bg-slate-200 overflow-hidden flex-shrink-0">
                      {animal.primaryPhotoUrl ? (
                        <img
                          src={animal.primaryPhotoUrl}
                          alt={animal.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <PawPrint className="h-6 w-6 text-slate-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{animal.name}</p>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Clock className="h-3 w-3" />
                        <span>{animal.daysInShelter} days</span>
                        <span>•</span>
                        <span className="capitalize">{animal.species.toLowerCase()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-700">
                        {animal.urgencyScore}
                      </span>
                      <RiskSeverityBadge severity={animal.riskSeverity as any} />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent activity */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-slate-900">Recent Risk Changes</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {riskLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4 flex items-center gap-4">
                  <div className="skeleton h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-48" />
                    <div className="skeleton h-3 w-24" />
                  </div>
                </div>
              ))
            ) : riskData?.recentChanges?.length === 0 ? (
              <div className="p-6 text-center text-slate-500">
                No recent risk changes
              </div>
            ) : (
              riskData?.recentChanges?.slice(0, 10).map((change, i) => (
                <div key={i} className="p-4 flex items-center gap-4">
                  <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4 text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-900">
                      <Link
                        to={`/animals/${change.animalId}`}
                        className="font-medium hover:text-primary-600"
                      >
                        {change.animalName}
                      </Link>
                      {' '}
                      <span className="text-slate-500">
                        {change.eventType === 'RISK_UPDATED'
                          ? 'risk score updated'
                          : 'risk manually overridden'}
                      </span>
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(change.occurredAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// Sub-components

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number | string;
  change?: number;
  loading?: boolean;
  color: 'blue' | 'green' | 'purple' | 'red' | 'yellow';
}

function StatCard({ icon: Icon, label, value, change, loading, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
  };

  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 truncate">{label}</p>
          {loading ? (
            <div className="skeleton h-6 w-12 mt-1" />
          ) : (
            <div className="flex items-baseline gap-2">
              <p className="text-xl font-bold text-slate-900">{value}</p>
              {change !== undefined && change !== 0 && (
                <span
                  className={`text-xs font-medium ${
                    change > 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {change > 0 ? '+' : ''}
                  {change}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface RiskRowProps {
  severity: 'critical' | 'high' | 'elevated' | 'moderate' | 'low';
  count: number;
  loading?: boolean;
}

function RiskRow({ severity, count, loading }: RiskRowProps) {
  const { t } = useTranslation('risk');
  
  const colors = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    elevated: 'bg-yellow-500',
    moderate: 'bg-green-500',
    low: 'bg-sky-500',
  };

  return (
    <div className="flex items-center gap-3">
      <div className={`h-3 w-3 rounded-full ${colors[severity]}`} />
      <span className="flex-1 text-sm text-slate-700 capitalize">
        {t(`severity.${severity}`)}
      </span>
      {loading ? (
        <div className="skeleton h-5 w-8" />
      ) : (
        <span className="text-sm font-semibold text-slate-900">{count}</span>
      )}
    </div>
  );
}
