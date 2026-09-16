import Svg, { Circle, Ellipse, Line, Path, Polygon, Rect } from "react-native-svg";

type Props = { assetId: string; accessibilityLabel: string; size?: number };

/** Desenhos vetoriais próprios. O ID vem do bundle, mas nunca é usado como URL. */
export function ContextIllustration({ assetId, accessibilityLabel, size = 220 }: Props) {
  const name = assetId.split("/").at(-1)?.replace(".svg", "") ?? "";
  return <Svg accessibilityRole="image" accessibilityLabel={accessibilityLabel} width={size} height={size * .72} viewBox="0 0 320 230">
    <Rect width="320" height="230" rx="24" fill="#F6F1E7" />
    {name === "casa" && <><Polygon points="52,112 160,30 268,112" fill="#E98B58" /><Rect x="74" y="108" width="172" height="96" rx="5" fill="#FFF9EE" stroke="#234B5A" strokeWidth="7" /><Rect x="142" y="145" width="40" height="59" fill="#76A98F" /></>}
    {name === "mesa" && <><Rect x="54" y="80" width="212" height="34" rx="10" fill="#C98B55" /><Line x1="82" y1="110" x2="70" y2="204" stroke="#234B5A" strokeWidth="12" /><Line x1="238" y1="110" x2="250" y2="204" stroke="#234B5A" strokeWidth="12" /></>}
    {name === "cama" && <><Rect x="46" y="91" width="228" height="93" rx="14" fill="#8AB9D0" stroke="#234B5A" strokeWidth="7" /><Rect x="58" y="103" width="80" height="38" rx="12" fill="#FFF" /><Line x1="58" y1="184" x2="58" y2="207" stroke="#234B5A" strokeWidth="9" /><Line x1="262" y1="184" x2="262" y2="207" stroke="#234B5A" strokeWidth="9" /></>}
    {name === "sala" && <><Rect x="48" y="105" width="224" height="76" rx="22" fill="#76A98F" stroke="#234B5A" strokeWidth="7" /><Rect x="70" y="76" width="180" height="73" rx="18" fill="#9AC5AE" stroke="#234B5A" strokeWidth="7" /><Rect x="135" y="36" width="50" height="35" fill="#F2C14E" /></>}
    {name === "copo" && <Path d="M105 48h110l-17 151h-76z" fill="#A8D9EA" stroke="#234B5A" strokeWidth="8" />}
    {name === "prato" && <><Ellipse cx="160" cy="126" rx="112" ry="68" fill="#FFF" stroke="#234B5A" strokeWidth="8" /><Ellipse cx="160" cy="126" rx="72" ry="37" fill="#F2C14E" /></>}
    {name === "porta" && <><Rect x="91" y="24" width="138" height="190" rx="5" fill="#C98B55" stroke="#234B5A" strokeWidth="8" /><Circle cx="198" cy="123" r="9" fill="#F2C14E" /></>}
    {name === "panela" && <><Ellipse cx="160" cy="75" rx="76" ry="25" fill="#C8D2D8" stroke="#234B5A" strokeWidth="7" /><Path d="M85 75h150l-17 100q-3 25-28 25h-60q-25 0-28-25z" fill="#DDE5E9" stroke="#234B5A" strokeWidth="7" /><Line x1="235" y1="105" x2="290" y2="90" stroke="#234B5A" strokeWidth="13" /></>}
    {name === "tapete" && <><Polygon points="48,74 260,61 278,174 65,191" fill="#E98B58" stroke="#234B5A" strokeWidth="7" /><Path d="M84 105q55 45 105 0t60 14" fill="none" stroke="#F6E4B7" strokeWidth="13" /></>}
    {name === "casa-frase-1" && <><Rect x="35" y="117" width="250" height="72" rx="15" fill="#8AB9D0" /><Circle cx="105" cy="98" r="27" fill="#C98B70" /><Path d="M130 118q52 15 91 0v55H119z" fill="#76A98F" /></>}
    {name === "casa-frase-2" && <><Rect x="42" y="151" width="236" height="28" rx="8" fill="#C98B55" /><Path d="M125 53h70l-10 87h-50z" fill="#A8D9EA" stroke="#234B5A" strokeWidth="7" /></>}
    {name === "casa-frase-3" && <><Circle cx="100" cy="77" r="28" fill="#C98B70" /><Path d="M72 113q28-28 56 0v72H72z" fill="#76A98F" /><Ellipse cx="213" cy="151" rx="62" ry="37" fill="#FFF" stroke="#234B5A" strokeWidth="7" /><Line x1="125" y1="126" x2="183" y2="145" stroke="#234B5A" strokeWidth="8" /></>}
    {name === "casa-frase-4" && <><Rect x="29" y="30" width="262" height="170" rx="8" fill="#FFF9EE" stroke="#234B5A" strokeWidth="6" /><Rect x="64" y="115" width="193" height="61" rx="18" fill="#76A98F" /><Rect x="129" y="55" width="62" height="46" fill="#F2C14E" /></>}
    {name === "casa-frase-5" && <><Polygon points="40,106 160,22 280,106" fill="#E98B58" /><Rect x="63" y="102" width="194" height="105" fill="#FFF9EE" stroke="#234B5A" strokeWidth="7" /><Rect x="137" y="137" width="51" height="70" fill="#76A98F" /></>}
  </Svg>;
}
