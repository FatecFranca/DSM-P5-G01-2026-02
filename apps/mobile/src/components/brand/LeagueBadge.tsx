import type { ReactNode } from "react";
import Svg, { Circle, G, Path, Rect } from "react-native-svg";
import { LEAGUES, type LeagueId } from "../../domain/league";

const LOCKED = "#D6D0C4";
const LOCKED_ICON = "#A8A296";
const SHIELD = "M24 2 L44 9 V26 C44 38 35 46 24 50 C13 46 4 38 4 26 V9 Z";

/** Desenho de cada liga, em 24x24: o objeto vai do lápis à biblioteca, como o caminho de quem aprende a ler. */
function Icon({ id, ink, back }: { id: LeagueId; ink: string; back: string }): ReactNode {
  switch (id) {
    case "lapis": return <>
      <Path d="M15.5 3.5 L20.5 8.5 L9 20 L3.5 20.5 L4 15 Z" fill={ink} />
      <Path d="M13.6 5.4 L18.6 10.4 M5.2 15.6 L8.4 18.8" stroke={back} strokeWidth={1.4} />
    </>;
    case "caderno": return <>
      <Rect x={5} y={3} width={14} height={18} rx={2} fill={ink} />
      <Path d="M9.5 8 H16 M9.5 12 H16 M9.5 16 H14" stroke={back} strokeWidth={1.4} strokeLinecap="round" />
      {[7, 12, 17].map((cy) => <Circle key={cy} cx={5} cy={cy} r={1.4} fill={back} />)}
    </>;
    case "livro": return <>
      <Path d="M2 5 C5 4 9 4 11.3 6.3 V20 C9 18.3 5 18 2 18.8 Z" fill={ink} />
      <Path d="M22 5 C19 4 15 4 12.7 6.3 V20 C15 18.3 19 18 22 18.8 Z" fill={ink} />
    </>;
    case "estante": return <>
      <Rect x={3} y={2.5} width={18} height={19} rx={1.5} fill={ink} />
      <Rect x={5} y={4.5} width={14} height={6.5} fill={back} />
      <Rect x={5} y={13} width={14} height={6.5} fill={back} />
      {[[6, 5.5], [8.6, 6.5], [11.2, 5.5]].map(([x, y]) => <Rect key={`t${x}`} x={x} y={y} width={2} height={11 - y} fill={ink} />)}
      {[[6, 14], [8.6, 14.5], [13.5, 14]].map(([x, y]) => <Rect key={`b${x}`} x={x} y={y} width={2} height={19.5 - y} fill={ink} />)}
    </>;
    case "biblioteca": return <>
      <Path d="M12 2 L22 7.5 H2 Z" fill={ink} />
      {[3.5, 8.2, 13.3, 18].map((x) => <Rect key={x} x={x} y={9} width={2.5} height={9} fill={ink} />)}
      <Rect x={2} y={19} width={20} height={3} rx={0.8} fill={ink} />
    </>;
  }
}

/** Selo de liga em forma de escudo: colorido quando a pessoa já chegou nela, cinza nas que ainda vêm. */
export function LeagueBadge({ id, size = 48, locked = false }: { id: LeagueId; size?: number; locked?: boolean }) {
  const color = LEAGUES.find((league) => league.id === id)?.color ?? LOCKED;
  const fill = locked ? LOCKED : color;
  return <Svg accessible={false} width={size} height={size * 52 / 48} viewBox="0 0 48 52">
    <Path d={SHIELD} fill={fill} />
    <Path d="M24 6 L40 11.6 V26 C40 35.6 33 42 24 45.6" fill="none" stroke="#FFFFFF" strokeOpacity={locked ? 0 : 0.3} strokeWidth={2} />
    <G transform="translate(12 12)"><Icon id={id} ink={locked ? LOCKED_ICON : "#FFFFFF"} back={fill} /></G>
  </Svg>;
}
