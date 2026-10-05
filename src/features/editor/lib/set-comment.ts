/** Whether a set's comment row is drawn: always when it has a comment,
 *  otherwise only while its exercise is in "Comentar series" mode. */
export const showsSetComment = (
  notes: string | undefined,
  commentsEditing: boolean,
  isReadOnly: boolean,
) => !!notes?.trim() || (commentsEditing && !isReadOnly);
