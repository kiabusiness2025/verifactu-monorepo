export type IsaakMsg = {
  type: "ok" | "info" | "warn";
  title: string;
  body: string;
};

export type Plan = {
  name: string;
  priceMonthly: number | null;
  priceYearly: number | null;
  users: string;
  features: string[];
  highlight?: boolean;
  checkoutMonthly?: string;
  checkoutYearly?: string;
};
