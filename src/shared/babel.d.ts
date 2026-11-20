/** Babel's presets and Solid's plugin ship without types; Estate passes them to Babel and nothing else. */
declare module "@solidjs/babel-plugin" {
  const preset: object
  export default preset
}
declare module "@babel/preset-typescript" {
  const preset: object
  export default preset
}
