import { useLocalSearchParams } from 'expo-router';
import { TemplateScreen } from '@features/editor/TemplateScreen';

// A plan; `entry` scrolls to one of its exercises ("Dónde lo usas").
export default function TemplateRoute() {
  const { templateId, entry } = useLocalSearchParams<{
    templateId: string;
    entry?: string;
  }>();
  return (
    <TemplateScreen key={templateId} templateId={templateId} entryId={entry} />
  );
}
