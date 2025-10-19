Multi-Sub Pair Rotation Plan
============================

Overview
--------
- Extend the 5v5 / 2-2 individual substitution flow so that when `SUB 2 PLAYERS` is active, rotations behave like existing pair mode (keep or swap roles) across squad sizes 7, 9, and 11.
- Preserve the current pairs substitution mode; new behaviour must coexist without breaking existing pair code paths or analytics.
- Focus on queue ordering and role assignments immediately when two players leave the field so paired behaviour is preserved for the rest of the period.

Key Decisions & Concepts
------------------------
- **Unified role rotation flag:** Replace the pairs-only `pairedRoleStrategy` with a more general `pairedRoleStrategy` (same value set: keep/swap). Allow it on eligible individual configs (5v5, 2-2, squad size ∈ {7,9,11}); default to “keep” when first enabled.
- **Paired queue abstraction:** Introduce a pure helper (e.g. `pairedRotationManager`) that builds and maintains an ordered list of `{defenderId, attackerId, side}` pairs. Rotation queue remains a flattened representation of this structure.
- **Eligibility guard:** Centralise a `shouldUsePairedRotation(teamConfig, substitutionCount, formation)` helper so logic can opt-in only when all conditions are met (format, formation, count===2, enough active substitutes).
- **Role persistence:** When “keep” is selected, players retain their defender/attacker role on every entry; when “swap” is selected, they alternate roles each time their pair cycles.
- **Manual overrides operate on pairs:** Any UI that promotes/demotes “next to go off” must respect pair boundaries; moving one player moves their partner in lockstep.

Implementation Steps
--------------------
1. **Team configuration & constants**
   - Rename `pairedRoleStrategy` to `pairedRoleStrategy` in `src/constants/teamConfiguration.js` (create config, defaults, validation, format metadata).
   - Update `PAIRED_ROLE_STRATEGY_TYPES/DEFINITIONS` names & exports to represent the general strategy without breaking labels.
   - Extend validation to allow the strategy on eligible individual configurations while keeping it null elsewhere.
   - Refresh unit tests under `src/constants/__tests__/teamConfiguration.test.js` to cover new cases (individual with strategy, invalid combos).

2. **State & persistence plumbing**
   - Update `useTeamConfig`, `createTeamConfigFromSquadSize`, and `createDefaultTeamConfig` to preserve the new property.
   - Ensure persistence layers (`persistenceManager`, `matchStateManager`, `matchConfigurationService`, pending match resume) read/write the renamed field.
   - Adjust any analytics or logging hooks (e.g. console traces) to reference `pairedRoleStrategy`.

3. **Configuration screen UX**
   - Always show the role strategy selector when format=5v5, formation=2-2, squad size ∈ {7,9,11}, regardless of substitution type.
   - Keep the existing individual vs pairs radio for 7-player squads; 9/11 player squads should only expose individual but still surface the role selector.
   - Reuse `PairRoleRotationHelpModal` content but rename copy to reference “pair rotation settings” instead of pairs-only wording.
   - Wire selector changes to call `updateTeamConfig` with the new property and ensure local state defaults to “keep” when first shown.
   - Add component tests to verify visibility & selection behaviour for the new squad sizes.

4. **Eligibility helper & shared metadata**
   - Create a pure utility (e.g. `isPairedRotationEnabled`) in `src/game/utils/pairedRotationUtils.js` that inspects teamConfig, formation, substitutionCount, and active substitutes.
   - Capture static pairing metadata for 2-2 (left/right sides) so logic can consistently map positions to pair keys.

5. **Paired rotation manager**
   - Implement a new pure module that:
     * Builds initial pair queue from formation + rotationQueue (left-side pair first, then right, then bench pairs derived from queue order).
     * Provides methods to update the queue after substitutions, manual reorders, or inactivity changes.
     * Exposes helpers to flatten back to a rotationQueue array and to determine each player’s next target role.
   - Add targeted unit tests confirming pair queue creation for squads of 7, 9, 11 (including odd substitute counts).

6. **Rotation queue lifecycle updates**
   - During `handleStartGame` / `preparePeriodWithGameLog`, initialise the paired queue and ensure the flattened rotation queue begins with the left-side pair (defender, attacker).
   - Update `setRotationQueue` flows and queue utilities (`calculateSetPlayerAsNextToGoOff`, `calculateRemovePlayerFromNextToGoOff`, `calculateSubstituteReorder`) to consult the paired manager when active so two-player groups move together.
   - Adjust `createRotationQueue` consumers to rebuild inactive lists using the paired structure without breaking individual logic for other formations.

7. **Substitution pipeline**
   - Extend `SubstitutionManager.handleIndividualModeSubstitution` to branch into paired behaviour when eligibility helper returns true:
     * Select the two outgoing players via the paired manager instead of simply slicing the queue.
     * Determine incoming players and assign them to `left/right` field positions based on the next pair in queue.
     * For “swap” mode, swap defender/attacker assignments before returning the pair to the substitute pool.
     * Ensure players’ `stats.currentRole` and `stats.currentPairKey` update to reflect their paired side.
   - Return the updated flattened rotation queue from the paired manager so downstream consumers stay in sync.
   - Add new unit tests in `substitutionManager.test.js` for keep/swap scenarios in multi-sub mode.

8. **UI handlers & modal interactions**
   - Update `fieldPositionHandlers` and substitution modal callbacks to treat paired players as an atomic unit when the feature is active (e.g. marking both as “about to sub off”, moving both when set as next).
   - Ensure `createSubstitutionHandlers` uses the paired manager when responding to manual “substitute now” or “set/remove next” actions.

9. **Stats & logging**
   - Confirm substitution event logging records both players with accurate `before/after` formations in multi-sub paired mode.
   - Verify time tracking (`updatePlayerTimeStats` / `resetPlayerStintTimer`) still runs per-player; adjust any role-change logging when swap mode is enabled.

10. **Testing strategy**
    - Unit tests: new helper, paired manager, team config validation, substitution manager.
    - Hook tests: `useGameState` initialisation for different squad sizes ensuring rotation queue ordering and next-player indicators align with expectations.
    - Component tests: Configuration screen visibility, ensuring role strategy persists after resume data load.
    - Integration / snapshot tests: critical substitution flows when `SUB 2 PLAYERS` toggled on, verifying UI indicators remain paired.

11. **Documentation & cleanup**
    - Update relevant documentation (e.g. `CLAUDE.md`, `src/game/README.md`) to describe the new paired multi-sub mode and eligibility rules.
    - Leave TODO markers or follow-up issues about phasing out dedicated pairs mode (outside current scope).

Assumptions & Open Questions
----------------------------
- Players are expected to set `SUB 2 PLAYERS` manually; we will not auto-force the value but may revisit defaulting in future iterations.
- For squads with an odd number of substitutes (e.g. 9 players total), the last bench player will pair with the next available teammate based on rotation order; confirm with product if stricter pairing preferences are desired.
- No legacy persistence compatibility is required; renaming `pairedRoleStrategy` can proceed without migration.
