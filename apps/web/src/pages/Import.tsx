import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Upload, FileSpreadsheet, Database, Check, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface ImportJob {
  id: string;
  sourceType: string;
  sourceName: string;
  status: string;
  recordsProcessed: number;
  recordsImported: number;
  recordsFailed: number;
  createdAt: string;
}

export default function Import() {
  const { t } = useTranslation(['common']);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: jobs, refetch } = useQuery({
    queryKey: ['import-jobs'],
    queryFn: async () => {
      const response = await api.get<ImportJob[]>('/import/jobs');
      return response.data ?? [];
    },
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      await uploadFile(file);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
    }
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const response = await api.upload('/import/upload', file);
      toast.success('File uploaded! Configure field mapping to start import.');
      refetch();
    } catch (error) {
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Import Data | Shelter Link</title>
      </Helmet>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Import Data</h1>
          <p className="text-slate-500 mt-1">
            Import animals from CSV, Excel, or connect to external systems
          </p>
        </div>

        {/* Upload area */}
        <div
          className={clsx(
            'card border-2 border-dashed p-8 text-center transition-colors',
            dragActive ? 'border-primary-500 bg-primary-50' : 'border-slate-300',
            uploading && 'opacity-50 pointer-events-none'
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            {uploading ? 'Uploading...' : 'Upload a file'}
          </h3>
          <p className="text-slate-500 mb-4">
            Drag and drop a CSV or Excel file, or click to browse
          </p>
          <label className="btn btn-primary cursor-pointer">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            Choose File
          </label>
          <p className="text-xs text-slate-400 mt-4">
            Supported formats: CSV, XLSX, XLS
          </p>
        </div>

        {/* External connections */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-slate-900">External Connections</h2>
          </div>
          <div className="card-body">
            <div className="grid sm:grid-cols-3 gap-4">
              <button className="p-4 border border-slate-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left">
                <Database className="h-8 w-8 text-primary-600 mb-2" />
                <h3 className="font-medium text-slate-900">ASM3</h3>
                <p className="text-sm text-slate-500">Animal Shelter Manager</p>
              </button>

              <button className="p-4 border border-slate-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left">
                <Database className="h-8 w-8 text-green-600 mb-2" />
                <h3 className="font-medium text-slate-900">Shelterluv</h3>
                <p className="text-sm text-slate-500">Sync via API</p>
              </button>

              <button className="p-4 border border-slate-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left">
                <Database className="h-8 w-8 text-purple-600 mb-2" />
                <h3 className="font-medium text-slate-900">PetPoint</h3>
                <p className="text-sm text-slate-500">Pethealth Software</p>
              </button>
            </div>
          </div>
        </div>

        {/* Recent imports */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-slate-900">Recent Imports</h2>
          </div>

          {!jobs || jobs.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No import jobs yet
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {jobs.map((job) => (
                <div key={job.id} className="p-4 flex items-center gap-4">
                  <div
                    className={clsx(
                      'p-2 rounded-lg',
                      job.status === 'COMPLETED' && 'bg-green-100',
                      job.status === 'PROCESSING' && 'bg-blue-100',
                      job.status === 'FAILED' && 'bg-red-100',
                      job.status === 'PENDING' && 'bg-yellow-100'
                    )}
                  >
                    {job.status === 'COMPLETED' ? (
                      <Check className="h-5 w-5 text-green-600" />
                    ) : job.status === 'FAILED' ? (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    ) : (
                      <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">
                      {job.sourceName || job.sourceType}
                    </p>
                    <p className="text-sm text-slate-500">
                      {job.recordsImported} imported, {job.recordsFailed} failed
                    </p>
                  </div>

                  <div className="text-right">
                    <span
                      className={clsx(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        job.status === 'COMPLETED' && 'bg-green-100 text-green-800',
                        job.status === 'PROCESSING' && 'bg-blue-100 text-blue-800',
                        job.status === 'FAILED' && 'bg-red-100 text-red-800',
                        job.status === 'PENDING' && 'bg-yellow-100 text-yellow-800'
                      )}
                    >
                      {job.status}
                    </span>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
