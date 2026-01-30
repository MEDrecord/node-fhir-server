import Link from 'next/link';
import Image from 'next/image';

function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'outline' }) {
  const baseClasses = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium';
  const variantClasses = variant === 'outline' 
    ? 'border border-teal-200 text-teal-700 bg-teal-50'
    : 'bg-teal-100 text-teal-800';
  
  return <span className={`${baseClasses} ${variantClasses}`}>{children}</span>;
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function ResourceCard({ 
  name, 
  profile, 
  description, 
  endpoints 
}: { 
  name: string; 
  profile: string; 
  description: string;
  endpoints: string[];
}) {
  const apiUrl = `/api/fhir/4_0_1/${name}`;
  
  return (
    <Card className="p-5 transition-all hover:shadow-md hover:border-teal-200">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{name}</h3>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
        <Badge variant="outline">R4</Badge>
      </div>
      <div className="mt-3">
        <p className="text-xs font-medium text-slate-500">Dutch ZIB Profile</p>
        <p className="mt-0.5 font-mono text-xs text-teal-700">{profile}</p>
      </div>
      <div className="mt-3">
        <p className="text-xs font-medium text-slate-500">Endpoint</p>
        <Link 
          href={apiUrl}
          className="mt-0.5 font-mono text-xs text-blue-600 hover:text-blue-800 hover:underline block"
        >
          {apiUrl}
        </Link>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {endpoints.map((method) => (
          <span 
            key={method} 
            className={`rounded px-2 py-1 text-xs font-medium ${
              method === 'GET' ? 'bg-emerald-100 text-emerald-700' :
              method === 'POST' ? 'bg-blue-100 text-blue-700' :
              method === 'PUT' ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700'
            }`}
          >
            {method}
          </span>
        ))}
      </div>
    </Card>
  );
}

export default function Home() {
  const resources = [
    { 
      name: 'Patient', 
      profile: 'nl-core-Patient', 
      description: 'Patient demographics and identifiers',
      endpoints: ['GET', 'POST', 'PUT']
    },
    { 
      name: 'Practitioner', 
      profile: 'nl-core-HealthProfessional', 
      description: 'Healthcare professionals (AGB/BIG)',
      endpoints: ['GET', 'POST', 'PUT']
    },
    { 
      name: 'Observation', 
      profile: 'nl-core-LaboratoryTestResult', 
      description: 'Vitals, lab results, measurements',
      endpoints: ['GET', 'POST', 'PUT']
    },
    { 
      name: 'Condition', 
      profile: 'nl-core-Problem', 
      description: 'Problems, diagnoses, complaints',
      endpoints: ['GET', 'POST', 'PUT']
    },
    { 
      name: 'AllergyIntolerance', 
      profile: 'nl-core-AllergyIntolerance', 
      description: 'Allergies and intolerances',
      endpoints: ['GET', 'POST', 'PUT']
    },
    { 
      name: 'MedicationRequest', 
      profile: 'nl-core-MedicationAgreement', 
      description: 'Medication prescriptions',
      endpoints: ['GET', 'POST', 'PUT']
    },
  ];

  const roles = [
    { name: 'super_admin', access: 'Full system access across all tenants', color: 'bg-purple-100 text-purple-700' },
    { name: 'tenant_admin', access: 'Full access within own tenant', color: 'bg-indigo-100 text-indigo-700' },
    { name: 'practitioner', access: 'Read/write for patients in care relationship', color: 'bg-teal-100 text-teal-700' },
    { name: 'patient', access: 'Read-only access to own data', color: 'bg-emerald-100 text-emerald-700' },
    { name: 'researcher', access: 'Read-only anonymized data access', color: 'bg-amber-100 text-amber-700' },
    { name: 'dev', access: 'Read-only test tenant access', color: 'bg-slate-100 text-slate-700' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Image 
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo-1024-transparent-HPgEtblYgTG4Z7nO9fz6qrrXwkTgPr.png"
              alt="MEDrecord Logo"
              width={48}
              height={48}
              className="h-12 w-12"
            />
            <div>
              <h1 className="text-xl font-bold text-slate-900">MEDrecord</h1>
              <p className="text-xs text-slate-500">FHIR R4 Server</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-medium text-teal-700">Dutch ZIB Compliant</span>
            <Link
              href="/api/fhir/4_0_1/metadata"
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
            >
              View Capability Statement
            </Link>
            <Link
              href="/upload"
              className="rounded-lg border border-teal-600 px-4 py-2 text-sm font-medium text-teal-600 transition-colors hover:bg-teal-50"
            >
              Upload Test Data
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        {/* Hero */}
        <section className="mb-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-4 py-1.5 text-sm font-medium text-teal-700 mb-6">
            <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse"></span>
            eHealth Platform as a Service
          </div>
          <h2 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Dutch ZIB-Compliant<br />FHIR R4 API
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            Secure healthcare data exchange with nl-core profiles. Built for the Dutch healthcare ecosystem 
            with full EHDS compliance readiness.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3 max-w-3xl mx-auto">
            <Card className="px-6 py-5">
              <p className="text-sm font-medium text-slate-500">Base URL</p>
              <code className="mt-2 block font-mono text-base text-teal-700 font-semibold">/api/fhir/4_0_1</code>
            </Card>
            <Card className="px-6 py-5">
              <p className="text-sm font-medium text-slate-500">FHIR Version</p>
              <p className="mt-2 text-base font-semibold text-slate-900">4.0.1 (R4)</p>
            </Card>
            <Card className="px-6 py-5">
              <p className="text-sm font-medium text-slate-500">Profile Set</p>
              <p className="mt-2 text-base font-semibold text-slate-900">nl-core 2024</p>
            </Card>
          </div>
        </section>

        {/* Resources */}
        <section className="mb-16">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Supported Resources</h2>
              <p className="mt-1 text-slate-600">FHIR R4 resources with Dutch ZIB profiles</p>
            </div>
            <span className="text-sm font-medium text-teal-600 bg-teal-50 px-3 py-1 rounded-full">{resources.length} resources</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {resources.map((resource) => (
              <ResourceCard key={resource.name} {...resource} />
            ))}
          </div>
        </section>

        {/* Authentication */}
        <section className="mb-16">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Authentication</h2>
            <p className="mt-1 text-slate-600">Secure access via MEDrecord Gateway</p>
          </div>
          <Card className="p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100">
                    <svg className="h-5 w-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Session Cookie</h3>
                    <p className="text-sm text-slate-600">For web applications</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                    <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">X-Api-Key Header</h3>
                    <p className="text-sm text-slate-600">For server-to-server</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
              <svg className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm text-amber-800">
                <strong>Required:</strong> All requests must include{' '}
                <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">X-Tenant-ID</code>{' '}
                header for multi-tenant access control.
              </p>
            </div>
          </Card>
        </section>

        {/* Roles */}
        <section className="mb-16">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Role-Based Access Control</h2>
            <p className="mt-1 text-slate-600">Fine-grained permissions per user role</p>
          </div>
          <Card className="overflow-hidden divide-y divide-slate-100">
            {roles.map((role) => (
              <div key={role.name} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                <span className={`rounded-lg px-3 py-1.5 font-mono text-sm font-medium ${role.color}`}>
                  {role.name}
                </span>
                <p className="text-sm text-slate-600">{role.access}</p>
              </div>
            ))}
          </Card>
        </section>

        {/* Quick Start */}
        <section>
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Quick Start</h2>
            <p className="mt-1 text-slate-600">Try these example requests</p>
          </div>
          <Card className="p-6 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-emerald-100 text-emerald-700 rounded px-2 py-0.5 text-xs font-medium">GET</span>
                <span className="text-sm font-medium text-slate-700">Get CapabilityStatement</span>
              </div>
              <div className="rounded-xl bg-slate-900 p-4 overflow-x-auto">
                <code className="font-mono text-sm text-emerald-400">
                  curl -X GET /api/fhir/4_0_1/metadata
                </code>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-emerald-100 text-emerald-700 rounded px-2 py-0.5 text-xs font-medium">GET</span>
                <span className="text-sm font-medium text-slate-700">Search Patients</span>
              </div>
              <div className="rounded-xl bg-slate-900 p-4 overflow-x-auto">
                <pre className="font-mono text-sm text-emerald-400">
{`curl -X GET /api/fhir/4_0_1/Patient \\
  -H "X-Tenant-ID: your-tenant-id" \\
  -H "X-Api-Key: your-api-key"`}
                </pre>
              </div>
            </div>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-16">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Image 
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Made%20with%20love%20by%20medrecord-LvlIAdbWKzYd3vigrDO4juFuCZ5qhX.png"
              alt="Made with love by MEDrecord"
              width={300}
              height={50}
              className="h-10 w-auto"
            />
            <div className="text-right text-sm text-slate-500">
              <p>FHIR Version 4.0.1 | nl-core 2024</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
