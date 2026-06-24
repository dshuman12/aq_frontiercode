import { Blob } from 'buffer';

if (typeof globalThis.File === 'undefined') {
  class FilePolyfill extends Blob {
    name: string;
    lastModified: number;

    constructor(
      parts?: (ArrayBuffer | Blob | Buffer | string)[],
      options?: { name?: string; lastModified?: number; type?: string },
    ) {
      super(parts ?? [], options);
      this.name = options?.name ?? '';
      this.lastModified = options?.lastModified ?? Date.now();
    }
  }

  (globalThis as any).File = FilePolyfill;
}

jest.mock('jsdom', () => {
  const cheerio = require('cheerio');
  class MockJSDOM {
    window: any;
    constructor(html: string) {
      const $ = cheerio.load(html);
      const wrap = (el: any): any => {
        if (!el) return null;
        return {
          textContent: $(el).text(),
          nextElementSibling: wrap($(el).next()[0]),
          querySelectorAll: (selector: string) =>
            $(el)
              .find(selector)
              .toArray()
              .map((child: any) => wrap(child)),
        };
      };
      this.window = {
        document: {
          querySelectorAll: (selector: string) =>
            $(selector)
              .toArray()
              .map((el: any) => wrap(el)),
        },
      };
    }
  }
  return { JSDOM: MockJSDOM };
});
