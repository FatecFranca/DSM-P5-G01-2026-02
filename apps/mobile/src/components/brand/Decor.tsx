// Decorative shapes and icons from Figma "PROSA-APP" (paths copied from its SVG exports), drawn with react-native-svg.
// Figma drop-shadow filters are omitted: react-native-svg does not render SVG filters.
import { Image, StyleSheet, View, type ImageStyle, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Stop } from "react-native-svg";
import mascot from "../../../assets/brand/mascot.png";
import mascotPeek from "../../../assets/brand/mascot-peek.png";
import avatarJagua from "../../../assets/brand/avatar-jagua.png";
import mascotWave from "../../../assets/brand/mascot-wave.png";
import { palette } from "../../theme";


type ShapeProps = { style?: StyleProp<ViewStyle>; flipX?: boolean; flipY?: boolean; scale?: number; pointerEvents?: "none" | "auto" };

/** Yellow + green corner (quiz screen corners, 148×110). */
export function CornerShape({ style, flipX, flipY, scale = 1, pointerEvents }: ShapeProps) {
  return <Svg accessible={false} pointerEvents={pointerEvents} width={148 * scale} height={110 * scale} viewBox="0 0 148 110" style={[style, { transform: [{ scaleX: flipX ? -1 : 1 }, { scaleY: flipY ? -1 : 1 }] }]}>
    <Path d="M148 0C45.5 71.9996 19.5 25.9996 0 38.5V0H148Z" fill={palette.yellow} />
    <Path d="M37 110C49.1589 28.7333 75.9801 48.8733 91 3.99997H37V110Z" fill={palette.green} />
  </Svg>;
}

/** Bottom waves of the login screen: green on the left, yellow and green on the right. */
export function BottomWaves({ style }: { style?: StyleProp<ViewStyle> }) {
  return <Svg accessible={false} width="100%" height={76} viewBox="0 0 320 76" preserveAspectRatio="none" style={style}>
    <Path d="M150 75.5C35 58.5 63.5 21 0 0V75.5H150Z" fill={palette.green} />
    <G transform="translate(172 34)"><Path d="M0 41.646C102.5 -30.3536 128.5 15.6464 148 3.14595V41.646H0Z" fill={palette.yellow} /></G>
    <G transform="translate(214 22)"><Path d="M0 54C81.2667 41.8411 61.1267 15.0199 106 0V54H0Z" fill={palette.green} /></G>
  </Svg>;
}

/** Three overlapping blobs behind the mascot on the login screen (393×516). */
export function HeroBlobs({ style, scale = 1 }: { style?: StyleProp<ViewStyle>; scale?: number }) {
  return <Svg accessible={false} width={393.476 * scale} height={515.612 * scale} viewBox="0 0 393.476 515.612" style={style}>
    <Path d="M365.073 150.662C357.401 211.762 292.782 253.959 220.743 244.913C148.704 235.866 93.6539 123.713 101.327 62.6133C108.999 1.5134 260.049 18.9445 332.088 27.9909C404.127 37.0373 372.746 89.5618 365.073 150.662Z" fill={palette.yellowSoft} />
    <Path d="M348.598 183.532C355.817 242.74 287.78 275.066 221.719 283.121C155.658 291.175 88.8744 205.721 81.6552 146.512C74.4361 87.3042 114.444 77.0897 180.505 69.0349C246.566 60.9802 341.379 124.324 348.598 183.532Z" fill={palette.blue} />
    <Path d="M358 245.982C358 307.562 298.902 357.482 226 357.482C153.098 357.482 73 288.062 73 226.482C73 164.902 153.098 134.482 226 134.482C298.902 134.482 358 184.402 358 245.982Z" fill={palette.green} fillOpacity={0.9} />
  </Svg>;
}

/** Three-leaf spark above the "A" of the PROSA logo. */
export function LogoSpark({ size = 17 }: { size?: number }) {
  return <Svg accessible={false} width={size} height={size * 0.72} viewBox="0 0 17.0752 12.2535">
    <Path d="M10.8237 0.417648C9.27618 2.00771 5.03616 7.59674 7.66278 9.14363C10.8237 11.0052 10.8237 2.86092 10.8237 0.417648Z" fill={palette.yellowSoft} />
    <Path d="M3.56471 0C2.90691 2.11908 1.66378 9.02341 4.70633 9.21037C8.36776 9.43537 4.67311 2.17739 3.56471 0Z" fill={palette.blue} />
    <Path d="M17.0752 4.19613C14.9813 4.93017 8.69524 8.04473 10.3576 10.5999C12.358 13.6747 15.9866 6.38351 17.0752 4.19613Z" fill={palette.green} />
  </Svg>;
}

