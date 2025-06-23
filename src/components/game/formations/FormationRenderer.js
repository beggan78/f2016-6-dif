import React from 'react';
import { FORMATION_TYPES } from '../../../constants/playerConstants';
import { PairsFormation } from './PairsFormation';
import { IndividualFormation } from './IndividualFormation';

export function FormationRenderer({ formationType, ...props }) {
  if (formationType === FORMATION_TYPES.PAIRS_7) {
    return <PairsFormation {...props} />;
  } else if (
    formationType === FORMATION_TYPES.INDIVIDUAL_6 || 
    formationType === FORMATION_TYPES.INDIVIDUAL_7
  ) {
    return <IndividualFormation formationType={formationType} {...props} />;
  }

  return <div>Unsupported formation type: {formationType}</div>;
}