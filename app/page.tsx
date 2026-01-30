import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-16">
        <header className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            MEDrecord FHIR R4 Server
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Dutch ZIB (nl-core) compliant FHIR R4 API for healthcare data exchange
          </p>
        </header>

        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold text-foreground">API Endpoints</h2>
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-foreground">Base URL</h3>
                <code className="mt-1 block rounded bg-muted px-3 py-2 font-mono text-sm">
                  /api/fhir/4_0_1
                </code>
              </div>

              <div>
                <h3 className="font-medium text-foreground">Capability Statement</h3>
                <Link
                  href="/api/fhir/4_0_1/metadata"
                  className="mt-1 block rounded bg-muted px-3 py-2 font-mono text-sm text-primary hover:underline"
                >
                  GET /api/fhir/4_0_1/metadata
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold text-foreground">Supported Resources</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { name: 'Patient', profile: 'nl-core-Patient', description: 'Patient demographics' },
              { name: 'Practitioner', profile: 'nl-core-HealthProfessional', description: 'Healthcare professionals' },
              { name: 'Observation', profile: 'nl-core-LaboratoryTestResult', description: 'Vitals, lab results' },
              { name: 'Condition', profile: 'nl-core-Problem', description: 'Problems and diagnoses' },
              { name: 'AllergyIntolerance', profile: 'nl-core-AllergyIntolerance', description: 'Allergies and intolerances' },
              { name: 'MedicationRequest', profile: 'nl-core-MedicationAgreement', description: 'Medication prescriptions' },
            ].map((resource) => (
              <div
                key={resource.name}
                className="rounded-lg border border-border bg-card p-4"
              >
                <h3 className="font-semibold text-foreground">{resource.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{resource.description}</p>
                <p className="mt-2 font-mono text-xs text-muted-foreground">
                  Profile: {resource.profile}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold text-foreground">Authentication</h2>
          <div className="rounded-lg border border-border bg-card p-6">
            <p className="text-muted-foreground">
              Authentication is handled via MEDrecord Gateway. Include one of the following in your request:
            </p>
            <ul className="mt-4 list-inside list-disc space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">Session Cookie</strong> - For web applications
              </li>
              <li>
                <strong className="text-foreground">X-Api-Key Header</strong> - For server-to-server communication
              </li>
            </ul>
            <p className="mt-4 text-muted-foreground">
              All requests must include the <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm">X-Tenant-ID</code> header for multi-tenant access.
            </p>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold text-foreground">Role-Based Access</h2>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 font-medium text-foreground">Role</th>
                  <th className="px-4 py-3 font-medium text-foreground">Access Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                <tr>
                  <td className="px-4 py-3 font-medium text-foreground">super_admin</td>
                  <td className="px-4 py-3 text-muted-foreground">Full access, all tenants</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-foreground">tenant_admin</td>
                  <td className="px-4 py-3 text-muted-foreground">Full access, own tenant</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-foreground">practitioner</td>
                  <td className="px-4 py-3 text-muted-foreground">Read/write for patients in care</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-foreground">patient</td>
                  <td className="px-4 py-3 text-muted-foreground">Read-only, own data</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-foreground">researcher</td>
                  <td className="px-4 py-3 text-muted-foreground">Read-only, anonymized data</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-foreground">dev</td>
                  <td className="px-4 py-3 text-muted-foreground">Read-only, test tenant</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <footer className="mt-16 border-t border-border pt-8 text-center text-sm text-muted-foreground">
          <p>MEDrecord FHIR Server - Dutch ZIB R4 Compliant</p>
          <p className="mt-1">FHIR Version: 4.0.1</p>
        </footer>
      </div>
    </main>
  );
}
