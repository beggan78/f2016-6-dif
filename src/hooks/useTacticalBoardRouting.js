import { createPathRoutingHook } from './createPathRoutingHook';
import { VIEWS } from '../constants/viewConstants';

export const useTacticalBoardRouting = createPathRoutingHook({
  path: '/tactics',
  navigateTarget: VIEWS.TACTICAL_BOARD,
  hookName: 'useTacticalBoardRouting',
});