export function CheckCircleIcon({ size = 30, color = palette.white }: { size?: number; color?: string }) {
  return <Svg accessible={false} width={size} height={size} viewBox="0 0 30 30">
    <Path fillRule="evenodd" fill={color} d="M15 26.25C21.2132 26.25 26.25 21.2132 26.25 15C26.25 8.78681 21.2132 3.75 15 3.75C8.78681 3.75 3.75 8.78681 3.75 15C3.75 21.2132 8.78681 26.25 15 26.25ZM15 27.5C21.9036 27.5 27.5 21.9036 27.5 15C27.5 8.09644 21.9036 2.5 15 2.5C8.09644 2.5 2.5 8.09644 2.5 15C2.5 21.9036 8.09644 27.5 15 27.5Z" />
    <Path fillRule="evenodd" fill={color} d="M21.6693 10.1616C21.9253 10.3931 21.9451 10.7884 21.7134 11.0443L13.3661 20.2703L8.31844 15.4521C8.06875 15.2138 8.05956 14.8181 8.29788 14.5684C8.53625 14.3188 8.93188 14.3096 9.18156 14.5479L13.3006 18.4797L20.7866 10.2057C21.0181 9.94975 21.4134 9.92994 21.6693 10.1616Z" />
  </Svg>;
}

export function MailIcon({ size = 19 }: { size?: number }) {
  return <Svg accessible={false} width={size} height={size} viewBox="0 0 19 19">
    <Path fill={palette.blue} fillOpacity={0.5} d="M17.3271 4.72477C17.2921 4.67787 17.2483 4.63832 17.198 4.60839C17.1477 4.57846 17.092 4.55872 17.0342 4.55031C16.9763 4.5419 16.9173 4.54499 16.8606 4.55938C16.8039 4.57378 16.7505 4.59921 16.7037 4.63422L9.52078 9.99578C9.49509 10.0151 9.46384 10.0255 9.43172 10.0255C9.3996 10.0255 9.36835 10.0151 9.34266 9.99578L2.30078 4.61047C2.25429 4.57499 2.20127 4.54902 2.14474 4.53403C2.08821 4.51905 2.02928 4.51534 1.97132 4.52313C1.91336 4.53092 1.8575 4.55005 1.80693 4.57942C1.75637 4.6088 1.71208 4.64785 1.6766 4.69434C1.64112 4.74083 1.61515 4.79385 1.60017 4.85038C1.58518 4.90691 1.58148 4.96584 1.58926 5.0238C1.59705 5.08176 1.61618 5.13761 1.64555 5.18818C1.67493 5.23875 1.71398 5.28304 1.76047 5.31852L7.29719 9.55344L1.82133 13.68C1.77415 13.7152 1.73437 13.7593 1.70426 13.8099C1.67414 13.8604 1.65427 13.9164 1.6458 13.9747C1.63732 14.0329 1.6404 14.0922 1.65485 14.1493C1.66931 14.2063 1.69485 14.26 1.73004 14.3071C1.76522 14.3543 1.80936 14.3941 1.85992 14.4242C1.91047 14.4543 1.96647 14.4742 2.02471 14.4827C2.08294 14.4912 2.14228 14.4881 2.19933 14.4736C2.25637 14.4592 2.31001 14.4336 2.35719 14.3984L8.03195 10.1145L8.80086 10.7083C8.98015 10.8455 9.19926 10.9206 9.42503 10.9222C9.65081 10.9238 9.87097 10.8519 10.0522 10.7172L10.8597 10.1145L16.6013 14.3984C16.6481 14.4334 16.7014 14.4588 16.7581 14.4732C16.8148 14.4876 16.8738 14.4907 16.9317 14.4823C16.9896 14.4739 17.0453 14.4541 17.0955 14.4242C17.1458 14.3943 17.1897 14.3548 17.2247 14.3079C17.2597 14.261 17.2851 14.2077 17.2995 14.151C17.3139 14.0943 17.3169 14.0353 17.3085 13.9774C17.3001 13.9195 17.2804 13.8639 17.2505 13.8136C17.2206 13.7633 17.181 13.7194 17.1341 13.6845L11.6034 9.55195L17.2366 5.34375C17.33 5.2732 17.3919 5.16868 17.4088 5.05283C17.4258 4.93699 17.3964 4.81913 17.3271 4.72477Z" />
    <Path fill={palette.blue} fillOpacity={0.5} d="M16.7734 2.82031H2.22656C1.63604 2.82031 1.06971 3.0549 0.652145 3.47246C0.234584 3.89002 0 4.45635 0 5.04688L0 13.9531C0 14.5436 0.234584 15.11 0.652145 15.5275C1.06971 15.9451 1.63604 16.1797 2.22656 16.1797H16.7734C17.364 16.1797 17.9303 15.9451 18.3479 15.5275C18.7654 15.11 19 14.5436 19 13.9531V5.04688C19 4.45635 18.7654 3.89002 18.3479 3.47246C17.9303 3.0549 17.364 2.82031 16.7734 2.82031ZM18.1094 13.9531C18.1094 14.3074 17.9686 14.6472 17.7181 14.8978C17.4676 15.1483 17.1278 15.2891 16.7734 15.2891H2.22656C1.87225 15.2891 1.53245 15.1483 1.28191 14.8978C1.03138 14.6472 0.890625 14.3074 0.890625 13.9531V5.04688C0.890625 4.69256 1.03138 4.35276 1.28191 4.10222C1.53245 3.85169 1.87225 3.71094 2.22656 3.71094H16.7734C17.1278 3.71094 17.4676 3.85169 17.7181 4.10222C17.9686 4.35276 18.1094 4.69256 18.1094 5.04688V13.9531Z" />
  </Svg>;
}

