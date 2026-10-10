/** Whether a set's comment row is drawn: always when it has a comment — or,
 *  in a workout, when the plan has one, shown as its placeholder — otherwise
 *  only while its exercise is in "Comentar series" mode. */
export const showsSetComment = (
  set: { notes?: string; planNotes?: string | null },
  commentsEditing: boolean,
  isReadOnly: boolean,
) =>
  !!set.notes?.trim() ||
  !!set.planNotes?.trim() ||
  (commentsEditing && !isReadOnly);
