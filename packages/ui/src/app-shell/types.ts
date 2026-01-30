export type NavItem = {
  label: string;
  href: string;
  icon?: React.ReactNode;
  match?: (pathname: string) => boolean;
};
