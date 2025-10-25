import { calculateRemovePlayerFromNextToGoOff, calculateSetPlayerAsNextToGoOff } from '../gameStateLogic';
import { PLAYER_ROLES, PLAYER_STATUS } from '../../../constants/playerConstants';
import { PAIRED_ROLE_STRATEGY_TYPES, SUBSTITUTION_TYPES } from '../../../constants/teamConfiguration';

const createPlayer = (id, status = PLAYER_STATUS.ON_FIELD) => ({
  id,
  name: id,
  stats: {
    isInactive: false,
    currentStatus: status,
    currentRole: status === PLAYER_STATUS.SUBSTITUTE ? PLAYER_ROLES.SUBSTITUTE : PLAYER_ROLES.DEFENDER,
    currentPairKey: null,
    timeOnFieldSeconds: 0
  }
});

const buildGameState = () => {
  const allPlayers = [
    createPlayer('f1'),
    createPlayer('f2'),
    createPlayer('f3'),
    createPlayer('f4'),
    createPlayer('s1', PLAYER_STATUS.SUBSTITUTE),
    createPlayer('s2', PLAYER_STATUS.SUBSTITUTE),
    createPlayer('s3', PLAYER_STATUS.SUBSTITUTE),
    createPlayer('s4', PLAYER_STATUS.SUBSTITUTE)
  ];

  return {
    formation: {
      goalie: 'g1',
      leftDefender: 'f1',
      rightDefender: 'f2',
      leftAttacker: 'f3',
      rightAttacker: 'f4',
      substitute_1: 's1',
      substitute_2: 's2',
      substitute_3: 's3',
      substitute_4: 's4'
    },
    rotationQueue: ['f1', 'f3', 'f2', 'f4', 's1', 's2', 's3', 's4'],
    teamConfig: {
      format: '5v5',
      squadSize: 9,
      formation: '2-2',
      substitutionType: SUBSTITUTION_TYPES.INDIVIDUAL,
      pairedRoleStrategy: PAIRED_ROLE_STRATEGY_TYPES.KEEP_THROUGHOUT_PERIOD
    },
    allPlayers
  };
};

describe('gameStateLogic paired rotation helpers', () => {
  it('moves both players in a pair to the front when setting next to go off', () => {
    const state = buildGameState();

    const result = calculateSetPlayerAsNextToGoOff(state, 'f3', 2);

    expect(result.rotationQueue.slice(0, 2)).toEqual(['f1', 'f3']);
    expect(result.playersToHighlight).toEqual(['f1', 'f3']);
  });

  it('moves the entire pair after the next group when removing from next to go off', () => {
    const state = buildGameState();

    const result = calculateRemovePlayerFromNextToGoOff(state, 'f1', 2);

    expect(result.rotationQueue.slice(0, 4)).toEqual(['f2', 'f4', 'f1', 'f3']);
    expect(result.playersToHighlight).toEqual(['f1', 'f3']);
  });
});
