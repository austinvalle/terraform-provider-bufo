import * as x509 from "@peculiar/x509";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export interface TlsCert {
  cert: string;
  key: string;
  derCert: string;
}

const CACHE_DIR = join(Deno.env.get("HOME") || "/tmp", ".terraform-provider-bufo");
const CERT_CACHE = join(CACHE_DIR, "cert.pem");
const KEY_CACHE = join(CACHE_DIR, "key.pem");
const DER_CACHE = join(CACHE_DIR, "cert.der.b64");

function ensureCacheDir(): void {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function loadCachedCert(): TlsCert | null {
  try {
    if (existsSync(CERT_CACHE) && existsSync(KEY_CACHE) && existsSync(DER_CACHE)) {
      return {
        cert: readFileSync(CERT_CACHE, "utf-8"),
        key: readFileSync(KEY_CACHE, "utf-8"),
        derCert: readFileSync(DER_CACHE, "utf-8").trim(),
      };
    }
  } catch {
    // ignore
  }
  return null;
}

function saveCertToCache(tls: TlsCert): void {
  try {
    ensureCacheDir();
    writeFileSync(CERT_CACHE, tls.cert);
    writeFileSync(KEY_CACHE, tls.key);
    writeFileSync(DER_CACHE, tls.derCert);
  } catch {
    // ignore cache write errors
  }
}

export async function getSelfSignedCert(): Promise<TlsCert> {
  const cached = loadCachedCert();
  if (cached) return cached;

  const tls = await generateSelfSignedCert();
  saveCertToCache(tls);
  return tls;
}

async function generateSelfSignedCert(): Promise<TlsCert> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-521",
    },
    true,
    ["sign", "verify"],
  );

  const now = new Date();
  const notBefore = new Date(now.getTime() - 30_000);
  const notAfter = new Date(now.getTime() + 30 * 365.25 * 24 * 60 * 60 * 1000);

  const serialNumber = generateSerialNumber();

  const cert = await x509.X509CertificateGenerator.createSelfSigned({
    serialNumber,
    name: "CN=localhost, O=HashiCorp",
    notBefore,
    notAfter,
    signingAlgorithm: {
      name: "ECDSA",
      hash: "SHA-256",
    },
    keys: keyPair,
    extensions: [
      new x509.SubjectAlternativeNameExtension([
        { type: "dns", value: "localhost" },
      ]),
      new x509.BasicConstraintsExtension(true),
      new x509.KeyUsagesExtension(
        x509.KeyUsageFlags.digitalSignature |
          x509.KeyUsageFlags.keyEncipherment |
          x509.KeyUsageFlags.keyAgreement |
          x509.KeyUsageFlags.keyCertSign,
        true,
      ),
      new x509.ExtendedKeyUsageExtension([
        x509.ExtendedKeyUsage.serverAuth,
        x509.ExtendedKeyUsage.clientAuth,
      ]),
    ],
  });

  const certPem = cert.toString("pem");
  
  const privateKeyDer = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
  const privateKeyPem = derToPem("PRIVATE KEY", new Uint8Array(privateKeyDer));

  const certDer = cert.rawData;
  const derCert = Buffer.from(certDer).toString("base64").replace(/=+$/, "");

  return {
    cert: certPem,
    key: privateKeyPem,
    derCert,
  };
}

function generateSerialNumber(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function derToPem(type: string, der: Uint8Array): string {
  const base64 = Buffer.from(der).toString("base64");
  const lines: string[] = [];
  for (let i = 0; i < base64.length; i += 64) {
    lines.push(base64.substring(i, i + 64));
  }
  return `-----BEGIN ${type}-----\n${lines.join("\n")}\n-----END ${type}-----`;
}

export function formatHandshake(port: number, cert: string): string {
  return `1|6|tcp|127.0.0.1:${port}|grpc|${cert}`;
}

export function writeHandshake(port: number, cert: string): void {
  const line = formatHandshake(port, cert) + "\n";
  process.stdout.write(line);
}
