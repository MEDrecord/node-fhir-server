import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API Documentation | MEDrecord FHIR R4 Server',
  description: 'Interactive OpenAPI documentation for the MEDrecord FHIR R4 API with Dutch ZIB (nl-core) profiles.',
  openGraph: {
    title: 'MEDrecord FHIR R4 API Documentation',
    description: 'Interactive Swagger UI documentation for Dutch ZIB-compliant FHIR R4 API',
    type: 'website',
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
