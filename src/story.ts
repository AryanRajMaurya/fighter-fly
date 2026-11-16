// Control panel definition — mirrors the original fragment's story.
export interface ControlDef {
  prop: string
  control: 'switch'|'slider'|'segmented'|'number'|'color'
  label: string
  default?: unknown
  min?: number
  max?: number
  step?: number
  options?: string[]
}

export interface SectionDef { title: string; controls: ControlDef[] }

export const STORY: SectionDef[] = [
  {
    "title": "Helpers",
    "controls": [
      {
        "prop": "showHint",
        "control": "switch",
        "label": "Show helpers (how-to-fly line)",
        "default": true
      },
      {
        "prop": "touchControls",
        "control": "segmented",
        "label": "Touch buttons (auto = phones and tablets)",
        "default": "auto",
        "options": [
          "auto",
          "on",
          "off"
        ]
      }
    ]
  },
  {
    "title": "Flight",
    "controls": [
      {
        "prop": "speed",
        "control": "slider",
        "label": "Speed",
        "default": 92,
        "min": 20,
        "max": 220,
        "step": 1
      },
      {
        "prop": "boost",
        "control": "slider",
        "label": "Thruster boost (\u00d7 speed while held)",
        "default": 1.8,
        "min": 1,
        "max": 3,
        "step": 0.05
      },
      {
        "prop": "agility",
        "control": "slider",
        "label": "Turn rate",
        "default": 1.25,
        "min": 0.3,
        "max": 3,
        "step": 0.05
      },
      {
        "prop": "bank",
        "control": "slider",
        "label": "Bank angle",
        "default": 52,
        "min": 0,
        "max": 80,
        "step": 1
      },
      {
        "prop": "altitude",
        "control": "slider",
        "label": "Cruising altitude",
        "default": 64,
        "min": 10,
        "max": 300,
        "step": 1
      },
      {
        "prop": "ceiling",
        "control": "slider",
        "label": "Ceiling (highest it climbs)",
        "default": 300,
        "min": 60,
        "max": 600,
        "step": 5
      },
      {
        "prop": "clearance",
        "control": "slider",
        "label": "Ground clearance (lowest it skims)",
        "default": 7,
        "min": 3,
        "max": 40,
        "step": 1
      },
      {
        "prop": "wingmen",
        "control": "slider",
        "label": "Wingmen",
        "default": 0,
        "min": 0,
        "max": 2,
        "step": 1
      },
      {
        "prop": "followPointer",
        "control": "switch",
        "label": "Steer with pointer",
        "default": true
      },
      {
        "prop": "invertY",
        "control": "switch",
        "label": "Flight-stick up/down (down climbs, up dives)",
        "default": true
      },
      {
        "prop": "stunts",
        "control": "switch",
        "label": "Rolls on autopilot",
        "default": true
      }
    ]
  },
  {
    "title": "Sprite stack",
    "controls": [
      {
        "prop": "jetScale",
        "control": "slider",
        "label": "Jet size",
        "default": 1,
        "min": 0.6,
        "max": 1.6,
        "step": 0.05
      },
      {
        "prop": "spread",
        "control": "slider",
        "label": "Slice spacing",
        "default": 1,
        "min": 1,
        "max": 7,
        "step": 0.1
      },
      {
        "prop": "pixelSize",
        "control": "slider",
        "label": "Pixel size (0 = auto)",
        "default": 0,
        "min": 0,
        "max": 12,
        "step": 1
      },
      {
        "prop": "intro",
        "control": "switch",
        "label": "Stack-up intro",
        "default": true
      }
    ]
  },
  {
    "title": "Camera",
    "controls": [
      {
        "prop": "view",
        "control": "segmented",
        "label": "View (Space switches)",
        "default": "top",
        "options": [
          "top",
          "chase",
          "cockpit"
        ]
      },
      {
        "prop": "transition",
        "control": "slider",
        "label": "View change (seconds)",
        "default": 1.4,
        "min": 0.4,
        "max": 4,
        "step": 0.1
      },
      {
        "prop": "cameraFollow",
        "control": "slider",
        "label": "Overhead: turn with the jet",
        "default": 0.6,
        "min": 0,
        "max": 1,
        "step": 0.05
      },
      {
        "prop": "chaseDistance",
        "control": "slider",
        "label": "Chase: distance (jet lengths)",
        "default": 2.6,
        "min": 1.4,
        "max": 6,
        "step": 0.1
      },
      {
        "prop": "chaseAngle",
        "control": "slider",
        "label": "Chase: height (degrees)",
        "default": 12,
        "min": 4,
        "max": 35,
        "step": 1
      },
      {
        "prop": "chaseSize",
        "control": "slider",
        "label": "Chase: jet width on screen",
        "default": 0.19,
        "min": 0.08,
        "max": 0.4,
        "step": 0.01
      }
    ]
  },
  {
    "title": "World",
    "controls": [
      {
        "prop": "timeOfDay",
        "control": "segmented",
        "label": "Time of day",
        "default": "day",
        "options": [
          "day",
          "sunset",
          "night"
        ]
      },
      {
        "prop": "land",
        "control": "slider",
        "label": "Islands",
        "default": 0.33,
        "min": 0.05,
        "max": 0.75,
        "step": 0.01
      },
      {
        "prop": "clouds",
        "control": "slider",
        "label": "Clouds",
        "default": 0.45,
        "min": 0,
        "max": 1,
        "step": 0.05
      },
      {
        "prop": "seed",
        "control": "number",
        "label": "World seed",
        "default": 7
      },
      {
        "prop": "shadow",
        "control": "switch",
        "label": "Jet shadow",
        "default": true
      }
    ]
  },
  {
    "title": "Effects",
    "controls": [
      {
        "prop": "flameStyle",
        "control": "segmented",
        "label": "Thruster flames",
        "default": "pixel",
        "options": [
          "pixel",
          "realistic"
        ]
      },
      {
        "prop": "afterburner",
        "control": "slider",
        "label": "Afterburner",
        "default": 0.8,
        "min": 0,
        "max": 1,
        "step": 0.05
      },
      {
        "prop": "trails",
        "control": "switch",
        "label": "Wingtip trails",
        "default": true
      }
    ]
  },
  {
    "title": "Jet colours",
    "controls": [
      {
        "prop": "bodyColor",
        "control": "color",
        "label": "Body",
        "default": "#545969"
      },
      {
        "prop": "accentColor",
        "control": "color",
        "label": "Accent",
        "default": "#f0580e"
      },
      {
        "prop": "canopyColor",
        "control": "color",
        "label": "Canopy",
        "default": "#1e8ca0"
      }
    ]
  }
]
