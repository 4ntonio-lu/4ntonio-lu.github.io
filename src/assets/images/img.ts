const imageModules = import.meta.glob('./*.png', { eager: true, import: 'default' });

export const img: Record<string, string> = {};

for (const path in imageModules) {
  const key = path.split('/').pop()?.replace('.png', '') || '';
  img[key] = imageModules[path] as string;
}