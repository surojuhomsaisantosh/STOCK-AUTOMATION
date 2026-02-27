// DEV-only logger — calls are no-ops in production builds
// Usage: import { devLog, devWarn } from '../../utils/logger';
//        devLog('message', data);

const isDev = import.meta.env.DEV;

export const devLog = isDev
    ? (...args) => console.log(...args)
    : () => { };

export const devWarn = isDev
    ? (...args) => console.warn(...args)
    : () => { };
