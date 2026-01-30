'use client';

// Custom Swagger UI - No external dependencies
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    description: string;
    version: string;
    contact?: { name?: string; email?: string; url?: string };
    license?: { name: string; url?: string };
  };
  servers: Array<{ url: string; description: string }>;
  paths: Record<string, PathItem>;
  components?: {
    schemas?: Record<string, SchemaObject>;
    securitySchemes?: Record<string, SecurityScheme>;
  };
  tags?: Array<{ name: string; description?: string }>;
}

interface PathItem {
  get?: Operation;
  post?: Operation;
  put?: Operation;
  delete?: Operation;
  patch?: Operation;
}

interface Operation {
  tags?: string[];
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses?: Record<string, Response>;
  security?: Array<Record<string, string[]>>;
}

interface Parameter {
  name: string;
  in: string;
  description?: string;
  required?: boolean;
  schema?: SchemaObject;
  example?: unknown;
}

interface RequestBody {
  description?: string;
  required?: boolean;
  content?: Record<string, { schema?: SchemaObject; example?: unknown }>;
}

interface Response {
  description: string;
  content?: Record<string, { schema?: SchemaObject; example?: unknown }>;
}

interface SchemaObject {
  type?: string;
  properties?: Record<string, SchemaObject>;
  items?: SchemaObject;
  $ref?: string;
  enum?: string[];
  description?: string;
  example?: unknown;
  format?: string;
}

interface SecurityScheme {
  type: string;
  name?: string;
  in?: string;
  scheme?: string;
  description?: string;
}

interface TryItOutState {
  operationId: string;
  params: Record<string, string>;
  body: string;
  response: { status: number; data: unknown; duration: number } | null;
  loading: boolean;
  error: string | null;
}

const METHOD_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  get: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  post: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  put: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  delete: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  patch: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
};

const METHOD_BADGE_COLORS: Record<string, string> = {
  get: 'bg-emerald-600',
  post: 'bg-blue-600',
  put: 'bg-amber-600',
  delete: 'bg-red-600',
  patch: 'bg-purple-600',
};