export function LockIcon({ size = 19 }: { size?: number }) {
  return <Svg accessible={false} width={size * 0.82} height={size} viewBox="0 0 15.5508 19">
    <Path fill={palette.blue} fillOpacity={0.5} d="M12.9513 19H2.59955C1.16647 19 0 17.8335 0 16.4005V10.0873C0 8.69803 1.09551 7.55947 2.46809 7.49111V5.30749C2.46809 2.38078 4.84887 0 7.77523 0C10.7012 0 13.0827 2.38078 13.0827 5.30749V7.49111C14.4549 7.55982 15.5508 8.69803 15.5508 10.0873V16.4005C15.5508 17.8335 14.3848 19 12.9513 19ZM2.59955 8.23051C1.57569 8.23051 0.742744 9.06345 0.742744 10.0873V16.4005C0.742744 17.4243 1.57569 18.2573 2.59955 18.2573H12.9513C13.9747 18.2573 14.8081 17.4243 14.8081 16.4005V10.0873C14.8081 9.06345 13.9747 8.23051 12.9513 8.23051H12.34V5.30749C12.34 2.7904 10.2923 0.742686 7.77518 0.742686C5.25843 0.742686 3.21077 2.7904 3.21077 5.30749V8.23051H2.59955ZM11.5973 8.23051H3.95352V5.30749C3.95352 3.20003 5.66771 1.48543 7.77523 1.48543C9.88235 1.48543 11.5973 3.20003 11.5973 5.30749V8.23051ZM4.69626 7.48776H10.8546V5.30749C10.8546 3.60965 9.47273 2.22817 7.77523 2.22817C6.07774 2.22817 4.69626 3.60965 4.69626 5.30749V7.48776ZM7.77523 10.6852C7.0912 10.6852 6.53712 11.2396 6.53712 11.9233C6.53712 12.607 7.0912 13.1611 7.77523 13.1611C8.45852 13.1611 9.01335 12.607 9.01335 11.9233C9.01335 11.2396 8.45892 10.6852 7.77523 10.6852ZM8.38687 12.3274C8.38687 11.9898 8.11355 11.7161 7.77523 11.7161C7.43801 11.7161 7.16395 11.9894 7.16395 12.3274V15.1909C7.16395 15.5285 7.43801 15.8022 7.77523 15.8022C8.11355 15.8022 8.38687 15.5285 8.38687 15.1909V12.3274Z" />
  </Svg>;
}

