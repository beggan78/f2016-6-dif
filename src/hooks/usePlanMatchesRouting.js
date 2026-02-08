import { createPathRoutingHook } from './createPathRoutingHook';
import { VIEWS } from '../constants/viewConstants';

export const usePlanMatchesRouting = createPathRoutingHook({
  path: '/plan',
  navigateTarget: VIEWS.TEAM_MATCHES,
  activeViews: [VIEWS.TEAM_MATCHES, VIEWS.PLAN_MATCHES],
  hookName: 'usePlanMatchesRouting',
});
