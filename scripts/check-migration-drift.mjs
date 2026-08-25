#!/usr/bin/env node
/**
 * Chequeo de DERIVA DE MIGRACIONES, por servicio.
 *
 * Responde una sola pregunta: si aplico TODAS las migraciones versionadas sobre
 * una base vacia, ¿queda igual a lo que declara schema.prisma?
 *
 * Si no queda igual, hay deriva: alguien edito el schema y no genero la
 * migracion. En local no se nota (la base ya tiene la columna porque se corrio
 * `db push` alguna vez), pero en un despliegue limpio el servicio arranca roto.
 * Exactamente asi se rompieron auth-service y assets-service en produccion:
 * faltaban la migracion de los campos de reset de password y la de
 * cover_image_url.
 *
 * Implementacion: `prisma migrate diff --from-migrations --to-schema-datamodel
 * --exit-code`, que devuelve 2 cuando hay diferencias.
 *
 * Requiere una base de datos shadow (Prisma la crea y la descarta): se toma de
 * SHADOW_DATABASE_URL, o se arma una por servicio a partir de DATABASE_URL_BASE.
 *
 * Uso:
 *   node scripts/check-migration-drift.mjs            # todos los servicios
 *   node scripts/check-migration-drift.mjs assets-service auth-service
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR_BACKEND = join(RAIZ, 'backend');

const BASE_POR_DEFECTO =
  process.env.DATABASE_URL_BASE || 'postgresql://postgres:postgres@localhost:5432';

/** Servicios que tienen prisma/schema.prisma. */
function descubrirServicios() {
  return readdirSync(DIR_BACKEND, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((nombre) => existsSync(join(DIR_BACKEND, nombre, 'prisma', 'schema.prisma')))
    .sort();
}

function urlShadow(servicio) {
  if (process.env.SHADOW_DATABASE_URL) return process.env.SHADOW_DATABASE_URL;
  // Una shadow por servicio para poder correrlos en paralelo sin pisarse.
  const nombre = `shadow_${servicio.replace(/-/g, '_')}`;
  return `${BASE_POR_DEFECTO}/${nombre}`;
}

/**
 * Se resuelve el ENTRYPOINT JS de prisma, no el shim de node_modules/.bin.
 * En Windows el shim es un .cmd y Node >=20 se niega a spawnearlo sin shell;
 * con shell habria que citar los argumentos a mano. Invocarlo con el mismo
 * node que corre este script es portable y no depende de PATH.
 */
function entrypointPrisma(servicio) {
  const entry = join(
    DIR_BACKEND, servicio, 'node_modules', 'prisma', 'build', 'index.js',
  );
  return existsSync(entry) ? entry : null;
}

/**
 * Prisma NO crea la base shadow: espera que exista y administra los esquemas
 * adentro. Se crea acá de forma idempotente (si ya existe, Postgres tira error
 * y se ignora) conectándose a la base de mantenimiento `postgres`.
 */
function asegurarShadowDb(servicio, prisma, dirServicio) {
  if (process.env.SHADOW_DATABASE_URL) return; // La provee quien invoca (p. ej. CI).
  const nombre = `shadow_${servicio.replace(/-/g, '_')}`;
  try {
    execFileSync(
      process.execPath,
      [prisma, 'db', 'execute', '--url', `${BASE_POR_DEFECTO}/postgres`, '--stdin'],
      {
        cwd: dirServicio,
        input: `CREATE DATABASE ${nombre};`,
        stdio: 'pipe',
        encoding: 'utf8',
      },
    );
  } catch {
    // Ya existe (42P04) o no hay permisos. Si de verdad no se puede, el diff
    // que viene despues falla con un mensaje mucho mas claro que este.
  }
}

function chequear(servicio) {
  const dirServicio = join(DIR_BACKEND, servicio);
  const migraciones = join(dirServicio, 'prisma', 'migrations');
  const schema = join(dirServicio, 'prisma', 'schema.prisma');

  if (!existsSync(migraciones)) {
    return { servicio, estado: 'SIN_MIGRACIONES', detalle: 'No existe prisma/migrations/' };
  }

  const prisma = entrypointPrisma(servicio);
  if (!prisma) {
    return {
      servicio,
      estado: 'ERROR',
      detalle: 'Falta el CLI de prisma. Corre npm install en el servicio.',
    };
  }

  asegurarShadowDb(servicio, prisma, dirServicio);

  const args = [
    prisma,
    'migrate',
    'diff',
    '--from-migrations',
    migraciones,
    '--to-schema-datamodel',
    schema,
    '--shadow-database-url',
    urlShadow(servicio),
    '--exit-code',
  ];

  try {
    execFileSync(process.execPath, args, {
      cwd: dirServicio,
      stdio: 'pipe',
      encoding: 'utf8',
      env: { ...process.env },
    });
    return { servicio, estado: 'OK', detalle: 'Las migraciones reproducen el schema.' };
  } catch (err) {
    const salida = `${err.stdout || ''}${err.stderr || ''}`.trim();
    // exit 2 = hay diferencias. Cualquier otro codigo es un fallo de ejecucion
    // (no se pudo conectar a la shadow, etc.) y NO debe reportarse como "sin deriva".
    if (err.status === 2) {
      return { servicio, estado: 'DERIVA', detalle: salida };
    }
    return {
      servicio,
      estado: 'ERROR',
      detalle: salida || `prisma termino con codigo ${err.status}`,
    };
  }
}

const pedidos = process.argv.slice(2);
const servicios = pedidos.length ? pedidos : descubrirServicios();

console.log('Deriva de migraciones — Da Vinci Inventa');
console.log(`Shadow DB base: ${BASE_POR_DEFECTO}\n`);

const resultados = servicios.map((s) => {
  process.stdout.write(`  ${s.padEnd(20)} ... `);
  const r = chequear(s);
  console.log(r.estado);
  return r;
});

const problemas = resultados.filter((r) => r.estado !== 'OK' && r.estado !== 'SIN_MIGRACIONES');

if (problemas.length) {
  console.log('\n──────────────────────────────────────────────');
  for (const p of problemas) {
    console.log(`\n[${p.estado}] ${p.servicio}`);
    console.log(p.detalle);
    if (p.estado === 'DERIVA') {
      console.log(
        `\n  Fix: cd backend/${p.servicio} && npx prisma migrate dev --name <descripcion>`,
      );
    }
  }
  console.log('\n──────────────────────────────────────────────');
  console.log(`\n${problemas.length} servicio(s) con problemas.`);
  process.exit(1);
}

console.log('\nSin deriva: cada schema.prisma se reproduce desde sus migraciones.');
