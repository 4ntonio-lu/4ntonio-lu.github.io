import { z } from 'zod';

const YEAR_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const IMAGE_FILE = /^[\w.-]+\.(png|jpe?g|gif|svg|webp)$/i;
const LINK_URL = /^(https?:\/\/|mailto:)\S+$/;

const MONTH_HINT = 'Use "YYYY-MM", for example "2024-05".';
const END_MONTH_HINT = 'Use "YYYY-MM", or null if it\'s ongoing.';
const IMAGE_HINT = 'Use the file name of an image in src/assets/images, for example "trimble.png".';
const LINK_HINT = 'Use a full URL starting with https://, or a mailto: address.';
const PDF_HINT = 'Use the file name of a PDF in public/, for example "Resume.pdf".';

const required =
  (hint: string) =>
  (issue: { input?: unknown }): string =>
    issue.input === undefined ? `Required. ${hint}` : hint;

const text = (what: string) =>
  z.string({ error: required(`Add the ${what} as text.`) }).min(1, `The ${what} can't be empty.`);

const textList = (what: string, min: string) =>
  z.array(text(what), { error: required(`Add a list of ${what}s.`) }).min(1, min);

const startMonth = z
  .string({ error: required(MONTH_HINT) })
  .regex(YEAR_MONTH, MONTH_HINT)
  .describe('First month, as "YYYY-MM".')
  .meta({ examples: ['2024-05'] });

const endMonth = z
  .string({ error: required(END_MONTH_HINT) })
  .regex(YEAR_MONTH, END_MONTH_HINT)
  .nullable()
  .describe('Last month as "YYYY-MM", or null if it\'s ongoing (shown as "Present").')
  .meta({ examples: ['2024-09', null] });

const imageFile = z
  .string({ error: required(IMAGE_HINT) })
  .regex(IMAGE_FILE, IMAGE_HINT)
  .describe('File name of an image in src/assets/images.');

// Malformed dates already have their own error, so only compare two valid ones.
const endNotBeforeStart = ({ start, end }: { start: string; end: string | null }) =>
  end === null || !YEAR_MONTH.test(start) || !YEAR_MONTH.test(end) || end >= start;

const endBeforeStartError = { path: ['end'], message: 'The end date is before the start date.' };

const schemaKey = z.string().optional().describe('Path to the JSON Schema, for editor support.');

export const experienceSchema = z
  .strictObject({
    company: text('company name'),
    role: text('job title'),
    location: text('location'),
    logo: imageFile,
    start: startMonth,
    end: endMonth,
    skills: textList('skill', 'List at least one skill.'),
    bullets: textList('bullet point', 'Add at least one bullet point.'),
  })
  .refine(endNotBeforeStart, endBeforeStartError)
  .meta({
    defaultSnippets: [
      {
        label: 'New job',
        body: {
          company: '$1',
          role: '$2',
          location: '$3',
          logo: '$4',
          start: '$5',
          end: null,
          skills: ['$6'],
          bullets: ['$7'],
        },
      },
    ],
  });

export const projectSchema = z
  .strictObject({
    name: text('project name'),
    image: imageFile,
    start: startMonth,
    end: endMonth,
    skills: textList('skill', 'List at least one skill.'),
    link: z
      .string({ error: LINK_HINT })
      .regex(LINK_URL, LINK_HINT)
      .optional()
      .describe('Optional link to the code or a live demo.'),
    bullets: textList('bullet point', 'Add at least one bullet point.'),
  })
  .refine(endNotBeforeStart, endBeforeStartError);

export const linkSchema = z.strictObject({
  label: text('link label'),
  url: z.string({ error: required(LINK_HINT) }).regex(LINK_URL, LINK_HINT),
  icon: imageFile,
});

export const experiencesFileSchema = z.strictObject({
  $schema: schemaKey,
  experiences: z
    .array(experienceSchema, { error: required('Add a list of experiences.') })
    .min(1, 'Add at least one experience.')
    .describe("Shown newest first, so the order here doesn't matter."),
});

export const projectsFileSchema = z.strictObject({
  $schema: schemaKey,
  projects: z
    .array(projectSchema, { error: required('Add a list of projects.') })
    .min(1, 'Add at least one project.')
    .describe("Shown newest first, so the order here doesn't matter."),
});

export const profileFileSchema = z.strictObject({
  $schema: schemaKey,
  about: z.strictObject(
    {
      heading: text('heading'),
      paragraphs: textList('paragraph', 'Add at least one paragraph.'),
      mobileNote: text('mobile note').optional().describe('Extra line shown on small screens.'),
    },
    { error: required('Add the About window text.') },
  ),
  links: z
    .array(linkSchema, { error: required('Add a list of links.') })
    .describe('Shown as icons in the taskbar, in this order.'),
  resumeFile: z
    .string({ error: required(PDF_HINT) })
    .regex(/^[^/\\]+\.pdf$/i, PDF_HINT)
    .describe('File name of the resume PDF in public/.'),
});

export type Experience = z.infer<typeof experienceSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Link = z.infer<typeof linkSchema>;
export type Profile = z.infer<typeof profileFileSchema>;
