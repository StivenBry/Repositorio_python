import Header from './Header'
import VideoPreview from './VideoPreview'
import BottomSheet from './BottomSheet'
import ProcessingOverlay from './ProcessingOverlay'
import ResultOverlay from './ResultOverlay'

export default function EditorScreen() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-neutral-950">
      <Header />
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <VideoPreview />
        <BottomSheet />
        <ProcessingOverlay />
        <ResultOverlay />
      </div>
    </div>
  )
}
