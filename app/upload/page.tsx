'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';

interface UploadResult {
  resourceType: string;
  id?: string;
  success: boolean;
  error?: string;
}

interface UploadStats {
  total: number;
  processed: number;
  success: number;
  failed: number;
}

export default function UploadPage() {
  const [results, setResults] = useState<UploadResult[]>([]);
  const [stats, setStats] = useState<UploadStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processBundle = async (data: unknown) => {
    const resources: unknown[] = [];
    
    if (Array.isArray(data)) {
      resources.push(...data);
    } else if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      if (obj.resourceType === 'Bundle' && Array.isArray(obj.entry)) {
        for (const entry of obj.entry) {
          if (typeof entry === 'object' && entry !== null && 'resource' in entry) {
            resources.push((entry as { resource: unknown }).resource);
          }
        }
      } else if (obj.resourceType) {
        resources.push(obj);
      }
    }

    if (resources.length === 0) {
      setResults([{ resourceType: 'Unknown', success: false, error: 'No valid FHIR resources found' }]);
      return;
    }

    const initialStats: UploadStats = { total: resources.length, processed: 0, success: 0, failed: 0 };
    setStats(initialStats);
    setResults([]);

    const uploadResults: UploadResult[] = [];
    const BATCH_SIZE = 10;

    for (let i = 0; i < resources.length; i += BATCH_SIZE) {
      const batch = resources.slice(i, i + BATCH_SIZE);
      
      const batchPromises = batch.map(async (resource) => {
        if (!resource || typeof resource !== 'object') {
          return { resourceType: 'Unknown', success: false, error: 'Invalid resource' };
        }
        
        const res = resource as Record<string, unknown>;
        const resourceType = res.resourceType as string;
        
        if (!resourceType) {
          return { resourceType: 'Unknown', success: false, error: 'Missing resourceType' };
        }

        try {
          const response = await fetch(`/api/fhir/4_0_1/${resourceType}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/fhir+json' },
            body: JSON.stringify(resource),
          });

          if (response.ok) {
            const responseData = await response.json();
            return { resourceType, id: responseData.id, success: true };
          } else {
            let errorMsg = `HTTP ${response.status}`;
            try {
              const errorData = await response.json();
              errorMsg = errorData.issue?.[0]?.diagnostics || errorData.message || errorMsg;
            } catch {
              // ignore parse error
            }
            return { resourceType, success: false, error: errorMsg };
          }
        } catch (err) {
          return { 
            resourceType, 
            success: false, 
            error: err instanceof Error ? err.message : 'Network error' 
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      uploadResults.push(...batchResults);
      
      const newStats = {
        total: resources.length,
        processed: uploadResults.length,
        success: uploadResults.filter(r => r.success).length,
        failed: uploadResults.filter(r => !r.success).length,
      };
      setStats(newStats);
      setResults([...uploadResults]);
    }
  };

  const handleFile = useCallback(async (file: File) => {
    setLoading(true);
    setFileName(file.name);
    setResults([]);
    setStats(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await processBundle(data);
    } catch {
      setResults([{ resourceType: 'Unknown', success: false, error: 'Invalid JSON file' }]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  }, [handleFile]);

  const successResults = results.filter(r => r.success);
  const failedResults = results.filter(r => !r.success);

  const resourceTypeCounts = successResults.reduce((acc, r) => {
    acc[r.resourceType] = (acc[r.resourceType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-600 text-white font-bold">
              M
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">MEDrecord FHIR Upload</h1>
              <p className="text-sm text-slate-500">Import FHIR R4 resources</p>
            </div>
          </div>
          <Link 
            href="/" 
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to API Docs
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            mb-8 cursor-pointer rounded-xl border-2 border-dashed p-12 text-center transition-all
            ${dragActive 
              ? 'border-teal-500 bg-teal-50' 
              : 'border-slate-300 bg-white hover:border-teal-400 hover:bg-slate-50'
            }
            ${loading ? 'pointer-events-none opacity-50' : ''}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileInput}
            className="hidden"
          />
          
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal-100">
            <svg className="h-8 w-8 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          
          <p className="mb-2 text-lg font-medium text-slate-900">
            {loading ? 'Processing...' : 'Drop your FHIR JSON file here'}
          </p>
          <p className="text-sm text-slate-500">
            or click to browse. Supports single resources, arrays, and FHIR Bundles.
          </p>
          
          {fileName && !loading && (
            <p className="mt-4 text-sm font-medium text-teal-600">
              Last file: {fileName}
            </p>
          )}
        </div>

        {/* Progress */}
        {stats && (
          <div className="mb-8 rounded-xl border bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Upload Progress</h2>
              <span className="text-sm text-slate-500">
                {stats.processed} / {stats.total} resources
              </span>
            </div>
            
            {/* Progress bar */}
            <div className="mb-4 h-3 overflow-hidden rounded-full bg-slate-100">
              <div 
                className="h-full rounded-full bg-teal-600 transition-all duration-300"
                style={{ width: `${(stats.processed / stats.total) * 100}%` }}
              />
            </div>
            
            {/* Stats cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-slate-50 p-4 text-center">
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-sm text-slate-500">Total</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{stats.success}</p>
                <p className="text-sm text-emerald-600">Success</p>
              </div>
              <div className="rounded-lg bg-red-50 p-4 text-center">
                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                <p className="text-sm text-red-600">Failed</p>
              </div>
            </div>
          </div>
        )}

        {/* Results Summary */}
        {successResults.length > 0 && (
          <div className="mb-8 rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Successfully Imported Resources
            </h2>
            <div className="flex flex-wrap gap-3">
              {Object.entries(resourceTypeCounts).map(([type, count]) => (
                <Link
                  key={type}
                  href={`/api/fhir/4_0_1/${type}`}
                  className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-emerald-700 hover:bg-emerald-100"
                >
                  <span className="font-medium">{type}</span>
                  <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-xs font-bold">
                    {count}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Failed Resources */}
        {failedResults.length > 0 && (
          <div className="mb-8 rounded-xl border border-red-200 bg-red-50 p-6">
            <h2 className="mb-4 text-lg font-semibold text-red-900">
              Failed Imports ({failedResults.length})
            </h2>
            <div className="max-h-64 space-y-2 overflow-auto">
              {failedResults.slice(0, 50).map((r, i) => (
                <div key={i} className="rounded-lg bg-white p-3 text-sm">
                  <span className="font-medium text-red-800">{r.resourceType}</span>
                  <span className="ml-2 text-red-600">{r.error}</span>
                </div>
              ))}
              {failedResults.length > 50 && (
                <p className="text-sm text-red-600">
                  ... and {failedResults.length - 50} more errors
                </p>
              )}
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Quick API Links</h2>
          <div className="flex flex-wrap gap-3">
            {['Patient', 'Practitioner', 'Organization', 'Observation', 'Condition', 'Encounter'].map((type) => (
              <Link
                key={type}
                href={`/api/fhir/4_0_1/${type}`}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
              >
                GET /{type}
              </Link>
            ))}
            <Link
              href="/api/fhir/4_0_1/metadata"
              className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-100"
            >
              Capability Statement
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
