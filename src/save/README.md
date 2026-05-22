Save layer: schema, serializer, store, initial state, autosave.

- `schema.ts` (M2.2): re-export of SaveStateV1.
- `Serializer.ts` (M2.2): serialize / deserialize (returns null on failure).
- `SaveStore.ts` (M2.3): localStorage wrappers using CONSTANTS.SAVE_KEY.
- `InitialState.ts` (M2.3): createInitialState() for first run.
- `Autosave.ts` (M2.4): startAutosave (registers tick handler) + flushSave (immediate).
