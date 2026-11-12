export type IconName = string;

export interface DuotonePathDef {
  tone?: string;
  stroke: string;
}

export const ICON_PATHS: Record<string, DuotonePathDef> = {
  shieldCheck: {
    tone: '<path d="M40,114.79V56a8,8,0,0,1,8-8H208a8,8,0,0,1,8,8v58.77c0,84.18-71.31,111.87-85.54,116.57a7.54,7.54,0,0,1-4.92,0C111.31,226.66,40,199,40,114.79Z" opacity="0.22"/>',
    stroke:
      '<path d="M208,48H48a8,8,0,0,0-8,8v58.77c0,84.18,71.31,111.87,85.54,116.57a7.54,7.54,0,0,0,4.92,0C144.69,226.66,216,199,216,114.79V56A8,8,0,0,0,208,48Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><polyline points="88 136 112 160 168 104" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/>',
  },
  chatText: {
    tone: '<path d="M45.15,230.11A8,8,0,0,1,32,224V64a16,16,0,0,1,16-16H208a16,16,0,0,1,16,16V192a16,16,0,0,1-16,16H80Z" opacity="0.22"/>',
    stroke:
      '<path d="M45.15,230.11A8,8,0,0,1,32,224V64a16,16,0,0,1,16-16H208a16,16,0,0,1,16,16V192a16,16,0,0,1-16,16H80Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><line x1="96" y1="112" x2="160" y2="112" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><line x1="96" y1="144" x2="160" y2="144" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/>',
  },
  warningCircle: {
    tone: '<circle cx="128" cy="128" r="96" opacity="0.22"/>',
    stroke:
      '<circle cx="128" cy="128" r="96" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="18"/><line x1="128" y1="80" x2="128" y2="136" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><circle cx="128" cy="172" r="14"/>',
  },
  checkSquareOffset: {
    tone: '<rect x="40" y="40" width="176" height="176" rx="16" opacity="0.22"/>',
    stroke:
      '<path d="M40,144V56A16,16,0,0,1,56,40H200a16,16,0,0,1,16,16V200a16,16,0,0,1-16,16H136" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><polyline points="40 192 64 216 120 160" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/>',
  },
  lockKey: {
    tone: '<rect x="40" y="88" width="176" height="128" rx="12" opacity="0.22"/>',
    stroke:
      '<rect x="40" y="88" width="176" height="128" rx="12" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><circle cx="128" cy="140" r="20" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><line x1="128" y1="160" x2="128" y2="184" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><path d="M88,88V56a40,40,0,0,1,80,0V88" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/>',
  },
  envelopeSimple: {
    tone: '<polygon points="224 56 128 144 32 56 224 56" opacity="0.22"/>',
    stroke:
      '<path d="M32,56H224a0,0,0,0,1,0,0V192a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V56A0,0,0,0,1,32,56Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><polyline points="224 56 128 144 32 56" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/>',
  },
  key: {
    tone: '<path d="M160,16a80.07,80.07,0,0,0-76.09,104.78L26.34,178.34A8,8,0,0,0,24,184v40a8,8,0,0,0,8,8H72a8,8,0,0,0,8-8V200h24a8,8,0,0,0,8-8V168h16.66l6.56-6.56A80,80,0,1,0,160,16Zm20,76a16,16,0,1,1,16-16A16,16,0,0,1,180,92Z" opacity="0.22"/>',
    stroke:
      '<path d="M93.17,122.83A80,80,0,1,1,133.17,162.83l-13.17,13.17H96v24H72v24H32V184Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><circle cx="180" cy="76" r="14"/>',
  },
  graduationCap: {
    tone: '<polygon points="8 96 128 32 248 96 128 160 8 96" opacity="0.22"/>',
    stroke:
      '<polygon points="8 96 128 32 248 96 128 160 8 96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><polyline points="184 240 184 129.87 128 96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><path d="M216,113.07v53.22a8,8,0,0,1-2,5.31c-11.3,12.59-38.9,36.4-86,36.4s-74.68-23.81-86-36.4a8,8,0,0,1-2-5.31V113.07" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/>',
  },
  usersThree: {
    tone: '<circle cx="128" cy="144" r="40" opacity="0.22"/>',
    stroke:
      '<circle cx="128" cy="144" r="40" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><path d="M72,216a65,65,0,0,1,112,0" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><path d="M161,80a32,32,0,1,1,31,40" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><path d="M64,120a32,32,0,1,1,31-40" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/>',
  },
  identificationBadge: {
    tone: '<rect x="48" y="32" width="160" height="192" rx="12" opacity="0.22"/>',
    stroke:
      '<rect x="48" y="32" width="160" height="192" rx="12" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><circle cx="128" cy="136" r="32" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><path d="M80,192a60,60,0,0,1,96,0" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><line x1="96" y1="64" x2="160" y2="64" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/>',
  },
  squaresFour: {
    tone: '<rect x="48" y="48" width="64" height="64" rx="8" opacity="0.22"/><rect x="144" y="144" width="64" height="64" rx="8" opacity="0.22"/>',
    stroke:
      '<rect x="48" y="48" width="64" height="64" rx="8" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><rect x="144" y="48" width="64" height="64" rx="8" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><rect x="48" y="144" width="64" height="64" rx="8" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><rect x="144" y="144" width="64" height="64" rx="8" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/>',
  },
  plusCircle: {
    tone: '<circle cx="128" cy="128" r="96" opacity="0.22"/>',
    stroke:
      '<circle cx="128" cy="128" r="96" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="18"/><line x1="88" y1="128" x2="168" y2="128" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><line x1="128" y1="88" x2="128" y2="168" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/>',
  },
  folderOpen: {
    tone: '<path d="M32,80V64a8,8,0,0,1,8-8H93.33a8,8,0,0,1,4.8,1.6L128,80h72a8,8,0,0,1,8,8v24H32Z" opacity="0.22"/>',
    stroke:
      '<path d="M32,208V64a8,8,0,0,1,8-8H93.33a8,8,0,0,1,4.8,1.6L128,80h72a8,8,0,0,1,8,8v24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><path d="M32,208l30.06-90.19A8,8,0,0,1,69.65,112H232a8,8,0,0,1,7.59,10.53L211.09,208Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/>',
  },
  calendarCheck: {
    tone: '<rect x="40" y="40" width="176" height="48" opacity="0.22"/>',
    stroke:
      '<rect x="40" y="40" width="176" height="176" rx="12" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><line x1="176" y1="24" x2="176" y2="56" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><line x1="80" y1="24" x2="80" y2="56" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><line x1="40" y1="88" x2="216" y2="88" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><polyline points="92 152 116 176 164 128" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/>',
  },
  phoneCall: {
    tone: '<path d="M159.4,40A80.1,80.1,0,0,1,216,96.6" opacity="0.22"/>',
    stroke:
      '<path d="M92.5,124.8a83.6,83.6,0,0,0,39,38.9,8,8,0,0,0,7.9-.6l25-16.7a7.9,7.9,0,0,1,7.6-.7l46.8,20.1a7.9,7.9,0,0,1,4.8,8.3A48,48,0,0,1,176,216,136,136,0,0,1,40,80,48,48,0,0,1,81.9,32.4a7.9,7.9,0,0,1,8.3,4.8l20.1,46.9a8,8,0,0,1-.6,7.5L93,117A8,8,0,0,0,92.5,124.8Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><path d="M159.4,40A80.1,80.1,0,0,1,216,96.6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><path d="M151.1,70.9a47.9,47.9,0,0,1,34,34" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/>',
  },
  clockCountdown: {
    tone: '<circle cx="128" cy="128" r="88" opacity="0.22"/>',
    stroke:
      '<circle cx="128" cy="128" r="88" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><polyline points="128 72 128 128 176 128" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/>',
  },
  chartBar: {
    tone: '<rect x="156" y="40" width="44" height="168" opacity="0.22"/>',
    stroke:
      '<line x1="228" y1="208" x2="28" y2="208" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><polyline points="100 208 100 88 156 88" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><rect x="156" y="40" width="44" height="168" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><polyline points="44 208 44 136 100 136" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/>',
  },
  gearSix: {
    tone: '<circle cx="128" cy="128" r="44" opacity="0.22"/>',
    stroke:
      '<circle cx="128" cy="128" r="44" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><line x1="128" y1="24" x2="128" y2="56" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><line x1="128" y1="200" x2="128" y2="232" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><line x1="24" y1="128" x2="56" y2="128" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><line x1="200" y1="128" x2="232" y2="128" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/>',
  },
  paperPlaneTilt: {
    tone: '<polygon points="216 40 24 116 116 140 140 232 216 40" opacity="0.22"/>',
    stroke:
      '<polygon points="216 40 24 116 116 140 140 232 216 40" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><line x1="116" y1="140" x2="216" y2="40" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/>',
  },
  clipboardText: {
    tone: '<rect x="48" y="40" width="160" height="184" rx="12" opacity="0.22"/>',
    stroke:
      '<rect x="48" y="40" width="160" height="184" rx="12" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><line x1="96" y1="120" x2="160" y2="120" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><line x1="96" y1="160" x2="160" y2="160" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/>',
  },
  identificationCard: {
    tone: '<rect x="32" y="48" width="192" height="160" rx="12" opacity="0.22"/>',
    stroke:
      '<rect x="32" y="48" width="192" height="160" rx="12" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><circle cx="92" cy="120" r="24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><line x1="144" y1="108" x2="192" y2="108" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><line x1="144" y1="140" x2="192" y2="140" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/>',
  },
  notebook: {
    tone: '<rect x="48" y="32" width="160" height="192" rx="12" opacity="0.22"/>',
    stroke:
      '<rect x="48" y="32" width="160" height="192" rx="12" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><line x1="112" y1="104" x2="168" y2="104" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><line x1="112" y1="144" x2="168" y2="144" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><line x1="80" y1="32" x2="80" y2="224" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/>',
  },
  hourglassMedium: {
    tone: '<polygon points="64 40 192 40 128 128 64 40" opacity="0.22"/>',
    stroke:
      '<polygon points="64 40 192 40 128 128 64 40" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><polygon points="64 216 192 216 128 128 64 216" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/>',
  },
  bookOpenText: {
    tone: '<path d="M128,88a32,32,0,0,1,32-32h64V192H160a32,32,0,0,0-32,32Z" opacity="0.22"/>',
    stroke:
      '<path d="M128,88a32,32,0,0,1,32-32h64V192H160a32,32,0,0,0-32,32" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/><path d="M24,192H96a32,32,0,0,1,32,32V88A32,32,0,0,0,96,56H24Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="18"/>',
  },
};
