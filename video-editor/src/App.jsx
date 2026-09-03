import { useEditorStore } from './store/useEditorStore'
import UploadScreen from './components/UploadScreen'
import EditorScreen from './components/EditorScreen'

export default function App() {
  const file = useEditorStore((s) => s.file)
  return file ? <EditorScreen /> : <UploadScreen />
}