/** Three-leaf sprig beside celebration titles (61×44 in Figma). The left one is mirrored as in the pop-ups. */
export function Sprig({ side, scale = 1 }: { side: "left" | "right"; scale?: number }) {
  const transform = side === "right" ? [{ rotate: "34.62deg" }] : [{ rotate: "145.38deg" }, { scaleY: -1 }];
  return <View accessible={false} style={{ width: 75 * scale, height: 70 * scale, alignItems: "center", justifyContent: "center" }}>
    <Svg width={61 * scale} height={43.8 * scale} viewBox="0 0 61.0109 43.7826" style={{ transform }}>
      <Path d="M38.674 1.49229C33.1445 7.17371 17.9945 27.1437 27.3797 32.6708C38.6738 39.3223 38.674 10.2223 38.674 1.49229Z" fill={palette.yellowSoft} />
      <Path d="M12.737 6.25609e-06C10.3866 7.57165 5.94482 32.2413 16.816 32.9093C29.8986 33.7133 16.6974 7.77998 12.737 6.25609e-06Z" fill={palette.blue} />
      <Path d="M61.0109 14.9931C53.5292 17.6159 31.0687 28.7444 37.0083 37.8741C44.1561 48.8608 57.1214 22.8087 61.0109 14.9931Z" fill={palette.green} />
    </Svg>
  </View>;
}

/** Yellow and green waves along the bottom of the celebration card (288×69 in Figma, drawn rotated 180°). */
export function CardWaves({ style }: { style?: StyleProp<ViewStyle> }) {
  return <Svg accessible={false} width="100%" height={69.27} viewBox="0 0 288 69.2731" preserveAspectRatio="none" style={[style, { transform: [{ rotate: "180deg" }] }]}>
    <Path d="M238.034 0.203903C105.858 102.26 12.7928 62.9713 1.16745 55.499C1.16745 55.499 -4.16084 34.5766 7.9489 20.7528C12.4561 15.6076 18.6053 8.79708 25.3868 7.30262C33.6214 1.32475 47.1843 0.203903 47.1843 0.203903H238.034Z" fill={palette.yellow} />
    <Path d="M48.439 0C180.615 102.056 274.847 63.3451 286.473 55.8728C286.473 55.8728 293.254 32.1654 278.238 19.6321C263.222 7.09871 267.868 8.59317 261.086 7.09871C252.851 1.12085 239.289 0 239.289 0H48.439Z" fill={palette.yellow} />
    <Path d="M221.565 65.5866C294.707 49.8948 298.099 13.2804 242.878 0.204002H47.6687C-16.2708 11.7861 1.65155 62.5977 4.55789 65.5866C22.8423 84.3906 107.733 22.6208 138.25 45.0378C165.376 74.927 204.252 69.3007 221.565 65.5866Z" fill={palette.green} />
    <Path d="M56.872 0.204046C28.3609 36.7028 9.48757 24.9197 6.97991 22.2474C6.97991 22.2474 9.40186 18.8848 13.277 15.1487C17.1521 11.4125 21.0176 8.95806 22.4804 8.42359C29.2618 3.9402 47.6687 0.204046 47.6687 0.204046H56.872Z" fill={palette.greenDark} />
  </Svg>;
}

/** Jaguar paw from the streak pop-up (1:1061): four toes and a pad. Filled, or outline-only when `fill` is "none". */
export function PawIcon({ size = 64, fill, stroke = "none", strokeWidth = 0, style }: { size?: number; fill: string; stroke?: string; strokeWidth?: number; style?: StyleProp<ViewStyle> }) {
  const toe = { rx: 10.5, ry: 14, fill, stroke, strokeWidth };
  return <Svg accessible={false} width={size} height={size} viewBox="0 0 100 100" style={style}>
    <Ellipse cx={19} cy={46} rotation={-28} origin="19, 46" {...toe} />
    <Ellipse cx={39} cy={25} rotation={-9} origin="39, 25" {...toe} />
    <Ellipse cx={61} cy={25} rotation={9} origin="61, 25" {...toe} />
    <Ellipse cx={81} cy={46} rotation={28} origin="81, 46" {...toe} />
    <Path d="M50 44C68 44 82 58 82 72C82 85 70 94 50 94C30 94 18 85 18 72C18 58 32 44 50 44Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" />
  </Svg>;
}

