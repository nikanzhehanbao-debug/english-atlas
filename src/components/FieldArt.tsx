const regions = [
  {
    sky: "#d3eaf1",
    land: "#b6d59d",
    side: "#72986c",
    trees: "#466e5a",
    name: "发音林地",
  },
  {
    sky: "#d4e7ef",
    land: "#c5dcad",
    side: "#7c9c89",
    trees: "#5c8a71",
    name: "交流河湾",
  },
  {
    sky: "#f2e4d8",
    land: "#d9d0a8",
    side: "#aa917a",
    trees: "#776c6a",
    name: "日常山谷",
  },
  {
    sky: "#eee7c9",
    land: "#d4d69b",
    side: "#9ca571",
    trees: "#667f65",
    name: "生活营地",
  },
];
export function FieldArt({ region = 0 }: { region?: number }) {
  const palette = regions[region];
  return (
    <svg
      className="field-art"
      viewBox="0 0 420 190"
      role="img"
      aria-label={`原创${palette.name}探索岛屿插画`}
    >
      <rect width="420" height="190" rx="24" fill={palette.sky} />
      <circle cx="338" cy="43" r="22" fill="#f4d36e" />
      <path
        d="M26 38h65m-48-9h32M260 26h34m-23 8h37"
        stroke="#fff9ed"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path
        d="M58 135Q34 103 109 98L315 101Q386 115 358 147L253 176L118 166Z"
        fill={palette.side}
      />
      <path
        d="M61 124Q66 87 129 89L291 93Q369 104 352 132L258 157L135 145Z"
        fill={palette.land}
      />
      <path
        d="M70 130Q123 142 170 124T313 133"
        fill="none"
        stroke="#fff9ed"
        strokeWidth="8"
        strokeDasharray="4 8"
      />
      {region === 0 ? (
        <g fill={palette.trees}>
          <path d="M93 116l22-44l24 45Zm35 3l26-61l29 63Zm110 7l25-57l27 59Zm43 2l21-45l23 48Z" />
          <path d="M104 78l13-25l14 27Z" fill="#72986c" />
        </g>
      ) : region === 1 ? (
        <>
          <path
            d="M182 93Q124 116 199 125T241 157"
            fill="none"
            stroke="#84cbe7"
            strokeWidth="26"
          />
          <path d="M169 112l64 6" stroke="#a98059" strokeWidth="12" />
          <path
            d="M167 102l68 6M169 123l63 5"
            stroke="#293e58"
            strokeWidth="2"
          />
          <path
            d="M95 116l21-39l24 44ZM278 132l26-48l22 44Z"
            fill={palette.trees}
          />
        </>
      ) : region === 2 ? (
        <>
          <path
            d="M99 116l66-78l57 89ZM199 122l63-91l60 107Z"
            fill={palette.trees}
          />
          <path
            d="M143 64l22-26l20 23l-18-6Z M242 59l20-28l19 34l-20-10Z"
            fill="#fff9ed"
          />
        </>
      ) : (
        <>
          <path
            d="M143 132l48-66l58 73Z"
            fill="#f38d81"
            stroke="#293e58"
            strokeWidth="2"
          />
          <path d="M187 71l5 64l-32-7Z" fill="#fff9ed" />
          <path d="M275 124l12-31l14 33Z" fill="#f4d36e" />
          <path d="M273 129l32 4" stroke="#7f6655" strokeWidth="5" />
          <path d="M93 118l17-39l22 42Z" fill={palette.trees} />
        </>
      )}
      <g stroke="#293e58" strokeWidth="2" fill="none">
        <path d="M378 139v22m-11-11h22M40 79v14m-7-7h14" />
        <circle cx="380" cy="150" r="15" />
      </g>
      <path d="M377 143l3-4l4 12l-4 5Z" fill="#f38d81" />
      <g fill="#fff9ed">
        <circle cx="84" cy="132" r="3" />
        <circle cx="323" cy="144" r="3" />
        <circle cx="119" cy="146" r="3" />
      </g>
    </svg>
  );
}
export function Badge({ earned = false }: { earned?: boolean }) {
  return (
    <svg
      className={`field-badge ${earned ? "earned" : ""}`}
      viewBox="0 0 60 64"
      role="img"
      aria-label={earned ? "课程测验通过徽章" : "尚未通过的课程徽章"}
    >
      <path
        d="M15 38l-5 23l18-9l15 9l-2-26Z"
        fill={earned ? "#f38d81" : "#d6ddcf"}
        stroke="#293e58"
        strokeWidth="2"
      />
      <path
        d="M30 3l8 6l10 2l2 11l6 8l-7 8l-3 11l-11 1l-8 5l-8-7l-11-3l-1-11l-5-9l8-7l4-10l11 1Z"
        fill={earned ? "#f4d36e" : "#eef0e4"}
        stroke="#293e58"
        strokeWidth="2"
      />
      <path
        d="M28 37Q15 28 21 19Q36 20 31 39Q30 22 42 18Q46 30 28 37Z"
        fill={earned ? "#608b61" : "#9eafa1"}
      />
    </svg>
  );
}
