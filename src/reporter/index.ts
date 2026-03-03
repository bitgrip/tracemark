import * as fs from 'fs/promises';
import * as path from 'path';
import type { Report, DomainResult, Config } from '../types/index.js';

export function generateReport(domains: DomainResult[], config: Config): Report {
  return {
    meta: {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      config: {
        warmRuns: config.warmRuns,
        waitBetweenRuns: config.waitBetweenRuns,
        scenarios: config.scenarios,
      },
    },
    domains,
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

export async function saveReport(report: Report, outputDir?: string): Promise<string[]> {
  const baseDir = outputDir ?? 'reports';
  const timestamp = createTimestamp();
  const savedPaths: string[] = [];

  for (const domain of report.domains) {
    const slug = createDomainSlug(domain.name);
    const dir = path.join(baseDir, slug, timestamp);
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, 'report.json');
    await fs.writeFile(filePath, JSON.stringify(report, null, 2), 'utf-8');
    savedPaths.push(filePath);
    console.log(`Saved report for "${domain.name}" to ${filePath}`);
  }

  return savedPaths;
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
    return JSON.parse(content) as Report;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse report JSON from "${filePath}": ${message}`);
  }
}
