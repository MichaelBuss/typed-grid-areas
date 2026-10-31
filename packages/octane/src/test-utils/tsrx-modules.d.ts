/**
 * For plain `tsc`, which can't read `.tsrx`: specs that import a `.tsrx`
 * fixture see it untyped. `tsrx-tsc` resolves and checks the real module.
 */
declare module "*.tsrx";
