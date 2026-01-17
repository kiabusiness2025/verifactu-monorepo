import React from "react";


interface CommandCardProps {
  item: {
    id: string;
    user: string;
    isaak: string;
    actions?: string[];
    category?: string;
  };
}

const CommandCard: React.FC<CommandCardProps> = ({ item }) => {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md min-w-[260px] max-w-xs">
      <div className="font-semibold text-slate-800 mb-2 text-sm truncate">{item.user}</div>
      <div className="text-xs text-slate-600 whitespace-pre-line">{item.isaak}</div>
    </div>
  );
};

export default CommandCard;

