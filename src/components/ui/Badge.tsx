interface BadgeProps {
  label: string;
  color?: 'green' | 'blue' | 'yellow' | 'red' | 'gray' | 'purple';
}

const colors = {
  green: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
  red: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  gray: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
};

export function Badge({ label, color = 'gray' }: BadgeProps) {
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${colors[color]}`}>
      {label}
    </span>
  );
}
