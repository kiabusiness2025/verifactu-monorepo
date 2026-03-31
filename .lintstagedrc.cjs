function quoteFiles(files) {
  return files.map((file) => `"${file}"`).join(' ');
}

function isWellKnownFile(file) {
  return file.includes('/.well-known/') || file.includes('\\.well-known\\');
}

module.exports = {
  '*.{ts,tsx,js,jsx}': (files) => {
    const lintableFiles = files.filter((file) => !isWellKnownFile(file));

    if (lintableFiles.length === 0) {
      return [];
    }

    const args = quoteFiles(lintableFiles);
    return [
      `pnpm exec eslint --fix --max-warnings=0 ${args}`,
      `pnpm exec prettier --write ${args}`,
    ];
  },
  '**/.well-known/**/*.{ts,tsx,js,jsx}': (files) => {
    if (files.length === 0) {
      return [];
    }

    return [`pnpm exec prettier --write ${quoteFiles(files)}`];
  },
  '*.{json,md,yaml,yml}': (files) => {
    if (files.length === 0) {
      return [];
    }

    return [`pnpm exec prettier --write ${quoteFiles(files)}`];
  },
};