import { useLocalSearchParams } from 'expo-router';
import { TemplateScreen } from '@features/editor/TemplateScreen';

// A routine; `entry` scrolls to one of its exercises ("Dónde lo usas"),
// `edit` opens it with the editor on (just created).
export default function TemplateRoute() {
  const { templateId, entry, edit } = useLocalSearchParams<{
    templateId: string;
    entry?: string;
    edit?: string;
  }>();
  return (
    <TemplateScreen
      key={templateId}
      templateId={templateId}
      entryId={entry}
      startEditing={edit === '1'}
    />
  );
}
