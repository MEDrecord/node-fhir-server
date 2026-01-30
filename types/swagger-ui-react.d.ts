declare module 'swagger-ui-react' {
  import { ComponentType } from 'react';

  interface SwaggerUIProps {
    url?: string;
    spec?: object;
    docExpansion?: 'list' | 'full' | 'none';
    defaultModelsExpandDepth?: number;
    defaultModelExpandDepth?: number;
    displayRequestDuration?: boolean;
    filter?: boolean | string;
    showExtensions?: boolean;
    showCommonExtensions?: boolean;
    tryItOutEnabled?: boolean;
    persistAuthorization?: boolean;
    supportedSubmitMethods?: Array<'get' | 'put' | 'post' | 'delete' | 'options' | 'head' | 'patch' | 'trace'>;
    requestInterceptor?: (request: Request) => Request;
    responseInterceptor?: (response: Response) => Response;
    onComplete?: (system: unknown) => void;
    plugins?: unknown[];
    presets?: unknown[];
    layout?: string;
    deepLinking?: boolean;
    showMutatedRequest?: boolean;
    defaultModelRendering?: 'example' | 'model';
    displayOperationId?: boolean;
  }

  const SwaggerUI: ComponentType<SwaggerUIProps>;
  export default SwaggerUI;
}

declare module 'swagger-ui-react/swagger-ui.css';
