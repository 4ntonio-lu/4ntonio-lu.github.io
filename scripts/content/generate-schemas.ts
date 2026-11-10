import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { contentFiles, renderJsonSchema } from './validate.ts';

const root = path.resolve(import.meta.dirname, '../..');

for (const content of contentFiles) {
  const target = path.join(root, content.schemaFile);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, renderJsonSchema(content));
  console.log(`Wrote ${content.schemaFile}`);
}