const POINTS_PAW_PATH = "M38.9993 27.2525C28.148 27.2525 12.8724 44.0279 12.8724 54.6236C12.7521 59.3951 16.4079 62.2525 22.5657 62.2525C29.2376 62.2525 33.6536 58.8209 38.9993 58.8209C44.3997 58.8209 48.8294 62.2525 55.4329 62.2525C61.4622 62.2525 65.2411 59.3979 65.2411 54.6305C65.1263 44.0416 49.8548 27.2525 38.9993 27.2525ZM18.8743 25.5299C17.4565 20.7967 13.0638 17.7205 9.08252 18.6775C5.10127 19.6346 3.02807 24.2447 4.44639 28.9752C5.86416 33.7193 10.2569 36.7955 14.2382 35.8385C18.2194 34.8814 20.2825 30.2604 18.8743 25.5299ZM30.4544 22.6861C34.6749 21.5753 36.794 15.9732 35.1712 9.9207C33.5483 3.86816 28.8138 0.199999 24.5769 1.18848C20.3563 2.29932 18.2372 7.90137 19.8601 13.9539C21.4856 19.8834 26.2161 23.8072 30.4544 22.6861ZM68.9271 18.6803C64.9458 17.8463 60.553 20.7994 59.1353 25.5326C57.7175 30.2672 59.7847 34.8801 63.7659 35.8371C67.7472 36.6711 72.1222 33.718 73.5577 28.9848C74.97 24.2447 72.7825 19.6373 68.9271 18.6803ZM47.5442 22.6861C51.6595 23.797 56.5157 19.8834 58.1386 13.9539C59.7614 8.02441 57.643 2.29863 53.4218 1.18848C49.3065 0.0776358 44.4503 3.99121 42.8274 9.9207C41.2005 15.8502 43.3196 21.5787 47.5442 22.6861Z";

/**
 * The Figma paw (1:1043, 78×69): "gradient" for points and today's streak, "filled" for past streak days,
 * "outline" for the next day, "white" for the Trilhas button of the bottom menu.
 */
export function PointsPaw({ width = 78, variant = "gradient" }: { width?: number; variant?: "gradient" | "filled" | "outline" | "white" }) {
  const fill = variant === "gradient" ? "url(#pointsPaw)" : variant === "filled" ? palette.yellow : variant === "white" ? palette.white : "none";
  return <Svg accessible={false} width={width} height={width * 69.25 / 78} viewBox="0 0 77.9892 69.2525">
    {variant === "gradient" && <Defs><LinearGradient id="pointsPaw" x1="39" y1="1" x2="39" y2="62.25" gradientUnits="userSpaceOnUse"><Stop offset="0" stopColor="#E18627" /><Stop offset="1" stopColor={palette.yellow} /></LinearGradient></Defs>}
    <Path d={POINTS_PAW_PATH} fill={fill} stroke={palette.navy} strokeWidth={variant === "outline" ? 1.4 : 0.6} />
  </Svg>;
}

/** Yellow, blue and green blobs in the top-left corner of the profile (Figma 1:95, rotated -144.62°). */
export function ProfileBlobs({ scale = 1, style }: { scale?: number; style?: StyleProp<ViewStyle> }) {
  return <Svg accessible={false} width={358.4 * scale} height={340.4 * scale} viewBox="0 0 358.423 340.372" style={[style, { transform: [{ rotate: "-144.62deg" }] }]}>
    <Path d="M330.02 150.662C322.348 211.762 257.729 253.959 185.69 244.913C113.651 235.866 58.6009 123.713 66.2737 62.6133C73.9464 1.51343 224.997 18.9445 297.035 27.9909C369.074 37.0374 337.693 89.5619 330.02 150.662Z" fill={palette.yellowSoft} />
    <Path d="M313.545 183.532C320.764 242.74 252.727 275.066 186.666 283.121C120.605 291.175 53.8215 205.721 46.6023 146.512C39.3831 87.3042 79.3906 77.0897 145.452 69.035C211.513 60.9802 306.326 124.324 313.545 183.532Z" fill={palette.blue} />
    <Path d="M310 203.872C310 265.452 250.902 315.372 178 315.372C105.098 315.372 25 245.952 25 184.372C25 122.792 105.098 92.372 178 92.372C250.902 92.372 310 142.292 310 203.872Z" fill={palette.green} fillOpacity={0.9} />
  </Svg>;
}

