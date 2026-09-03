export const EXPORT_PROFILES = {
  same: {
    id: 'same',
    label: 'Mismo peso',
    description: 'Calidad alta, tamaño similar al original',
    mode: 'crf',
    defaultCrf: 24,
    crfRange: [20, 28],
    audioBitrateKbps: 128,
  },
  optimize: {
    id: 'optimize',
    label: 'Optimizar',
    description: 'Reduce el peso cuidando la calidad',
    mode: 'bitrate',
    defaultReduction: 0.2,
    reductionRange: [0.1, 0.5],
    audioBitrateKbps: 112,
  },
  compress: {
    id: 'compress',
    label: 'Alta compresión',
    description: 'Máxima reducción de peso para compartir rápido',
    mode: 'crf',
    defaultCrf: 30,
    crfRange: [26, 36],
    audioBitrateKbps: 96,
    maxWidth: 1280,
  },
}

export const EXPORT_PROFILE_ORDER = ['same', 'optimize', 'compress']
