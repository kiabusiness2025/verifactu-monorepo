export * from "./src/index";

// Legacy components (kept to avoid breaking existing imports)
export { AccessibleButton } from "./components/AccessibleButton";
export { AccessibleInput } from "./components/AccessibleInput";
export { Card, CardContent, CardHeader, CardTitle } from "./components/Card";
export { EjemploFormatoES } from "./components/EjemploFormatoES";
export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./components/dialog";
export { Input } from "./components/input";
export { Label } from "./components/label";
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/select";
export { Textarea } from "./components/textarea";

// Types (legacy)
export type { BadgeVariant, CardProps, TableColumn } from "./types";
