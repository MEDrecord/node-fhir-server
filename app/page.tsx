import Link from 'next/link';

function MedRecordLogo() {
  return (
    <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" className="fill-medrecord-600" />
      <path
        d="M12 14h4v12h-4V14zm6 4h4v8h-4v-8zm6-2h4v10h-4V16z"
        className="fill-white"
      />
      <circle cx="30" cy="12" r="3" className="fill-medrecord-300" />
    </svg>
  );
}

function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'outline' }) {
  const baseClasses = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium';
  const variantClasses = variant === 'outline' 
    ? 'border border-medrecord-200 text-medrecord-700 bg-medrecord-50'
    : 'bg-medrecord-100 text-medrecord-800';
  
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
  return (
    <Card className="p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{name}</h3>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
        <Badge variant="outline">R4</Badge>
      </div>
      <div className="mt-3">
        <p className="text-xs font-medium text-slate-500">Dutch ZIB Profile</p>
        <p className="mt-0.5 font-mono text-xs text-medrecord-700">{profile}</p>
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
    { name: 'practitioner', access: 'Read/write for patients in care relationship', color: 'bg-medrecord-100 text-medrecord-700' },
    { name: 'patient', access: 'Read-only access to own data', color: 'bg-emerald-100 text-emerald-700' },
    { name: 'researcher', access: 'Read-only anonymized data access', color: 'bg-amber-100 text-amber-700' },
    { name: 'dev', access: 'Read-only test tenant access', color: 'bg-slate-100 text-slate-700' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-medrecord-50 to-white">
      {/* Header */}
      <header className="border-b border-medrecord-100 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <MedRecordLogo />
            <div>
              <h1 className="text-xl font-bold text-slate-900">MEDrecord</h1>
              <p className="text-xs text-slate-500">FHIR R4 Server</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge>Dutch ZIB Compliant</Badge>
            <Link
              href="/api/fhir/4_0_1/metadata"
              className="rounded-lg bg-medrecord-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-medrecord-700"
            >
              View Capability Statement
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        {/* Hero */}
        <section className="mb-16 text-center">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900">
            Dutch ZIB-Compliant FHIR R4 API
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            Secure healthcare data exchange with nl-core profiles. Built for the Dutch healthcare ecosystem 
            with full EHDS compliance readiness.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Card className="px-6 py-4">
              <p className="text-sm font-medium text-slate-500">Base URL</p>
              <code className="mt-1 block font-mono text-lg text-medrecord-700">/api/fhir/4_0_1</code>
            </Card>
            <Card className="px-6 py-4">
              <p className="text-sm font-medium text-slate-500">FHIR Version</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">4.0.1 (R4)</p>
            </Card>
            <Card className="px-6 py-4">
              <p className="text-sm font-medium text-slate-500">Profile Set</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">nl-core 2024</p>
            </Card>
          </div>
        </section>

        {/* Resources */}
        <section className="mb-16">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">Supported Resources</h2>
            <span className="text-sm text-slate-500">{resources.length} resources available</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {resources.map((resource) => (
              <ResourceCard key={resource.name} {...resource} />
            ))}
          </div>
        </section>

        {/* Authentication */}
        <section className="mb-16">
          <h2 className="mb-6 text-2xl font-bold text-slate-900">Authentication</h2>
          <Card className="p-6">
            <p className="text-slate-600">
              All requests are authenticated via the MEDrecord Gateway. Include one of the following:
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-medrecord-100">
                    <svg className="h-4 w-4 text-medrecord-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-slate-900">Session Cookie</h3>
                </div>
                <p className="mt-2 text-sm text-slate-600">For web applications with user login</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-medrecord-100">
                    <svg className="h-4 w-4 text-medrecord-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-slate-900">X-Api-Key Header</h3>
                </div>
                <p className="mt-2 text-sm text-slate-600">For server-to-server communication</p>
              </div>
            </div>
            <div className="mt-6 rounded-lg bg-amber-50 border border-amber-200 p-4">
              <p className="text-sm text-amber-800">
                <strong>Required:</strong> All requests must include the{' '}
                <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">X-Tenant-ID</code>{' '}
                header for multi-tenant access control.
              </p>
            </div>
          </Card>
        </section>

        {/* Roles */}
        <section className="mb-16">
          <h2 className="mb-6 text-2xl font-bold text-slate-900">Role-Based Access Control</h2>
          <Card className="overflow-hidden">
            <div className="grid divide-y divide-slate-100">
              {roles.map((role) => (
                <div key={role.name} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <span className={`rounded-md px-3 py-1.5 font-mono text-sm font-medium ${role.color}`}>
                      {role.name}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{role.access}</p>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* Quick Start */}
        <section>
          <h2 className="mb-6 text-2xl font-bold text-slate-900">Quick Start</h2>
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">Get CapabilityStatement</p>
                <div className="rounded-lg bg-slate-900 p-4">
                  <code className="font-mono text-sm text-emerald-400">
                    curl -X GET /api/fhir/4_0_1/metadata
                  </code>
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">Search Patients</p>
                <div className="rounded-lg bg-slate-900 p-4">
                  <code className="font-mono text-sm text-emerald-400">
                    curl -X GET /api/fhir/4_0_1/Patient \<br />
                    {'  '}-H &quot;X-Tenant-ID: your-tenant-id&quot; \<br />
                    {'  '}-H &quot;X-Api-Key: your-api-key&quot;
                  </code>
                </div>
              </div>
            </div>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8">
          <div className="flex items-center gap-3">
            <MedRecordLogo />
            <div>
              <p className="font-semibold text-slate-900">MEDrecord FHIR Server</p>
              <p className="text-sm text-slate-500">Dutch ZIB R4 Compliant</p>
            </div>
          </div>
          <div className="text-right text-sm text-slate-500">
            <p>FHIR Version 4.0.1</p>
            <p>nl-core Profile Set 2024</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
