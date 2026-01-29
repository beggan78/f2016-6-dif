export const areMatchListsEqual = (left, right) => {
  if (left === right) return true;
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    const leftMatch = left[index];
    const rightMatch = right[index];
    if (!leftMatch || !rightMatch) return false;
    if (String(leftMatch.id) !== String(rightMatch.id)) return false;
    if (leftMatch.opponent !== rightMatch.opponent) return false;
    if (leftMatch.matchDate !== rightMatch.matchDate) return false;
    if (leftMatch.matchTime !== rightMatch.matchTime) return false;
  }
  return true;
};

export const areSelectionMapsEqual = (left, right) => {
  if (left === right) return true;
  const leftKeys = Object.keys(left || {});
  const rightKeys = Object.keys(right || {});
  if (leftKeys.length !== rightKeys.length) return false;
  for (const key of leftKeys) {
    if (!Object.prototype.hasOwnProperty.call(right || {}, key)) return false;
    const leftValues = Array.isArray(left[key]) ? left[key] : [];
    const rightValues = Array.isArray(right[key]) ? right[key] : [];
    if (leftValues.length !== rightValues.length) return false;
    for (let index = 0; index < leftValues.length; index += 1) {
      if (String(leftValues[index]) !== String(rightValues[index])) return false;
    }
  }
  return true;
};

export const areStatusMapsEqual = (left, right) => {
  if (left === right) return true;
  const leftKeys = Object.keys(left || {});
  const rightKeys = Object.keys(right || {});
  if (leftKeys.length !== rightKeys.length) return false;
  for (const key of leftKeys) {
    if (!Object.prototype.hasOwnProperty.call(right || {}, key)) return false;
    if (left[key] !== right[key]) return false;
  }
  return true;
};

export const areIdListsEqual = (left, right) => {
  if (left === right) return true;
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (String(left[index]) !== String(right[index])) return false;
  }
  return true;
};
