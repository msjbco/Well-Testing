// Next.js API route that proxies to Express app
// Import the Express handler directly
import type { NextRequest } from 'next/server';

// Dynamically import the Express app (CommonJS)
let expressHandler: any = null;

async function getHandler() {
  if (!expressHandler) {
    expressHandler = require('../../../api/[...].js');
  }
  return expressHandler;
}

// Create a simple adapter to convert Next.js Request/Response to Express format
export async function GET(req: NextRequest) {
  return handleRequest(req);
}

export async function POST(req: NextRequest) {
  return handleRequest(req);
}

export async function PUT(req: NextRequest) {
  return handleRequest(req);
}

export async function DELETE(req: NextRequest) {
  return handleRequest(req);
}

export async function OPTIONS(req: NextRequest) {
  return handleRequest(req);
}

async function handleRequest(req: NextRequest) {
  const handler = await getHandler();
  
  return new Promise((resolve) => {
    const url = new URL(req.url);
    
    // Read request body
    let body: any = null;
    const bodyPromise = req.text().then((text) => {
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    });
    
    bodyPromise.then((parsedBody) => {
      body = parsedBody;
      
      // Create Express-compatible request object
      const expressReq = {
        method: req.method,
        url: url.pathname + url.search,
        path: url.pathname,
        query: Object.fromEntries(url.searchParams.entries()),
        headers: Object.fromEntries(req.headers.entries()),
        body: body,
        get: function(name: string) {
          return this.headers[name.toLowerCase()];
        },
      } as any;
      
      // Create Express-compatible response object
      let statusCode = 200;
      const headers: Record<string, string> = {};
      let responseBody: any = null;
      
      const expressRes = {
        statusCode: 200,
        status: function(code: number) {
          statusCode = code;
          this.statusCode = code;
          return this;
        },
        setHeader: function(name: string, value: string) {
          headers[name.toLowerCase()] = value;
          return this;
        },
        getHeader: function(name: string) {
          return headers[name.toLowerCase()];
        },
        json: function(data: any) {
          responseBody = data;
          this.setHeader('content-type', 'application/json');
          resolve(
            new Response(JSON.stringify(data), {
              status: statusCode,
              headers: {
                ...headers,
                'content-type': 'application/json',
              },
            })
          );
          return this;
        },
        send: function(data: any) {
          responseBody = data;
          resolve(
            new Response(typeof data === 'string' ? data : JSON.stringify(data), {
              status: statusCode,
              headers,
            })
          );
          return this;
        },
        end: function(chunk?: any) {
          if (chunk) {
            responseBody = chunk;
            resolve(
              new Response(typeof chunk === 'string' ? chunk : JSON.stringify(chunk), {
                status: statusCode,
                headers,
              })
            );
          } else if (responseBody !== null) {
            resolve(
              new Response(typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody), {
                status: statusCode,
                headers,
              })
            );
          } else {
            resolve(new Response(null, { status: statusCode, headers }));
          }
          return this;
        },
      } as any;
      
      // Call the Express handler
      try {
        handler(expressReq, expressRes);
      } catch (error: any) {
        resolve(
          new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
            status: 500,
            headers: { 'content-type': 'application/json' },
          })
        );
      }
    });
  });
}

