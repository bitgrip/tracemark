import * as fs from 'fs/promises';
import * as path from 'path';
import type { Report, Measurement, DomainResult, Config } from '../types/index.js';

export function createMeasurement(domain: DomainResult, config: Config): Measurement {
  return {
    meta: {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      config: {
        warmRuns: config.warmRuns,
        waitBetweenRuns: config.waitBetweenRuns,
        lighthouseRuns: config.lighthouse.runs ?? 1,
        httpTimingRuns: config.httpTiming?.runs,
        scenarios: config.scenarios,
        ...(config.network ? { network: config.network } : {}),
      },
    },
    domain,
  };
}

export function generateReport(measurements: Measurement[]): Report {
  const meta = measurements[0].meta;
  return {
    meta: {
      timestamp: new Date().toISOString(),
      version: meta.version,
      config: meta.config,
    },
    measurements,
  };
}

export function createDomainSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function createTimestamp(): string {
  const now = new Date();
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
}

export async function saveMeasurement(measurement: Measurement, baseDir?: string): Promise<string> {
  const dir = baseDir ?? 'measurements';
  const slug = createDomainSlug(measurement.domain.name);
  const timestamp = createTimestamp();
  const outputDir = path.join(dir, slug, timestamp);
  await fs.mkdir(outputDir, { recursive: true });
  const filePath = path.join(outputDir, 'measurement.json');
  await fs.writeFile(filePath, JSON.stringify(measurement, null, 2), 'utf-8');
  return filePath;
}

export async function saveReport(report: Report, outputDir?: string): Promise<string> {
  const baseDir = outputDir ?? 'reports';
  const timestamp = createTimestamp();
  const dir = path.join(baseDir, timestamp);
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, 'report.json');
  await fs.writeFile(filePath, JSON.stringify(report, null, 2), 'utf-8');
  return filePath;
}

export async function loadMeasurement(filePath: string): Promise<Measurement> {
  let content: string;
  try {
    content = await fs.readFile(filePath, 'utf-8');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to read measurement file "${filePath}": ${message}`);
  }

  try {
    return JSON.parse(content) as Measurement;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse measurement JSON from "${filePath}": ${message}`);
  }
}

export async function loadReport(filePath: string): Promise<Report> {
  let content: string;
  try {
    content = await fs.readFile(filePath, 'utf-8');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to read report file "${filePath}": ${message}`);
  }

  try {
    const data = JSON.parse(content) as Record<string, unknown>;
    // Support legacy format with "domains" field
    if ('domains' in data && !('measurements' in data)) {
      const domains = data['domains'] as DomainResult[];
      const meta = data['meta'] as Report['meta'];
      return {
        meta,
        measurements: domains.map(domain => ({ meta, domain })),
      };
    }
    return data as unknown as Report;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse report JSON from "${filePath}": ${message}`);
  }
}
