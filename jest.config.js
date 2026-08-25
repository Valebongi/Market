/**
 * Runner unico para todo el monorepo. Todos los tests viven en `tests/`, FUERA
 * del arbol de cada servicio y del frontend.
 *
 * Por que afuera y no dentro de cada servicio:
 *   - `backend/users-service/tsconfig.json` no declara `include`, asi que
 *     compila TODO lo que encuentre: un spec adentro terminaba emitido en
 *     `dist/` y corria el layout del build de produccion.
 *   - `frontend/tsconfig.json` incluye `**\/*.ts`, asi que un spec adentro
 *     entraba al type-check de `next build` y solo compilaba si @types/jest
 *     estaba resuelto — atando el build de produccion al workspace de test.
 * Con los tests afuera, ni `nest build` ni `next build` los ven.
 *
 * La contrapartida es la resolucion de modulos: un spec en `tests/` resuelve
 * `@nestjs/common` contra el node_modules de la RAIZ, no el del servicio. Para
 * los DTOs eso seria fatal (metadata de decoradores en registries distintos y
 * verde falso), por eso `tests/support/validation.ts` carga el ValidationPipe
 * del propio servicio via createRequire. Ver el comentario de ese archivo.
 */
const tsJest = [
  'ts-jest',
  {
    tsconfig: {
      target: 'ES2021',
      module: 'CommonJS',
      moduleResolution: 'node',
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      strictNullChecks: false,
      skipLibCheck: true,
      resolveJsonModule: true,
      jsx: 'react-jsx',
      isolatedModules: true,
    },
    diagnostics: { warnOnly: true },
  },
];

const base = {
  preset: undefined,
  testEnvironment: 'node',
  transform: { '^.+\.(t|j)sx?$': tsJest },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  clearMocks: true,
  // frontend/.next/standalone copia package.json y choca con haste-map.
  modulePathIgnorePatterns: ['<rootDir>/frontend/.next/'],
};

module.exports = {
  projects: [
    {
      ...base,
      displayName: 'contracts',
      rootDir: __dirname,
      testMatch: ['<rootDir>/tests/backend/**/*.dto.spec.ts'],
    },
    {
      ...base,
      displayName: 'authz',
      rootDir: __dirname,
      testMatch: [
        '<rootDir>/tests/backend/**/*.authz.spec.ts',
        '<rootDir>/tests/backend/gateway/*.spec.ts',
      ],
    },
    {
      ...base,
      displayName: 'frontend',
      rootDir: __dirname,
      // Los tests del front viven FUERA de frontend/ a proposito: el
      // tsconfig del frontend incluye "**/*.ts", asi que un spec adentro
      // entraria al type-check de `next build` y solo compilaria si
      // @types/jest estuviera resuelto — atando el build de produccion al
      // workspace de test. Desde aca, `next build` es independiente.
      testMatch: ['<rootDir>/tests/frontend/**/*.spec.ts'],
      moduleNameMapper: { '^@/(.*)$': '<rootDir>/frontend/$1' },
    },
  ],
};
