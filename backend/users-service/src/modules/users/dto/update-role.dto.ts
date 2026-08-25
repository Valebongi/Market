import { IsIn } from 'class-validator';
import { USER_ROLES } from './create-profile.dto';

/** Body de `PATCH /users/:userId/role` (solo admin). */
export class UpdateRoleDto {
  @IsIn(USER_ROLES)
  role: (typeof USER_ROLES)[number];
}
