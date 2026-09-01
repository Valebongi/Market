import { IsIn, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * Body de `POST /auth/oauth/callback`.
 *
 * QUE CAMBIO Y POR QUE NO HAY COMPATIBILIDAD HACIA ATRAS
 * Este DTO aceptaba `{ provider, providerId, email, name }`: la identidad venia
 * como datos crudos del cliente y auth-service emitia un accessToken confiando
 * en ellos. Mandar el email de otro alcanzaba para llevarse su sesion (hallazgo
 * A-1 de la auditoria; por eso el gateway tiene la ruta cerrada).
 *
 * El shape viejo NO se sigue aceptando. Mantenerlo "por compatibilidad" seria
 * dejar la puerta vulnerable abierta al lado de la nueva: un atacante elige
 * cual usar, y siempre elige la que no verifica nada. Un endpoint de login con
 * dos caminos, uno verificado y otro no, tiene exactamente la seguridad del no
 * verificado.
 *
 * Ahora llega el ID token entero y `GoogleIdTokenService` lo verifica
 * server-side (firma contra el JWKS de Google, iss, aud contra nuestro
 * GOOGLE_CLIENT_ID, exp, email_verified). La identidad deja de ser un input y
 * pasa a ser el resultado de esa verificacion.
 *
 * Este DTO solo valida la FORMA del sobre. La AUTENTICIDAD la establece el
 * verificador, que es donde tiene que estar.
 */
export class OAuthCallbackDto {
  /**
   * Solo `google`. El flujo de GitHub usaba este mismo endpoint con el shape
   * viejo (lo llama `frontend/app/api/auth/github/callback/route.ts` despues de
   * intercambiar el code server-side), asi que hereda la misma falla: el
   * endpoint no puede distinguir a nuestro route handler de cualquier otro
   * cliente. Queda fuera a proposito, con un 400 explicito, hasta que el
   * intercambio del code viva en auth-service. Un 400 claro es preferible a un
   * camino que anda pero es forjable.
   */
  @IsIn(['google'], {
    message:
      'provider debe ser "google". El login con GitHub esta deshabilitado hasta que el ' +
      'intercambio del code se haga dentro de auth-service.',
  })
  provider: string;

  /**
   * El ID token JWT que entrega Google Identity Services, TAL CUAL: el campo
   * `credential` del callback de `google.accounts.id`. El frontend no debe
   * decodificarlo, ni extraerle claims, ni mandar nada mas.
   *
   * `Matches` valida solo que sea un JWS compacto (tres segmentos base64url).
   * El limite de 8 KB corta basura grande antes del parseo; un ID token de
   * Google pesa alrededor de 1 KB.
   */
  @IsString()
  @MinLength(20)
  @MaxLength(8192)
  @Matches(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/, {
    message: 'credential debe ser el ID token de Google sin modificar',
  })
  credential: string;
}
