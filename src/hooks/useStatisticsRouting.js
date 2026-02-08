import { createPathRoutingHook } from './createPathRoutingHook';
import { VIEWS } from '../constants/viewConstants';

export const useStatisticsRouting = createPathRoutingHook({
  path: '/stats',
  navigateTarget: VIEWS.STATISTICS,
  hookName: 'useStatisticsRouting',
});
