import { create } from 'zustand'

const defaultTransform = { flip: false, zoom: 0, speed: 1 }
const defaultAudio = { pitch: 0, bass: 0, mid: 0, treble: 0, mute: false }
const defaultColor = { brightness: 0, contrast: 0, saturation: 0 }
const defaultExportSettings = { profile: 'same', crf: null, reduction: null }
const defaultProcessing = { status: 'idle', progress: 0, stage: '', error: null }

export const useEditorStore = create((set, get) => ({
  file: null,
  fileURL: null,
  duration: 0,

  activeTab: 'transform',
  sheetExpanded: false,

  transform: { ...defaultTransform },
  audio: { ...defaultAudio },
  color: { ...defaultColor },
  exportSettings: { ...defaultExportSettings },

  processing: { ...defaultProcessing },
  result: null,

  loadFile: (file) => {
    const prevURL = get().fileURL
    if (prevURL) URL.revokeObjectURL(prevURL)
    set({
      file,
      fileURL: URL.createObjectURL(file),
      duration: 0,
      transform: { ...defaultTransform },
      audio: { ...defaultAudio },
      color: { ...defaultColor },
      exportSettings: { ...defaultExportSettings },
      processing: { ...defaultProcessing },
      result: null,
      activeTab: 'transform',
      sheetExpanded: false,
    })
  },

  reset: () => {
    const { fileURL, result } = get()
    if (fileURL) URL.revokeObjectURL(fileURL)
    if (result?.url) URL.revokeObjectURL(result.url)
    set({
      file: null,
      fileURL: null,
      duration: 0,
      transform: { ...defaultTransform },
      audio: { ...defaultAudio },
      color: { ...defaultColor },
      exportSettings: { ...defaultExportSettings },
      processing: { ...defaultProcessing },
      result: null,
      activeTab: 'transform',
      sheetExpanded: false,
    })
  },

  setDuration: (duration) => set({ duration }),
  setActiveTab: (tab) => set({ activeTab: tab, sheetExpanded: true }),
  setSheetExpanded: (expanded) => set({ sheetExpanded: expanded }),

  updateTransform: (partial) => set((s) => ({ transform: { ...s.transform, ...partial } })),
  updateAudio: (partial) => set((s) => ({ audio: { ...s.audio, ...partial } })),
  updateColor: (partial) => set((s) => ({ color: { ...s.color, ...partial } })),

  setExportProfile: (profile) =>
    set((s) => ({ exportSettings: { ...s.exportSettings, profile, crf: null, reduction: null } })),
  setCrf: (crf) => set((s) => ({ exportSettings: { ...s.exportSettings, crf } })),
  setReduction: (reduction) => set((s) => ({ exportSettings: { ...s.exportSettings, reduction } })),

  resetEdits: () =>
    set({ transform: { ...defaultTransform }, audio: { ...defaultAudio }, color: { ...defaultColor } }),

  setProcessing: (partial) => set((s) => ({ processing: { ...s.processing, ...partial } })),
  setResult: (result) => set({ result }),

  hasEdits: () => {
    const { transform, audio, color } = get()
    return (
      transform.flip ||
      transform.zoom !== 0 ||
      transform.speed !== 1 ||
      audio.pitch !== 0 ||
      audio.bass !== 0 ||
      audio.mid !== 0 ||
      audio.treble !== 0 ||
      audio.mute ||
      color.brightness !== 0 ||
      color.contrast !== 0 ||
      color.saturation !== 0
    )
  },
}))