/** Green, yellow and green waves behind the bottom menu of the profile (Figma 1:99–1:101, 320×93). */
export function ProfileWaves({ style }: { style?: StyleProp<ViewStyle> }) {
  // O tamanho vem do contêiner (style); o SVG só preenche, esticando na vertical.
  return <View pointerEvents="none" style={style}><Svg accessible={false} width="100%" height="100%" viewBox="0 0 320 93" preserveAspectRatio="none">
    <G transform="translate(0 1)"><Path d="M290 81C67.6667 62.7616 122.767 22.5298 0 0V81H290Z" fill={palette.green} /></G>
    <G transform="translate(320 11) scale(-1 1)"><Path d="M315 82C96.8412 -59.7656 41.5034 30.8073 0 6.19431V82H315Z" fill={palette.yellow} /></G>
    <G transform="translate(320 19) scale(-1 1)"><Path d="M193 74C45.0333 57.3378 81.7033 20.5828 0 0V74H193Z" fill={palette.green} /></G>
  </Svg></View>;
}

export function ArrowRightIcon({ size = 22, color = palette.navy }: { size?: number; color?: string }) {
  return <Svg accessible={false} width={size * 0.62} height={size} viewBox="0 0 13.5667 22"><Path d="M0 19.25L8.43333 11L0 2.56667L2.56667 0L13.5667 11L2.56667 22L0 19.25Z" fill={color} /></Svg>;
}

export function HomeIcon({ size = 20, color }: { size?: number; color: string }) {
  return <Svg accessible={false} width={size} height={size} viewBox="0 0 20 20">
    <Path fill={color} d="M18.75 9.375C18.6197 9.37416 18.493 9.33264 18.3875 9.25625L10 3.26875L1.6125 9.25625C1.47794 9.33594 1.31839 9.3623 1.16535 9.3301C1.01231 9.29791 0.876897 9.20951 0.785849 9.08236C0.6948 8.9552 0.65473 8.79853 0.673549 8.64328C0.692369 8.48803 0.768709 8.34547 0.8875 8.24375L9.6375 1.99375C9.74335 1.91838 9.87006 1.87789 10 1.87789C10.1299 1.87789 10.2566 1.91838 10.3625 1.99375L19.1125 8.24375C19.2192 8.321 19.2988 8.42999 19.3398 8.55516C19.3809 8.68034 19.3814 8.81528 19.3412 8.94074C19.301 9.06619 19.2222 9.17573 19.116 9.25372C19.0098 9.33171 18.8817 9.37416 18.75 9.375Z" />
    <Path fill={color} d="M3.125 5.625C2.95924 5.625 2.80027 5.55915 2.68306 5.44194C2.56585 5.32473 2.5 5.16576 2.5 5V2.5C2.5 2.33424 2.56585 2.17527 2.68306 2.05806C2.80027 1.94085 2.95924 1.875 3.125 1.875H5.625C5.79076 1.875 5.94973 1.94085 6.06694 2.05806C6.18415 2.17527 6.25 2.33424 6.25 2.5C6.25 2.66576 6.18415 2.82473 6.06694 2.94194C5.94973 3.05915 5.79076 3.125 5.625 3.125H3.75V5C3.75 5.16576 3.68415 5.32473 3.56694 5.44194C3.44973 5.55915 3.29076 5.625 3.125 5.625Z" />
    <Path fill={color} d="M15.625 18.125H12.5C12.3342 18.125 12.1753 18.0592 12.0581 17.9419C11.9408 17.8247 11.875 17.6658 11.875 17.5V13.125H8.125V17.5C8.125 17.6658 8.05915 17.8247 7.94194 17.9419C7.82473 18.0592 7.66576 18.125 7.5 18.125H4.375C3.87772 18.125 3.40081 17.9275 3.04917 17.5758C2.69754 17.2242 2.5 16.7473 2.5 16.25V10C2.5 9.83424 2.56585 9.67527 2.68306 9.55806C2.80027 9.44085 2.95924 9.375 3.125 9.375C3.29076 9.375 3.44973 9.44085 3.56694 9.55806C3.68415 9.67527 3.75 9.83424 3.75 10V16.25C3.75 16.4158 3.81585 16.5747 3.93306 16.6919C4.05027 16.8092 4.20924 16.875 4.375 16.875H6.875V12.5C6.875 12.3342 6.94085 12.1753 7.05806 12.0581C7.17527 11.9408 7.33424 11.875 7.5 11.875H12.5C12.6658 11.875 12.8247 11.9408 12.9419 12.0581C13.0592 12.1753 13.125 12.3342 13.125 12.5V16.875H15.625C15.7908 16.875 15.9497 16.8092 16.0669 16.6919C16.1842 16.5747 16.25 16.4158 16.25 16.25V10C16.25 9.83424 16.3158 9.67527 16.4331 9.55806C16.5503 9.44085 16.7092 9.375 16.875 9.375C17.0408 9.375 17.1997 9.44085 17.3169 9.55806C17.4342 9.67527 17.5 9.83424 17.5 10V16.25C17.5 16.7473 17.3025 17.2242 16.9508 17.5758C16.5992 17.9275 16.1223 18.125 15.625 18.125Z" />
  </Svg>;
}

