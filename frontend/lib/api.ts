/**
 * @deprecated Importá directamente desde @/services/* o @/types
 * Este archivo es un barrel de compatibilidad temporal.
 */
export { apiFetch, ApiError } from "@/lib/http";
export type { FetchOptions } from "@/lib/http";

export { authService as authApi } from "@/services/auth.service";
export { assetsService as assetsApi, mapAsset } from "@/services/assets.service";
export { requestsService as requestsApi } from "@/services/requests.service";
export { domainsService as domainsApi } from "@/services/domains.service";
export { usersService as usersApi } from "@/services/users.service";

export type { AuthUser } from "@/types";
