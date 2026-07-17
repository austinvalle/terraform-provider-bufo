import "reflect-metadata";
import { Server, ServerCredentials } from "@grpc/grpc-js";
import protobufjs from "npm:protobufjs@7.6.5";
import { getSelfSignedCert, writeHandshake } from "./handshake.ts";
import { providerMethods } from "./provider.ts";
import { PROTO_ROOT_JSON } from "./generated/proto-root.ts";

process.on("uncaughtException", (err) => {
  console.error("[UNCAUGHT]", err);
});

process.on("unhandledRejection", (err) => {
  console.error("[UNHANDLED]", err);
});

function toSnakeCase(key: string): string {
  return key.replace(/([A-Z])/g, "_$1").toLowerCase();
}

function toCamelCase(key: string): string {
  return key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertKeys(obj: any, fn: (key: string) => string): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object" || Buffer.isBuffer(obj) || obj instanceof Uint8Array) return obj;
  if (Array.isArray(obj)) return obj.map((item) => convertKeys(item, fn));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    result[fn(key)] = convertKeys(value, fn);
  }
  return result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadServiceDefinition(): Record<string, any> {
  const root = protobufjs.Root.fromJSON(JSON.parse(PROTO_ROOT_JSON));
  const svc = root.lookupService("Provider");

  const definition: Record<string, Record<string, unknown>> = {};
  for (const [name, method] of Object.entries(svc.methods)) {
    const reqType = root.lookupType(method.requestType);
    const resType = root.lookupType(method.responseType);
    const camelName = name[0].toLowerCase() + name.slice(1);
    definition[name] = {
      path: `/tfplugin6.Provider/${name}`,
      requestStream: !!method.requestStream,
      responseStream: !!method.responseStream,
      originalName: camelName,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      requestSerialize: (value: any) =>
        Buffer.from(reqType.encode(convertKeys(value, toCamelCase)).finish()),
      requestDeserialize: (buffer: Buffer) =>
        convertKeys(reqType.decode(new Uint8Array(buffer)), toSnakeCase),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      responseSerialize: (value: any) =>
        Buffer.from(resType.encode(convertKeys(value, toCamelCase)).finish()),
      responseDeserialize: (buffer: Buffer) =>
        convertKeys(resType.decode(new Uint8Array(buffer)), toSnakeCase),
    };
  }
  return definition;
}

async function main() {
  const serviceDefinition = loadServiceDefinition();

  const tls = await getSelfSignedCert();

  const server = new Server();

  server.addService(serviceDefinition, providerMethods);

  const port = await new Promise<number>((resolve, reject) => {
    server.bindAsync(
      "127.0.0.1:0",
      ServerCredentials.createSsl(
        null,
        [
          {
            cert_chain: Buffer.from(tls.cert),
            private_key: Buffer.from(tls.key),
          },
        ],
        false,
      ),
      (err, port) => {
        if (err) reject(err);
        else resolve(port);
      },
    );
  });

  writeHandshake(port, tls.derCert);

  const shutdown = () => {
    server.tryShutdown(() => {
      Deno.exit(0);
    });
    setTimeout(() => Deno.exit(1), 5000);
  };

  Deno.addSignalListener("SIGINT", shutdown);
  Deno.addSignalListener("SIGTERM", shutdown);

  await new Promise<void>(() => {});
}

main().catch((err) => {
  console.error("[FATAL]", err);
  Deno.exit(1);
});
