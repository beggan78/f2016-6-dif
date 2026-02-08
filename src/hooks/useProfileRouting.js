import { createPathRoutingHook } from './createPathRoutingHook';
import { VIEWS } from '../constants/viewConstants';

export const useProfileRouting = createPathRoutingHook({
  path: '/profile',
  navigateTarget: VIEWS.PROFILE,
  hookName: 'useProfileRouting',
});
