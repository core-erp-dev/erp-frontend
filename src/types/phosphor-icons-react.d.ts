/**
 * Module augmentation for @phosphor-icons/react.
 *
 * Workaround: despite `export * from './csr/Play'` etc. existing in the package's
 * dist/index.d.ts, some TypeScript resolutions (Next.js / tsc) fail to resolve
 * these re-exports at compile time. They work at runtime with the bundler.
 *
 * These explicit re-exports keep tsc --noEmit happy.
 */
import type { Icon } from '@phosphor-icons/react/dist/lib/types';

declare module '@phosphor-icons/react' {
  export declare const Play: Icon;
  export declare const Pause: Icon;
}