export function UserIcon({ size = 20, color }: { size?: number; color: string }) {
  return <Svg accessible={false} width={size} height={size} viewBox="0 0 19.6244 20">
    <Path fill={color} d="M19.5622 16.925C19.1021 14.8967 18.018 13.0636 16.4622 11.6833C15.6864 12.7135 14.6818 13.5493 13.5278 14.1249C12.3738 14.7004 11.1018 15 9.81219 15C8.52259 15 7.25062 14.7004 6.09659 14.1249C4.94255 13.5493 3.93802 12.7135 3.16219 11.6833C1.60643 13.0636 0.522309 14.8967 0.0621928 16.925C-0.0209642 17.2942 -0.0207274 17.6772 0.0628859 18.0463C0.146499 18.4153 0.311383 18.7611 0.545526 19.0583C0.78005 19.3525 1.07795 19.59 1.41703 19.7531C1.75611 19.9161 2.12762 20.0005 2.50386 20H17.1205C17.4968 20.0005 17.8683 19.9161 18.2074 19.7531C18.5464 19.59 18.8443 19.3525 19.0789 19.0583C19.313 18.7611 19.4779 18.4153 19.5615 18.0463C19.6451 17.6772 19.6453 17.2942 19.5622 16.925Z" />
    <Path fill={color} d="M9.81219 13.3333C13.4941 13.3333 16.4789 10.3486 16.4789 6.66667C16.4789 2.98477 13.4941 0 9.81219 0C6.13029 0 3.14553 2.98477 3.14553 6.66667C3.14553 10.3486 6.13029 13.3333 9.81219 13.3333Z" />
  </Svg>;
}

/** Jagua sitting and waving (Figma "image 11", same asset as the intro screen), 2:3 image. */
export function MascotWave({ width, style }: { width: number; style?: StyleProp<ImageStyle> }) {
  return <Image accessible={false} source={mascotWave} resizeMode="contain" style={[{ width, height: width * 1.5 }, style]} />;
}

/** Thin navy circle with an X, the icon of the VOLTAR button in the skip-quiz pop-up (Figma 1:361). */
export function CircleXIcon({ size = 20, color = palette.navy }: { size?: number; color?: string }) {
  return <Svg accessible={false} width={size} height={size} viewBox="0 0 20 20">
    <Circle cx={10} cy={10} r={9.2} fill="none" stroke={color} strokeWidth={1} />
    <Path d="M7 7l6 6M13 7l-6 6" stroke={color} strokeWidth={1.2} strokeLinecap="round" />
  </Svg>;
}

/** Profile avatar: waving Jagua with a yellow ring over a light-blue circle (Figma 1:105–1:106). */
export function AvatarJagua({ size = 100 }: { size?: number }) {
  return <View accessible={false} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: "#81C3E7" }}>
    <Image source={avatarJagua} style={{ width: size, height: size }} />
  </View>;
}

/** Beige circle behind exercise pictures (94×94 in Figma). */
export function PictureCircle({ size = 94 }: { size?: number }) {
  return <Svg accessible={false} width={size} height={size} viewBox="0 0 94 94" style={StyleSheet.absoluteFill}><Circle cx={47} cy={47} r={47} fill={palette.beige} /></Svg>;
}


/** Jaguar peeking over the top edge of a card (celebration pop-ups), 3:2 image. */
export function MascotPeek({ width, style }: { width: number; style?: StyleProp<ImageStyle> }) {
  return <Image accessible={false} source={mascotPeek} resizeMode="contain" style={[{ width, height: width / 1.5 }, style]} />;
}

/** Jaguar mascot with the blue PROSA bandana, slightly tilted as in Figma. */
export function Mascot({ width, style }: { width: number; style?: StyleProp<ImageStyle> }) {
  return <Image accessible={false} source={mascot} resizeMode="contain" style={[{ width, height: width * 1.5, transform: [{ rotate: "-2.6deg" }] }, style]} />;
}

