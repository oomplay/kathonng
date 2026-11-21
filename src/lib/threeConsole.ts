import { setConsoleFunction } from 'three'

/**
 * Silences one specific Three.js warning.
 *
 * `THREE.Clock` is deprecated in Three r187, but `@react-three/fiber` still
 * creates one internally and offers no way to replace it. Only that exact
 * message is filtered; every other warning still reaches the console.
 *
 * This lives in its own module because React Three Fiber creates its `Clock`
 * while its own module is evaluated. The filter therefore has to be installed
 * before any scene module is imported.
 */
const CLOCK_DEPRECATION_WARNING = 'THREE.Clock: This module has been deprecated.'

setConsoleFunction((type, message, ...params) => {
  if (type === 'warn' && typeof message === 'string' && message.startsWith(CLOCK_DEPRECATION_WARNING)) {
    return
  }
  console[type](message, ...params)
})