'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export default function DocsPage() {
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Image 
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo-1024-transparent-HPgEtblYgTG4Z7nO9fz6qrrXwkTgPr.png"
                alt="MEDrecord Logo"
                width={40}
                height={40}
                className="h-10 w-10"
              />
              <div>
                <h1 className="text-lg font-bold text-slate-900">MEDrecord</h1>
                <p className="text-xs text-slate-500">API Documentation</p>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-medium text-teal-700">
              OpenAPI 3.0
            </span>
            <Link
              href="/"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Back to Overview
            </Link>
            <Link
              href="/api/fhir/4_0_1/metadata"
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
            >
              CapabilityStatement
            </Link>
          </div>
        </div>
      </header>

      {/* Quick Links Bar */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-2">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-500">Quick links:</span>
            <a href="#tag/Patient" className="text-teal-600 hover:text-teal-700 hover:underline">Patient</a>
            <a href="#tag/Observation" className="text-teal-600 hover:text-teal-700 hover:underline">Observation</a>
            <a href="#tag/Condition" className="text-teal-600 hover:text-teal-700 hover:underline">Condition</a>
            <a href="#tag/Practitioner" className="text-teal-600 hover:text-teal-700 hover:underline">Practitioner</a>
            <span className="text-slate-300">|</span>
            <a 
              href="/api/openapi" 
              target="_blank" 
              className="text-slate-600 hover:text-slate-800 hover:underline flex items-center gap-1"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download OpenAPI JSON
            </a>
          </div>
        </div>
      </div>

      {/* Swagger UI Container */}
      <main ref={containerRef} className="swagger-container">
        {mounted ? (
          <SwaggerUI
            url="/api/openapi"
            docExpansion="list"
            defaultModelsExpandDepth={1}
            defaultModelExpandDepth={2}
            displayRequestDuration={true}
            filter={true}
            showExtensions={true}
            showCommonExtensions={true}
            tryItOutEnabled={true}
            persistAuthorization={true}
            supportedSubmitMethods={['get', 'post', 'put', 'delete']}
          />
        ) : (
          <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent"></div>
              <p className="text-slate-600">Loading API documentation...</p>
            </div>
          </div>
        )}
      </main>

      {/* Custom Styles for Swagger UI */}
      <style jsx global>{`
        .swagger-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 1rem;
        }

        /* Override Swagger UI colors to match MEDrecord theme */
        .swagger-ui .topbar {
          display: none;
        }

        .swagger-ui .info {
          margin: 2rem 0;
        }

        .swagger-ui .info .title {
          color: #0f172a;
          font-family: inherit;
        }

        .swagger-ui .info .description {
          font-family: inherit;
          color: #475569;
        }

        .swagger-ui .info .description h2,
        .swagger-ui .info .description h3 {
          color: #0f172a;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
        }

        .swagger-ui .info .description code {
          background: #f1f5f9;
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-size: 0.875em;
          color: #0d9488;
        }

        .swagger-ui .info .description pre {
          background: #0f172a;
          border-radius: 0.5rem;
          padding: 1rem;
        }

        .swagger-ui .opblock-tag {
          color: #0f172a;
          font-family: inherit;
          border-bottom: 1px solid #e2e8f0;
        }

        .swagger-ui .opblock-tag:hover {
          background: #f8fafc;
        }

        .swagger-ui .opblock.opblock-get {
          background: rgba(16, 185, 129, 0.1);
          border-color: #10b981;
        }

        .swagger-ui .opblock.opblock-get .opblock-summary-method {
          background: #10b981;
        }

        .swagger-ui .opblock.opblock-post {
          background: rgba(59, 130, 246, 0.1);
          border-color: #3b82f6;
        }

        .swagger-ui .opblock.opblock-post .opblock-summary-method {
          background: #3b82f6;
        }

        .swagger-ui .opblock.opblock-put {
          background: rgba(245, 158, 11, 0.1);
          border-color: #f59e0b;
        }

        .swagger-ui .opblock.opblock-put .opblock-summary-method {
          background: #f59e0b;
        }

        .swagger-ui .opblock.opblock-delete {
          background: rgba(239, 68, 68, 0.1);
          border-color: #ef4444;
        }

        .swagger-ui .opblock.opblock-delete .opblock-summary-method {
          background: #ef4444;
        }

        .swagger-ui .opblock-summary-path {
          color: #0f172a;
          font-family: ui-monospace, monospace;
        }

        .swagger-ui .opblock-summary-description {
          color: #64748b;
          font-family: inherit;
        }

        .swagger-ui .btn.execute {
          background: #0d9488;
          border-color: #0d9488;
        }

        .swagger-ui .btn.execute:hover {
          background: #0f766e;
          border-color: #0f766e;
        }

        .swagger-ui .btn.authorize {
          color: #0d9488;
          border-color: #0d9488;
        }

        .swagger-ui .btn.authorize svg {
          fill: #0d9488;
        }

        .swagger-ui .authorization__btn {
          fill: #0d9488;
        }

        .swagger-ui .authorization__btn.locked {
          fill: #10b981;
        }

        .swagger-ui select {
          border-radius: 0.375rem;
          border-color: #e2e8f0;
        }

        .swagger-ui input[type=text],
        .swagger-ui textarea {
          border-radius: 0.375rem;
          border-color: #e2e8f0;
        }

        .swagger-ui input[type=text]:focus,
        .swagger-ui textarea:focus {
          border-color: #0d9488;
          outline: none;
          box-shadow: 0 0 0 2px rgba(13, 148, 136, 0.2);
        }

        .swagger-ui .model-box {
          background: #f8fafc;
          border-radius: 0.5rem;
        }

        .swagger-ui .model {
          color: #0f172a;
        }

        .swagger-ui .model-title {
          color: #0d9488;
        }

        .swagger-ui table tbody tr td {
          color: #334155;
        }

        .swagger-ui .parameter__name {
          color: #0f172a;
          font-family: ui-monospace, monospace;
        }

        .swagger-ui .parameter__name.required span {
          color: #ef4444;
        }

        .swagger-ui .parameter__type {
          color: #0d9488;
          font-family: ui-monospace, monospace;
        }

        .swagger-ui .response-col_status {
          color: #0f172a;
          font-family: ui-monospace, monospace;
        }

        .swagger-ui .responses-inner h4,
        .swagger-ui .responses-inner h5 {
          color: #0f172a;
        }

        .swagger-ui .highlight-code {
          border-radius: 0.5rem;
        }

        .swagger-ui .copy-to-clipboard {
          right: 0.5rem;
          top: 0.5rem;
        }

        .swagger-ui section.models {
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
        }

        .swagger-ui section.models h4 {
          color: #0f172a;
        }

        .swagger-ui .scheme-container {
          background: #f8fafc;
          padding: 1rem;
          border-radius: 0.5rem;
          box-shadow: none;
        }

        .swagger-ui .servers-title,
        .swagger-ui .servers>label {
          color: #64748b;
        }

        .swagger-ui .filter-container {
          margin: 1rem 0;
        }

        .swagger-ui .filter-container input {
          border-radius: 0.5rem;
          border-color: #e2e8f0;
          padding: 0.5rem 1rem;
        }

        /* Try it out styling */
        .swagger-ui .try-out__btn {
          color: #0d9488;
          border-color: #0d9488;
        }

        .swagger-ui .try-out__btn:hover {
          background: rgba(13, 148, 136, 0.1);
        }

        /* Response styling */
        .swagger-ui .responses-wrapper .responses-inner {
          padding: 1rem;
        }

        .swagger-ui .live-responses-table .response-col_status {
          color: #10b981;
        }

        .swagger-ui .response .response-col_description__inner {
          color: #334155;
        }

        /* Markdown styling in description */
        .swagger-ui .markdown p,
        .swagger-ui .renderedMarkdown p {
          margin: 0.5rem 0;
        }

        .swagger-ui .markdown ul,
        .swagger-ui .renderedMarkdown ul {
          margin-left: 1.5rem;
          list-style: disc;
        }

        .swagger-ui .markdown li,
        .swagger-ui .renderedMarkdown li {
          margin: 0.25rem 0;
        }

        .swagger-ui .markdown strong,
        .swagger-ui .renderedMarkdown strong {
          color: #0f172a;
        }

        /* Loading state */
        .swagger-ui .loading-container {
          padding: 4rem 0;
        }

        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .swagger-container {
            padding: 0 0.5rem;
          }
          
          .swagger-ui .opblock-summary {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  );
}
