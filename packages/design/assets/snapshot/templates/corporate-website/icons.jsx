/* Lucide-style inline icons (2px rounded stroke), shared across the kit. */
function Icon({ path, size = 22, stroke = 2, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" {...rest}>
      {path}
    </svg>
  );
}

const IconArrow   = (p) => <Icon {...p} path={<><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>} />;
const IconSearch  = (p) => <Icon {...p} path={<><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></>} />;
const IconMenu    = (p) => <Icon {...p} path={<><path d="M4 6h16M4 12h16M4 18h16"/></>} />;
const IconTooth   = (p) => <Icon {...p} path={<path d="M12 5.5C10.5 4 8.5 3.5 7 4.2 5.2 5 4.5 7 5 9.5c.3 1.5.4 2 .5 3.5.2 2 .3 4.5 1.5 6 .9 1.1 1.8.4 2.2-1 .4-1.3.5-3 1.8-3s1.4 1.7 1.8 3c.4 1.4 1.3 2.1 2.2 1 1.2-1.5 1.3-4 1.5-6 .1-1.5.2-2 .5-3.5.5-2.5-.2-4.5-2-5.3-1.5-.7-3.5-.2-5 1.3Z"/>} />;
const IconPaw     = (p) => <Icon {...p} path={<><circle cx="6.5" cy="10" r="1.8"/><circle cx="10" cy="6.5" r="1.8"/><circle cx="14" cy="6.5" r="1.8"/><circle cx="17.5" cy="10" r="1.8"/><path d="M8 15.5c0-2 1.8-3.5 4-3.5s4 1.5 4 3.5c0 1.7-1.3 3-3 3.2-.7.1-1.3.1-2 0-1.7-.2-3-1.5-3-3.2Z"/></>} />;
const IconTruck   = (p) => <Icon {...p} path={<><path d="M14 7h-9a1 1 0 0 0-1 1v8h10V7Z"/><path d="M14 11h4l3 3v2h-7"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/></>} />;
const IconLeaf    = (p) => <Icon {...p} path={<><path d="M11 20A7 7 0 0 1 4 13c0-4 3-8 8-9 1 5-1 9-5 11"/><path d="M4 20c3-3 6-4 9-4"/></>} />;
const IconHeart   = (p) => <Icon {...p} path={<path d="M19 7.5c-1.5-2-4.5-2-6 .3C11.5 5.5 8.5 5.5 7 7.5c-1.7 2.2-.8 5 1 7l4 3.8 4-3.8c1.8-2 2.7-4.8 1-7Z"/>} />;
const IconGlobe   = (p) => <Icon {...p} path={<><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.4 2.5 15.6 0 18M12 3c-2.5 2.4-2.5 15.6 0 18"/></>} />;
const IconUsers   = (p) => <Icon {...p} path={<><circle cx="9" cy="8" r="3"/><path d="M3 19c0-3 2.7-5 6-5s6 2 6 5"/><path d="M16 6a3 3 0 0 1 0 5.6M21 19c0-2.3-1.4-4-3.5-4.6"/></>} />;
const IconExternal= (p) => <Icon {...p} path={<><path d="M14 5h5v5"/><path d="M19 5l-8 8"/><path d="M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4"/></>} />;
const IconPin     = (p) => <Icon {...p} path={<><path d="M12 21s7-5.5 7-11a7 7 0 0 0-14 0c0 5.5 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/></>} />;

Object.assign(window, {
  Icon, IconArrow, IconSearch, IconMenu, IconTooth, IconPaw, IconTruck,
  IconLeaf, IconHeart, IconGlobe, IconUsers, IconExternal, IconPin,
});
