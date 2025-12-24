import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Clock,
  X,
  ArrowLeftRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import clsx from 'clsx';

interface Transfer {
  id: string;
  status: string;
  animalName: string;
  animalSpecies: string;
  fromOrganization: string;
  toOrganization: string;
  direction: 'incoming' | 'outgoing';
  createdAt: string;
  urgencyScore: number;
}

export default function Transfers() {
  const { t } = useTranslation(['common']);

  const { data, isLoading } = useQuery({
    queryKey: ['transfers'],
    queryFn: async () => {
      const response = await api.get<Transfer[]>('/transfers');
      return response.data ?? [];
    },
  });

  const pending = data?.filter((t) => t.status === 'PENDING') ?? [];
  const completed = data?.filter((t) => t.status === 'COMPLETED') ?? [];

  return (
    <>
      <Helmet>
        <title>Transfers | Shelter Link</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Transfers</h1>
            <p className="text-slate-500 mt-1">
              Manage animal transfers between organizations
            </p>
          </div>
        </div>

        {/* Pending transfers */}
        <div className="card">
          <div className="card-header flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-500" />
            <h2 className="font-semibold text-slate-900">
              Pending Requests ({pending.length})
            </h2>
          </div>

          {isLoading ? (
            <div className="p-4 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton h-16 rounded-lg" />
              ))}
            </div>
          ) : pending.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No pending transfer requests
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pending.map((transfer) => (
                <TransferRow key={transfer.id} transfer={transfer} />
              ))}
            </div>
          )}
        </div>

        {/* Completed transfers */}
        <div className="card">
          <div className="card-header flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            <h2 className="font-semibold text-slate-900">
              Recent Completed ({completed.length})
            </h2>
          </div>

          {isLoading ? (
            <div className="p-4 space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="skeleton h-16 rounded-lg" />
              ))}
            </div>
          ) : completed.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No completed transfers yet
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {completed.slice(0, 10).map((transfer) => (
                <TransferRow key={transfer.id} transfer={transfer} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function TransferRow({ transfer }: { transfer: Transfer }) {
  const isIncoming = transfer.direction === 'incoming';

  return (
    <Link
      to={`/transfers/${transfer.id}`}
      className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
    >
      <div
        className={clsx(
          'p-2 rounded-lg',
          isIncoming ? 'bg-green-100' : 'bg-blue-100'
        )}
      >
        {isIncoming ? (
          <ArrowLeft className="h-5 w-5 text-green-600" />
        ) : (
          <ArrowRight className="h-5 w-5 text-blue-600" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-900">{transfer.animalName}</p>
        <p className="text-sm text-slate-500 truncate">
          {isIncoming ? `From ${transfer.fromOrganization}` : `To ${transfer.toOrganization}`}
        </p>
      </div>

      <div className="text-right">
        <span
          className={clsx(
            'px-2 py-1 rounded-full text-xs font-medium',
            transfer.status === 'PENDING' && 'bg-yellow-100 text-yellow-800',
            transfer.status === 'APPROVED' && 'bg-blue-100 text-blue-800',
            transfer.status === 'COMPLETED' && 'bg-green-100 text-green-800',
            transfer.status === 'DECLINED' && 'bg-red-100 text-red-800'
          )}
        >
          {transfer.status}
        </span>
        <p className="text-xs text-slate-400 mt-1">
          {new Date(transfer.createdAt).toLocaleDateString()}
        </p>
      </div>
    </Link>
  );
}
