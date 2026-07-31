/* Storefront icons — Lucide-style, 2px rounded stroke. */
function SIcon({ path, size = 22, stroke = 2, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" {...rest}>{path}</svg>
  );
}
const SSearch = (p) => <SIcon {...p} path={<><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></>} />;
const SUser   = (p) => <SIcon {...p} path={<><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.5-6 8-6s8 2 8 6"/></>} />;
const SCart   = (p) => <SIcon {...p} path={<><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.4 12.4a1.6 1.6 0 0 0 1.6 1.3h8.2a1.6 1.6 0 0 0 1.6-1.3L22 7H6"/></>} />;
const SChevron= (p) => <SIcon {...p} path={<path d="m6 9 6 6 6-6"/>} />;
const SArrow  = (p) => <SIcon {...p} path={<><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>} />;
const SMenu   = (p) => <SIcon {...p} path={<path d="M4 6h16M4 12h16M4 18h16"/>} />;
const SPhone  = (p) => <SIcon {...p} path={<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L20 13l-1 4a2 2 0 0 1-2 1.4A14 14 0 0 1 4.6 6 2 2 0 0 1 5 4Z"/>} />;
const STag    = (p) => <SIcon {...p} path={<><path d="M3 11V5a2 2 0 0 1 2-2h6l9 9-8 8-9-9Z"/><circle cx="8" cy="8" r="1.4"/></>} />;
const SAward  = (p) => <SIcon {...p} path={<><circle cx="12" cy="9" r="6"/><path d="M9 14.5 7 22l5-3 5 3-2-7.5"/></>} />;
const SHeadset= (p) => <SIcon {...p} path={<><path d="M4 13v-1a8 8 0 0 1 16 0v1"/><rect x="2.5" y="13" width="4" height="6" rx="1.5"/><rect x="17.5" y="13" width="4" height="6" rx="1.5"/><path d="M20 19a4 4 0 0 1-4 3h-2"/></>} />;
const SBox    = (p) => <SIcon {...p} path={<><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/></>} />;
const SSparkle= (p) => <SIcon {...p} path={<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>} />;

Object.assign(window, { SIcon, SSearch, SUser, SCart, SChevron, SArrow, SMenu, SPhone, STag, SAward, SHeadset, SBox, SSparkle });