export default function DocsPage() {
  const [spec, setSpec] = useState<OpenAPISpec | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedOperations, setExpandedOperations] = useState<Set<string>>(new Set());
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set(['Patient', 'Observation', 'System']));
  const [searchQuery, setSearchQuery] = useState('');
  const [tryItOut, setTryItOut] = useState<TryItOutState | null>(null);
  const [authHeader, setAuthHeader] = useState('');
  const [selectedServer, setSelectedServer] = useState(0);

  useEffect(() => {
    fetch('/api/openapi')
      .then((res) => res.json())
      .then((data) => {
        setSpec(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const toggleOperation = (operationId: string) => {
    setExpandedOperations((prev) => {
      const next = new Set(prev);
      if (next.has(operationId)) {
        next.delete(operationId);
      } else {
        next.add(operationId);
      }
      return next;
    });
  };

  const toggleTag = (tag: string) => {
    setExpandedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  };

  const initTryItOut = (operationId: string, operation: Operation, method: string, path: string) => {
    const params: Record<string, string> = {};
    operation.parameters?.forEach((p) => {
      params[p.name] = p.example?.toString() || '';
    });

    let body = '';
    if (operation.requestBody?.content?.['application/fhir+json']?.example) {
      body = JSON.stringify(operation.requestBody.content['application/fhir+json'].example, null, 2);
    } else if (operation.requestBody?.content?.['application/json']?.example) {
      body = JSON.stringify(operation.requestBody.content['application/json'].example, null, 2);
    }

    setTryItOut({
      operationId,
      params,
      body,
      response: null,
      loading: false,
      error: null,
    });
  };

  const executeTryItOut = useCallback(async (method: string, path: string, operation: Operation) => {
    if (!tryItOut || !spec) return;

    setTryItOut((prev) => prev ? { ...prev, loading: true, error: null, response: null } : null);

    const baseUrl = spec.servers[selectedServer]?.url || '';
    let url = path;

    // Replace path parameters
    Object.entries(tryItOut.params).forEach(([key, value]) => {
      const param = operation.parameters?.find((p) => p.name === key);
      if (param?.in === 'path') {
        url = url.replace(`{${key}}`, encodeURIComponent(value));
      }
    });

    // Add query parameters
    const queryParams = new URLSearchParams();
    operation.parameters?.forEach((param) => {
      if (param.in === 'query' && tryItOut.params[param.name]) {
        queryParams.append(param.name, tryItOut.params[param.name]);
      }
    });
    if (queryParams.toString()) {
      url += `?${queryParams.toString()}`;
    }

    const startTime = performance.now();

    try {
      const headers: Record<string, string> = {
        'Accept': 'application/fhir+json, application/json',
      };

      if (authHeader) {
        headers['X-Api-Key'] = authHeader;
      }

      if (['post', 'put', 'patch'].includes(method.toLowerCase()) && tryItOut.body) {
        headers['Content-Type'] = 'application/fhir+json';
      }

      const response = await fetch(`${baseUrl}${url}`, {
        method: method.toUpperCase(),
        headers,
        body: ['post', 'put', 'patch'].includes(method.toLowerCase()) && tryItOut.body
          ? tryItOut.body
          : undefined,
      });

      const duration = Math.round(performance.now() - startTime);
      let data: unknown;

      const contentType = response.headers.get('content-type');
      if (contentType?.includes('json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      setTryItOut((prev) => prev ? {
        ...prev,
        loading: false,
        response: { status: response.status, data, duration },
      } : null);
    } catch (err) {
      const duration = Math.round(performance.now() - startTime);
      setTryItOut((prev) => prev ? {
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Request failed',
        response: { status: 0, data: null, duration },
      } : null);
    }
  }, [tryItOut, spec, selectedServer, authHeader]);

  const getOperationsByTag = (tag: string): Array<{ method: string; path: string; operation: Operation }> => {
    if (!spec) return [];
    const operations: Array<{ method: string; path: string; operation: Operation }> = [];

    Object.entries(spec.paths).forEach(([path, pathItem]) => {
      (['get', 'post', 'put', 'delete', 'patch'] as const).forEach((method) => {
        const operation = pathItem[method];
        if (operation?.tags?.includes(tag)) {
          operations.push({ method, path, operation });
        }
      });
    });

    return operations;
  };

  const filterOperations = (operations: Array<{ method: string; path: string; operation: Operation }>) => {
    if (!searchQuery) return operations;
    const query = searchQuery.toLowerCase();
    return operations.filter(
      ({ path, operation }) =>
        path.toLowerCase().includes(query) ||
        operation.summary?.toLowerCase().includes(query) ||
        operation.description?.toLowerCase().includes(query)
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent"></div>
          <p className="text-slate-600">Loading API documentation...</p>
        </div>
      </div>
    );
  }

  if (error || !spec) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-bold text-red-600">Failed to load API documentation</h2>
          <p className="mt-2 text-slate-600">{error || 'Unknown error'}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  const allTags = spec.tags?.map((t) => t.name) || ['System'];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo-1024-transparent-HPgEtblYgTG4Z7nO9fz6qrrXwkTgPr.png"
                alt="MEDrecord Logo"
                width={40}
                height={40}
                className="h-10 w-10"
              />
              <div>
                <h1 className="text-lg font-bold text-slate-900">MEDrecord</h1>
                <p className="text-xs text-slate-500">FHIR R4 API Documentation</p>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-teal-200 bg-teal-50 text-teal-700">
              OpenAPI 3.0
            </Badge>
            <Badge variant="outline" className="border-slate-200 text-slate-600">
              v{spec.info.version}
            </Badge>
            <Link
              href="/"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Back to Overview
            </Link>
            <a
              href="/api/openapi"
              target="_blank"
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
            >
              Download JSON
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid grid-cols-12 gap-8">
          {/* Sidebar */}
          <aside className="col-span-3">
            <div className="sticky top-24 space-y-6">
              {/* Search */}
              <div>
                <Input
                  type="search"
                  placeholder="Search endpoints..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Server Selection */}
              <Card className="p-4">
                <h3 className="mb-2 text-sm font-semibold text-slate-900">Server</h3>
                <select
                  value={selectedServer}
                  onChange={(e) => setSelectedServer(Number(e.target.value))}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  {spec.servers.map((server, index) => (
                    <option key={index} value={index}>
                      {server.description}
                    </option>
                  ))}
                </select>
                <p className="mt-2 truncate text-xs text-slate-500">{spec.servers[selectedServer]?.url}</p>
              </Card>

              {/* Authorization */}
              <Card className="p-4">
                <h3 className="mb-2 text-sm font-semibold text-slate-900">Authorization</h3>
                <label className="mb-1 block text-xs text-slate-500">X-Api-Key</label>
                <Input
                  type="password"
                  placeholder="Enter API key..."
                  value={authHeader}
                  onChange={(e) => setAuthHeader(e.target.value)}
                  className="w-full"
                />
              </Card>

              {/* Navigation */}
              <Card className="p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">Resources</h3>
                <nav className="space-y-1">
                  {allTags.map((tag) => (
                    <a
                      key={tag}
                      href={`#${tag}`}
                      className="block rounded px-2 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                    >
                      {tag}
                    </a>
                  ))}
                </nav>
              </Card>
            </div>
          </aside>

          {/* Main Content */}
          <main className="col-span-9 space-y-8">
            {/* API Info */}
            <Card className="p-6">
              <h2 className="text-2xl font-bold text-slate-900">{spec.info.title}</h2>
              <div className="mt-4 prose prose-slate prose-sm max-w-none">
                <div
                  dangerouslySetInnerHTML={{
                    __html: spec.info.description
                      .replace(/\n\n/g, '</p><p>')
                      .replace(/\n/g, '<br/>')
                      .replace(/`([^`]+)`/g, '<code>$1</code>')
                      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                      .replace(/### ([^\n]+)/g, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
                      .replace(/## ([^\n]+)/g, '<h2 class="text-xl font-semibold mt-6 mb-3">$1</h2>')
                  }}
                />
              </div>
            </Card>

            {/* Endpoints by Tag */}
            {allTags.map((tag) => {
              const tagInfo = spec.tags?.find((t) => t.name === tag);
              const operations = filterOperations(getOperationsByTag(tag));

              if (operations.length === 0 && searchQuery) return null;

              return (
                <section key={tag} id={tag} className="scroll-mt-24">
                  <div
                    className="flex cursor-pointer items-center justify-between rounded-lg bg-white p-4 shadow-sm border border-slate-200"
                    onClick={() => toggleTag(tag)}
                  >
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{tag}</h3>
                      {tagInfo?.description && (
                        <p className="mt-1 text-sm text-slate-500">{tagInfo.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{operations.length} endpoints</Badge>
                      <svg
                        className={`h-5 w-5 text-slate-400 transition-transform ${expandedTags.has(tag) ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {expandedTags.has(tag) && (
                    <div className="mt-2 space-y-2">
                      {operations.map(({ method, path, operation }) => {
                        const operationId = operation.operationId || `${method}-${path}`;
                        const isExpanded = expandedOperations.has(operationId);
                        const colors = METHOD_COLORS[method] || METHOD_COLORS.get;
                        const isTryingOut = tryItOut?.operationId === operationId;

                        return (
                          <Card
                            key={operationId}
                            className={`overflow-hidden border ${colors.border} ${colors.bg}`}
                          >
                            {/* Operation Header */}
                            <div
                              className="flex cursor-pointer items-center gap-4 p-4"
                              onClick={() => toggleOperation(operationId)}
                            >
                              <span
                                className={`rounded px-2.5 py-1 text-xs font-bold uppercase text-white ${METHOD_BADGE_COLORS[method]}`}
                              >
                                {method}
                              </span>
                              <code className="font-mono text-sm text-slate-800">{path}</code>
                              <span className="flex-1 text-sm text-slate-600">{operation.summary}</span>
                              <svg
                                className={`h-5 w-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>

                            {/* Expanded Content */}
                            {isExpanded && (
                              <div className="border-t border-slate-200 bg-white p-4">
                                {operation.description && (
                                  <p className="mb-4 text-sm text-slate-600">{operation.description}</p>
                                )}

                                {/* Parameters */}
                                {operation.parameters && operation.parameters.length > 0 && (
                                  <div className="mb-4">
                                    <h4 className="mb-2 text-sm font-semibold text-slate-900">Parameters</h4>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-sm">
                                        <thead>
                                          <tr className="border-b border-slate-200 text-left">
                                            <th className="pb-2 pr-4 font-medium text-slate-500">Name</th>
                                            <th className="pb-2 pr-4 font-medium text-slate-500">In</th>
                                            <th className="pb-2 pr-4 font-medium text-slate-500">Type</th>
                                            <th className="pb-2 font-medium text-slate-500">Description</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {operation.parameters.map((param, idx) => (
                                            <tr key={idx} className="border-b border-slate-100">
                                              <td className="py-2 pr-4">
                                                <code className="text-teal-600">{param.name}</code>
                                                {param.required && (
                                                  <span className="ml-1 text-red-500">*</span>
                                                )}
                                              </td>
                                              <td className="py-2 pr-4 text-slate-500">{param.in}</td>
                                              <td className="py-2 pr-4 text-slate-500">
                                                {param.schema?.type || 'string'}
                                              </td>
                                              <td className="py-2 text-slate-600">{param.description}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}

                                {/* Request Body */}
                                {operation.requestBody && (
                                  <div className="mb-4">
                                    <h4 className="mb-2 text-sm font-semibold text-slate-900">Request Body</h4>
                                    <p className="mb-2 text-sm text-slate-600">{operation.requestBody.description}</p>
                                    {operation.requestBody.content?.['application/fhir+json']?.example && (
                                      <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">
                                        {JSON.stringify(
                                          operation.requestBody.content['application/fhir+json'].example,
                                          null,
                                          2
                                        )}
                                      </pre>
                                    )}
                                  </div>
                                )}

                                {/* Responses */}
                                {operation.responses && (
                                  <div className="mb-4">
                                    <h4 className="mb-2 text-sm font-semibold text-slate-900">Responses</h4>
                                    <div className="space-y-2">
                                      {Object.entries(operation.responses).map(([code, response]) => (
                                        <div
                                          key={code}
                                          className="flex items-start gap-3 rounded border border-slate-200 bg-slate-50 p-3"
                                        >
                                          <Badge
                                            variant={code.startsWith('2') ? 'default' : 'destructive'}
                                            className={code.startsWith('2') ? 'bg-emerald-600' : ''}
                                          >
                                            {code}
                                          </Badge>
                                          <span className="text-sm text-slate-600">{response.description}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Try it out */}
                                <div className="border-t border-slate-200 pt-4">
                                  {!isTryingOut ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        initTryItOut(operationId, operation, method, path);
                                      }}
                                    >
                                      Try it out
                                    </Button>
                                  ) : (
                                    <div className="space-y-4">
                                      <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-semibold text-slate-900">Try it out</h4>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setTryItOut(null);
                                          }}
                                        >
                                          Cancel
                                        </Button>
                                      </div>

                                      {/* Parameter Inputs */}
                                      {operation.parameters && operation.parameters.length > 0 && (
                                        <div className="space-y-3">
                                          {operation.parameters.map((param) => (
                                            <div key={param.name}>
                                              <label className="mb-1 block text-xs font-medium text-slate-700">
                                                {param.name}
                                                {param.required && <span className="text-red-500">*</span>}
                                                <span className="ml-2 text-slate-400">({param.in})</span>
                                              </label>
                                              <Input
                                                value={tryItOut.params[param.name] || ''}
                                                onChange={(e) =>
                                                  setTryItOut((prev) =>
                                                    prev
                                                      ? {
                                                          ...prev,
                                                          params: { ...prev.params, [param.name]: e.target.value },
                                                        }
                                                      : null
                                                  )
                                                }
                                                placeholder={param.description || param.name}
                                                className="font-mono text-sm"
                                              />
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      {/* Request Body Input */}
                                      {operation.requestBody && (
                                        <div>
                                          <label className="mb-1 block text-xs font-medium text-slate-700">
                                            Request Body
                                          </label>
                                          <textarea
                                            value={tryItOut.body}
                                            onChange={(e) =>
                                              setTryItOut((prev) =>
                                                prev ? { ...prev, body: e.target.value } : null
                                              )
                                            }
                                            rows={10}
                                            className="w-full rounded-md border border-slate-200 bg-slate-900 p-3 font-mono text-xs text-slate-100"
                                          />
                                        </div>
                                      )}

                                      {/* Execute Button */}
                                      <Button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          executeTryItOut(method, path, operation);
                                        }}
                                        disabled={tryItOut.loading}
                                        className="bg-teal-600 hover:bg-teal-700"
                                      >
                                        {tryItOut.loading ? 'Executing...' : 'Execute'}
                                      </Button>

                                      {/* Response */}
                                      {tryItOut.response && (
                                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                          <div className="mb-2 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <Badge
                                                variant={tryItOut.response.status >= 200 && tryItOut.response.status < 300 ? 'default' : 'destructive'}
                                                className={tryItOut.response.status >= 200 && tryItOut.response.status < 300 ? 'bg-emerald-600' : ''}
                                              >
                                                {tryItOut.response.status || 'Error'}
                                              </Badge>
                                              <span className="text-xs text-slate-500">
                                                {tryItOut.response.duration}ms
                                              </span>
                                            </div>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => {
                                                navigator.clipboard.writeText(
                                                  JSON.stringify(tryItOut.response?.data, null, 2)
                                                );
                                              }}
                                            >
                                              Copy
                                            </Button>
                                          </div>
                                          {tryItOut.error ? (
                                            <p className="text-sm text-red-600">{tryItOut.error}</p>
                                          ) : (
                                            <pre className="max-h-96 overflow-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
                                              {JSON.stringify(tryItOut.response.data, null, 2)}
                                            </pre>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}

            {/* Schemas */}
            {spec.components?.schemas && Object.keys(spec.components.schemas).length > 0 && (
              <section id="schemas" className="scroll-mt-24">
                <Card className="p-6">
                  <h3 className="mb-4 text-lg font-semibold text-slate-900">Schemas</h3>
                  <div className="space-y-4">
                    {Object.entries(spec.components.schemas).map(([name, schema]) => (
                      <div key={name} className="rounded-lg border border-slate-200 p-4">
                        <h4 className="font-mono text-sm font-semibold text-teal-600">{name}</h4>
                        {schema.description && (
                          <p className="mt-1 text-sm text-slate-600">{schema.description}</p>
                        )}
                        {schema.example && (
                          <details className="mt-3">
                            <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700">
                              Example
                            </summary>
                            <pre className="mt-2 overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
                              {JSON.stringify(schema.example, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
