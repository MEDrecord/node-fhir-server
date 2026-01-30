'use client';

import { useState } from 'react';
import Link from 'next/link';

interface UploadResult {
  resourceType?: string;
  id?: string;
  success: boolean;
  error?: string;
}

export default function UploadPage() {
  const [jsonInput, setJsonInput] = useState('');
  const [results, setResults] = useState<UploadResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!jsonInput.trim()) return;
    
    setLoading(true);
    setResults([]);
    
    try {
      const parsed = JSON.parse(jsonInput);
      const resources = Array.isArray(parsed) 
        ? parsed 
        : parsed.resourceType === 'Bundle' && parsed.entry
          ? parsed.entry.map((e: { resource: unknown }) => e.resource)
          : [parsed];

      const uploadResults: UploadResult[] = [];
      
      for (const resource of resources) {
        if (!resource?.resourceType) {
          uploadResults.push({ success: false, error: 'Missing resourceType' });
          continue;
        }
        
        try {
          const res = await fetch(`/api/fhir/4_0_1/${resource.resourceType}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/fhir+json' },
            body: JSON.stringify(resource),
          });
          
          if (res.ok) {
            const data = await res.json();
            uploadResults.push({
              resourceType: resource.resourceType,
              id: data.id,
              success: true,
            });
          } else {
            const error = await res.json();
            uploadResults.push({
              resourceType: resource.resourceType,
              success: false,
              error: error.issue?.[0]?.diagnostics || 'Upload failed',
            });
          }
        } catch (err) {
          uploadResults.push({
            resourceType: resource.resourceType,
            success: false,
            error: err instanceof Error ? err.message : 'Network error',
          });
        }
      }
      
      setResults(uploadResults);
    } catch {
      setResults([{ success: false, error: 'Invalid JSON' }]);
    } finally {
      setLoading(false);
    }
  };

  const loadSample = () => {
    setJsonInput(JSON.stringify({
      resourceType: 'Patient',
      name: [{ family: 'Test', given: ['Jan'] }],
      birthDate: '1990-01-15',
      gender: 'male',
    }, null, 2));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Upload FHIR Resources</h1>
          <Link href="/" className="text-teal-600 hover:underline">
            Back to API Docs
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">JSON Input</h2>
              <button
                onClick={loadSample}
                className="text-sm text-teal-600 hover:underline"
              >
                Load Sample
              </button>
            </div>
            <textarea
              className="h-80 w-full rounded border p-3 font-mono text-sm"
              placeholder='Paste FHIR JSON here...'
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
            />
            <button
              onClick={handleUpload}
              disabled={loading || !jsonInput.trim()}
              className="mt-4 w-full rounded bg-teal-600 py-2 text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {loading ? 'Uploading...' : 'Upload'}
            </button>
          </div>

          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-semibold">Results</h2>
            {results.length === 0 ? (
              <p className="text-gray-400">Results will appear here</p>
            ) : (
              <div className="space-y-3">
                {results.map((r, i) => (
                  <div
                    key={i}
                    className={`rounded p-3 ${
                      r.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                    }`}
                  >
                    <div className="font-medium">
                      {r.success ? 'Created' : 'Failed'} {r.resourceType || ''}
                    </div>
                    {r.id && <div className="text-sm">ID: {r.id}</div>}
                    {r.error && <div className="text-sm">{r.error}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-3 font-semibold">Quick Test Links</h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/api/fhir/4_0_1/metadata" className="text-teal-600 hover:underline">
              Capability Statement
            </Link>
            <Link href="/api/fhir/4_0_1/Patient" className="text-teal-600 hover:underline">
              GET /Patient
            </Link>
            <Link href="/api/fhir/4_0_1/Observation" className="text-teal-600 hover:underline">
              GET /Observation
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
