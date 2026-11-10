// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { contentFiles, formatContentErrors, renderJsonSchema } from './validate.ts';

const root = fileURLToPath(new URL('../..', import.meta.url));

// The tests break the content on purpose, so they need to edit it without the schema's types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseJson = Record<string, any>;

function contentFile(name: string) {
  const content = contentFiles.find((entry) => entry.name === name)!;
  const data = JSON.parse(readFileSync(path.join(root, content.file), 'utf8'));
  return {
    /** Applies `edit` to a copy of the real file and returns the validation errors. */
    checkEdited(edit: (data: LooseJson) => void): string[] {
      const copy = structuredClone(data);
      edit(copy);
      return content.check(JSON.stringify(copy), root);
    },
    check: (source: string) => content.check(source, root),
  };
}

const experiences = contentFile('experiences');
const projects = contentFile('projects');
const profile = contentFile('profile');

describe('content validation', () => {
  it.each(contentFiles)('accepts the current $file', (content) => {
    expect(content.check(readFileSync(path.join(root, content.file), 'utf8'), root)).toEqual([]);
  });

  it('keeps the JSON Schemas in sync with schema.ts (run `npm run content:schemas`)', () => {
    for (const content of contentFiles) {
      expect(readFileSync(path.join(root, content.schemaFile), 'utf8')).toBe(
        renderJsonSchema(content),
      );
    }
  });

  it('accepts an ongoing job with a null end date', () => {
    expect(experiences.checkEdited((data) => (data.experiences[0].end = null))).toEqual([]);
  });

  it('reports a missing start date', () => {
    expect(experiences.checkEdited((data) => delete data.experiences[0].start)).toEqual([
      'experiences[0] (Trimble).start: Required. Use "YYYY-MM", for example "2024-05".',
    ]);
  });

  it('requires an end date or an explicit null', () => {
    expect(experiences.checkEdited((data) => delete data.experiences[0].end)).toEqual([
      'experiences[0] (Trimble).end: Required. Use "YYYY-MM", or null if it\'s ongoing.',
    ]);
  });

  it('rejects dates in other formats', () => {
    expect(experiences.checkEdited((data) => (data.experiences[1].start = 'Mar 2022'))).toEqual([
      'experiences[1] (Microchip).start: Use "YYYY-MM", for example "2024-05".',
    ]);
    expect(experiences.checkEdited((data) => (data.experiences[1].end = '2023-13'))).toEqual([
      'experiences[1] (Microchip).end: Use "YYYY-MM", or null if it\'s ongoing.',
    ]);
  });

  it('rejects an end date before the start date', () => {
    expect(experiences.checkEdited((data) => (data.experiences[0].end = '2024-04'))).toEqual([
      'experiences[0] (Trimble).end: The end date is before the start date.',
    ]);
  });

  it('reports misspelled fields', () => {
    const errors = experiences.checkEdited((data) => {
      data.experiences[0].strat = data.experiences[0].start;
      delete data.experiences[0].start;
    });
    expect(errors).toContain('experiences[0] (Trimble): Unrecognized key: "strat"');
  });

  it('requires at least one bullet point and skill', () => {
    const errors = experiences.checkEdited((data) => {
      data.experiences[0].bullets = [];
      data.experiences[0].skills = [''];
    });
    expect(errors).toEqual([
      "experiences[0] (Trimble).skills[0]: The skill can't be empty.",
      'experiences[0] (Trimble).bullets: Add at least one bullet point.',
    ]);
  });

  it('reports images that do not exist', () => {
    expect(experiences.checkEdited((data) => (data.experiences[0].logo = 'new-job.png'))).toEqual([
      "experiences[0] (Trimble).logo: Can't find src/assets/images/new-job.png.",
    ]);
    expect(projects.checkEdited((data) => (data.projects[2].image = 'missing.svg'))).toEqual([
      "projects[2] (Mind Kingdom).image: Can't find src/assets/images/missing.svg.",
    ]);
  });

  it('rejects links that are not full URLs', () => {
    expect(
      profile.checkEdited((data) => (data.links[0].url = 'linkedin.com/in/lu-antonio')),
    ).toEqual([
      'links[0] (LinkedIn).url: Use a full URL starting with https://, or a mailto: address.',
    ]);
    expect(projects.checkEdited((data) => (data.projects[0].link = 'github.com/me'))).toEqual([
      'projects[0] (Portfolio).link: Use a full URL starting with https://, or a mailto: address.',
    ]);
  });

  it('reports a resume that is not in public/', () => {
    expect(profile.checkEdited((data) => (data.resumeFile = 'Old Resume.pdf'))).toEqual([
      "resumeFile: Can't find public/Old Resume.pdf.",
    ]);
  });

  it('reports invalid JSON', () => {
    expect(experiences.check('{ "experiences": [')).toEqual([
      expect.stringMatching(/^This isn't valid JSON: /),
    ]);
  });

  it('formats errors for the build output', () => {
    expect(formatContentErrors(['a', 'b'])).toBe(
      ['2 problems to fix:', '  - a', '  - b', 'See "Editing content" in README.md.'].join('\n'),
    );
    expect(formatContentErrors(['a']).split('\n')[0]).toBe('1 problem to fix:');
  });
});
