# Installation Guide

## Required Steps

The project requires some additional packages to be installed. Run the following command:

```bash
npm install
```

This will install all dependencies including:
- `@radix-ui/react-select` - For select dropdowns
- `@radix-ui/react-switch` - For toggle switches
- `@mediapipe/pose` - For video analysis (optional, can be installed later)

## If npm install fails

If you encounter permission errors, try:

```bash
npm install --legacy-peer-deps
```

Or install packages individually:

```bash
npm install @radix-ui/react-select@^2.1.1
npm install @radix-ui/react-switch@^1.1.0
```

## After Installation

Once packages are installed, the project should compile successfully:

```bash
npm run dev
```

## Troubleshooting

If you still see compilation errors:

1. Delete `node_modules` and `package-lock.json`
2. Run `npm install` again
3. Clear Next.js cache: `rm -rf .next`
4. Try building again: `npm run build`
