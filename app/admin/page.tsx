'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

type UploadResult = {
  success: boolean;
  resourceType?: string;
  id?: string;
  error?: string;
};

export default function AdminPage() {
  const [jsonInput, setJsonInput] = useState('');
  const [results, setResults] = useState<UploadResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!jsonInput.trim()) return;
    
    setLoading(true);
    setResults([]);
    
    try {
      // Parse the input - could be single resource or Bundle
      const parsed = JSON.parse(jsonInput);
      
      let resources: any[] = [];
      
      if (parsed.resourceType === 'Bundle' && parsed.entry) {
        // It's a FHIR Bundle
        resources = parsed.entry.map((e: any) => e.resource).filter(Boolean);
      } else if (parsed.resourceType) {
        // Single resource
        resources = [parsed];
      } else if (Array.isArray(parsed)) {
        // Array of resources
        resources = parsed;
      }
      
      const uploadResults: UploadResult[] = [];
      
      for (const resource of resources) {
        try {
          const response = await fetch(`/api/fhir/4_0_1/${resource.resourceType}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/fhir+json',
            },
            body: JSON.stringify(resource),
          });
          
          if (response.ok) {
            const created = await response.json();
            uploadResults.push({
              success: true,
              resourceType: created.resourceType,
              id: created.id,
            });
          } else {
            const error = await response.json();
            uploadResults.push({
              success: false,
              resourceType: resource.resourceType,
              error: error.issue?.[0]?.diagnostics || 'Upload failed',
            });
          }
        } catch (err) {
          uploadResults.push({
            success: false,
            resourceType: resource.resourceType,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }
      
      setResults(uploadResults);
    } catch (err) {
      setResults([{
        success: false,
        error: 'Invalid JSON: ' + (err instanceof Error ? err.message : 'Parse error'),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const loadSampleData = () => {
    const sampleBundle = {
      resourceType: 'Bundle',
      type: 'transaction',
      entry: [
        {
          resource: {
            resourceType: 'Patient',
            identifier: [
              {
                system: 'http://fhir.nl/fhir/NamingSystem/bsn',
                value: '123456789',
              },
            ],
            name: [
              {
                use: 'official',
                family: 'de Vries',
                given: ['Jan', 'Pieter'],
              },
            ],
            gender: 'male',
            birthDate: '1980-05-15',
            address: [
              {
                use: 'home',
                line: ['Hoofdstraat 123'],
                city: 'Amsterdam',
                postalCode: '1012 AB',
                country: 'NL',
              },
            ],
          },
        },
        {
          resource: {
            resourceType: 'Observation',
            status: 'final',
            category: [
              {
                coding: [
                  {
                    system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                    code: 'vital-signs',
                    display: 'Vital Signs',
                  },
                ],
              },
            ],
            code: {
              coding: [
                {
                  system: 'http://loinc.org',
                  code: '85354-9',
                  display: 'Blood pressure panel',
                },
              ],
            },
            effectiveDateTime: '2024-01-15T10:30:00Z',
            component: [
              {
                code: {
                  coding: [
                    {
                      system: 'http://loinc.org',
                      code: '8480-6',
                      display: 'Systolic blood pressure',
                    },
                  ],
                },
                valueQuantity: {
                  value: 120,
                  unit: 'mmHg',
                  system: 'http://unitsofmeasure.org',
                  code: 'mm[Hg]',
                },
              },
              {
                code: {
                  coding: [
                    {
                      system: 'http://loinc.org',
                      code: '8462-4',
                      display: 'Diastolic blood pressure',
                    },
                  ],
                },
                valueQuantity: {
                  value: 80,
                  unit: 'mmHg',
                  system: 'http://unitsofmeasure.org',
                  code: 'mm[Hg]',
                },
              },
            ],
          },
        },
      ],
    };
    
    setJsonInput(JSON.stringify(sampleBundle, null, 2));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo-1024-transparent-HPgEtblYgTG4Z7nO9fz6qrrXwkTgPr.png"
              alt="MEDrecord"
              width={40}
              height={40}
              className="h-10 w-10"
            />
            <div>
              <h1 className="text-xl font-bold text-slate-900">MEDrecord</h1>
              <p className="text-xs text-slate-500">FHIR Admin</p>
            </div>
          </Link>
          <Link href="/" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Back to API Docs
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Upload FHIR Resources</h2>
          <p className="mt-2 text-slate-600">
            Paste FHIR JSON below. Supports single resources, arrays, or FHIR Bundles.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Input */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">FHIR JSON Input</h3>
              <button 
                onClick={loadSampleData}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Load Sample Data
              </button>
            </div>
            <textarea
              className="h-96 w-full rounded-lg border border-slate-300 p-4 font-mono text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              placeholder='{"resourceType": "Patient", ...}'
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
            />
            <button 
              className="mt-4 w-full rounded-lg bg-teal-600 px-4 py-3 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50" 
              onClick={handleUpload}
              disabled={loading || !jsonInput.trim()}
            >
              {loading ? 'Uploading...' : 'Upload Resources'}
            </button>
          </div>

          {/* Results */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 font-semibold text-slate-900">Upload Results</h3>
            {results.length === 0 ? (
              <div className="flex h-96 items-center justify-center text-slate-400">
                Results will appear here
              </div>
            ) : (
              <div className="h-96 space-y-3 overflow-auto">
                {results.map((result, i) => (
                  <div
                    key={i}
                    className={`rounded-lg border p-4 ${
                      result.success
                        ? 'border-emerald-200 bg-emerald-50'
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        result.success 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {result.success ? 'Created' : 'Failed'}
                      </span>
                      {result.resourceType && (
                        <span className="font-medium text-slate-700">
                          {result.resourceType}
                        </span>
                      )}
                    </div>
                    {result.success ? (
                      <p className="mt-2 font-mono text-sm text-emerald-700">
                        ID: {result.id}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-red-700">{result.error}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8">
          <h3 className="mb-4 font-semibold text-slate-900">Test API Endpoints</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {['Patient', 'Observation', 'Condition', 'Practitioner'].map((resource) => (
              <Link
                key={resource}
                href={`/api/fhir/4_0_1/${resource}`}
                className="rounded-lg border border-slate-200 bg-white p-4 text-center transition-all hover:border-teal-300 hover:shadow-md"
              >
                <p className="font-medium text-slate-900">{resource}</p>
                <p className="mt-1 font-mono text-xs text-teal-600">GET /api/fhir/4_0_1/{resource}</p>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
