import { existsSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import {
  experiencesFileSchema,
  profileFileSchema,
  projectsFileSchema,
} from '../../src/content/schema.ts';

export const IMAGES_DIR = 'src/assets/images';

type AssetRef = { path: PropertyKey[]; file: string };

export type ContentFile = {
  name: string;
  /** Path relative to the project root, with forward slashes. */
  file: string;
  schemaFile: string;
  schema: z.ZodType;
  /** Returns one message per problem, or an empty list if the file is valid. */
  check(source: string, root: string): string[];
};

function defineContentFile<S extends z.ZodType>(
  name: string,
  schema: S,
  assets: (data: z.output<S>) => AssetRef[],
): ContentFile {
  return {
    name,
    file: `src/content/${name}.json`,
    schemaFile: `src/content/schemas/${name}.schema.json`,
    schema,
    check(source, root) {
      let json: unknown;
      try {
        json = JSON.parse(source);
      } catch (error) {
        return [`This isn't valid JSON: ${(error as Error).message}`];
      }

      const result = schema.safeParse(json);
      if (!result.success) {
        return result.error.issues.map(
          (issue) => `${describePath(json, issue.path)}: ${issue.message}`,
        );
      }

      return assets(result.data)
        .filter((asset) => !existsSync(path.join(root, asset.file)))
        .map((asset) => `${describePath(json, asset.path)}: Can't find ${asset.file}.`);
    },
  };
}

const image = (keyPath: PropertyKey[], file: string): AssetRef => ({
  path: keyPath,
  file: `${IMAGES_DIR}/${file}`,
});

export const contentFiles: ContentFile[] = [
  defineContentFile('experiences', experiencesFileSchema, (data) =>
    data.experiences.map((job, i) => image(['experiences', i, 'logo'], job.logo)),
  ),
  defineContentFile('projects', projectsFileSchema, (data) =>
    data.projects.map((project, i) => image(['projects', i, 'image'], project.image)),
  ),
  defineContentFile('profile', profileFileSchema, (data) => [
    ...data.links.map((link, i) => image(['links', i, 'icon'], link.icon)),
    { path: ['resumeFile'], file: `public/${data.resumeFile}` },
  ]),
];

/** Turns ['experiences', 2, 'start'] into `experiences[2] (Trimble).start`. */
function describePath(json: unknown, keys: PropertyKey[]): string {
  let description = '';
  let node = json;
  for (const key of keys) {
    node =
      node !== null && typeof node === 'object'
        ? (node as Record<PropertyKey, unknown>)[key]
        : undefined;
    if (typeof key === 'number') {
      const entry = (node ?? {}) as Record<string, unknown>;
      const label = [entry.company, entry.name, entry.label].find(
        (value) => typeof value === 'string' && value !== '',
      );
      description += label === undefined ? `[${key}]` : `[${key}] (${String(label)})`;
    } else {
      description += `${description ? '.' : ''}${String(key)}`;
    }
  }
  return description || 'The file';
}

export function formatContentErrors(errors: string[]): string {
  return [
    errors.length === 1 ? '1 problem to fix:' : `${errors.length} problems to fix:`,
    ...errors.map((error) => `  - ${error}`),
    'See "Editing content" in README.md.',
  ].join('\n');
}

export function renderJsonSchema(content: ContentFile): string {
  const schema = z.toJSONSchema(content.schema, { target: 'draft-7', io: 'input' });
  return `${JSON.stringify(schema, null, 2)}\n`;
}
