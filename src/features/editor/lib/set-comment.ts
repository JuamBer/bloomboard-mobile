/** Whether a set's comment row is drawn: always when it has a comment — or,
 *  in a workout being logged, when the plan has one, shown as its
 *  placeholder — otherwise only while its exercise is in "Comentar series"
 *  mode. A finished workout read as a record shows only what was written
 *  (app 2.6.0; the web still shows the plan's there). */
export const showsSetComment = (
  set: { notes?: string; planNotes?: string | null },
  commentsEditing: boolean,
  isReadOnly: boolean,
) =>
  !!set.notes?.trim() ||
  (!!set.planNotes?.trim() && !isReadOnly) ||
  (commentsEditing && !isReadOnly);
