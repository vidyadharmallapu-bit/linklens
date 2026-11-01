import { defineConfig } from 'wxt';

// See https://wxt.dev/api/reference/wxt/interfaces/inlineconfig.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'LinkLens',
    description: 'Store, organize and share your images with AI-ready public HTTPS links.',
    permissions: ['clipboardWrite', 'clipboardRead', 'storage'],
  },
});