/**
 * Yellow, blue and green blobs in the top corners of the trail tree (Figma 9:140 and 9:173, 358×340 each).
 * The right one is the same group mirrored vertically before the rotation.
 */
export function TrailCorner({ side, scale = 1 }: { side: "left" | "right"; scale?: number }) {
  const width = 358.423 * scale;
  const height = 340.372 * scale;
  // Centers of the rotated groups in the 320 px frame.
  const center = side === "left" ? { x: -33, y: -85 } : { x: 352.7, y: -85 };
  const transform = side === "left" ? [{ rotate: "-144.62deg" }] : [{ rotate: "-34.45deg" }, { scaleY: -1 }];
  return <Svg accessible={false} pointerEvents="none" width={width} height={height} viewBox="0 0 358.423 340.372" style={{ position: "absolute", left: center.x * scale - width / 2, top: center.y * scale - height / 2, transform }}>
    <Path d="M330.02 150.662C322.348 211.762 257.729 253.959 185.69 244.913C113.651 235.866 58.6009 123.713 66.2737 62.6133C73.9464 1.51343 224.997 18.9445 297.035 27.9909C369.074 37.0374 337.693 89.5619 330.02 150.662Z" fill={palette.yellowSoft} />
    <Path d="M313.545 183.532C320.764 242.74 252.727 275.066 186.666 283.121C120.605 291.175 53.8215 205.721 46.6023 146.512C39.3831 87.3042 79.3906 77.0897 145.452 69.035C211.513 60.9802 306.326 124.324 313.545 183.532Z" fill={palette.blue} />
    <Path d="M310 203.872C310 265.452 250.902 315.372 178 315.372C105.098 315.372 25 245.952 25 184.372C25 122.792 105.098 92.372 178 92.372C250.902 92.372 310 142.292 310 203.872Z" fill={palette.green} fillOpacity={0.9} />
  </Svg>;
}

/** Green and yellow hills behind the bottom menu on the trail screens (Figma 9:144–9:146, 320×92). */
export function TrailWaves({ style }: { style?: StyleProp<ViewStyle> }) {
  return <Svg accessible={false} pointerEvents="none" width="100%" height="100%" viewBox="0 0 320 92" preserveAspectRatio="none" style={style}>
    <Path d="M290 81C67.6667 62.7616 122.767 22.5298 0 0V81H290Z" fill={palette.green} />
    <G transform="translate(320 10) scale(-1 1)"><Path d="M315 82C96.8412 -59.7656 41.5034 30.8073 0 6.19431V82H315Z" fill={palette.yellow} /></G>
    <G transform="translate(320 18) scale(-1 1)"><Path d="M193 74C45.0333 57.3378 81.7033 20.5828 0 0V74H193Z" fill={palette.green} /></G>
  </Svg>;
}

/** Solid brown padlock of the locked trail cards (Figma "Capa_1", 11.7×15). */
export function SolidLockIcon({ size = 15 }: { size?: number }) {
  return <Svg accessible={false} width={size * 0.778} height={size} viewBox="0 0 11.6667 15">
    <Path fill="#8E7451" d="M10 6.11111V4.16665C10 1.88889 8.11111 0 5.83335 0C3.55556 0 1.66667 1.88889 1.66667 4.16668V6.11114C0.722208 6.11114 0 6.83335 0 7.77781V13.3333C0 14.2778 0.722208 15 1.66667 15H10C10.9445 15 11.6667 14.2778 11.6667 13.3333V7.77778C11.6667 6.88889 10.9445 6.11111 10 6.11111ZM6.11111 10.5V11.9445C6.11111 12.1111 6 12.2222 5.83335 12.2222C5.6667 12.2222 5.55558 12.1111 5.55558 11.9445V10.5C5.22225 10.3889 5.00003 10.0555 5.00003 9.72224C5.00003 9.27779 5.38893 8.88889 5.83338 8.88889C6.27782 8.88889 6.66672 9.27779 6.66672 9.72224C6.66667 10.1111 6.44444 10.3889 6.11111 10.5ZM8.33333 6.11111H3.33333V4.16665C3.33333 2.77778 4.44444 1.66667 5.83332 1.66667C7.22219 1.66667 8.3333 2.77778 8.3333 4.16665V6.11111H8.33333Z" />
  </Svg>;
}
