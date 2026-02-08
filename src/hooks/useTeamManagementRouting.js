import { createPathRoutingHook } from './createPathRoutingHook';
import { VIEWS } from '../constants/viewConstants';

export const useTeamManagementRouting = createPathRoutingHook({
  path: '/team',
  navigateTarget: VIEWS.TEAM_MANAGEMENT,
  hookName: 'useTeamManagementRouting',
});
