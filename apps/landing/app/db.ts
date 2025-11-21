export type User = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: "ADMIN" | "USER";
};

// Simula una tabla de base de datos con datos iniciales.
let users: User[] = [
  { id: "1", name: "Admin User", email: "admin@example.com", role: "ADMIN" },
  { id: "2", name: "Test User", email: "user@example.com", role: "USER" },
];

export const db = {
  user: {
    findMany: async () => users,
    findById: async (id: string) => users.find((user) => user.id === id),
    update: async (id: string, data: { role: "ADMIN" | "USER" }) => {
      users = users.map((user) =>
        user.id === id ? { ...user, ...data } : user,
      );
      return users.find((user) => user.id === id);
    },
    delete: async (id: string) => {
      users = users.filter((user) => user.id !== id);
      return true;
    },
  },
};