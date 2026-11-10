import path from 'node:path';
import type { Plugin } from 'vite';
import { contentFiles, formatContentErrors, IMAGES_DIR } from './validate.ts';

/**
 * Validates src/content/*.json whenever Vite loads them, so mistakes fail `npm run build` and show
 * up in the dev server's error overlay.
 */
export function contentValidation(): Plugin {
  let root = process.cwd();
  const relative = (file: string) => path.relative(root, file).split(path.sep).join('/');

  return {
    name: 'content-validation',
    enforce: 'pre',
    configResolved(config) {
      root = config.root;
    },
    transform(source, id) {
      const file = relative(id.split('?')[0]);
      const content = contentFiles.find((entry) => entry.file === file);
      if (!content) return null;

      const errors = content.check(source, root);
      if (errors.length > 0) this.error(formatContentErrors(errors));
      return null;
    },
    handleHotUpdate({ file, server }) {
      // Missing images are reported against the JSON that names them, so recheck it when they change.
      if (!relative(file).startsWith(`${IMAGES_DIR}/`)) return;
      for (const content of contentFiles) {
        for (const module of server.moduleGraph.getModulesByFile(path.join(root, content.file)) ??
          []) {
          void server.reloadModule(module);
        }
      }
    },
  };
}
