export const formatSize = (size: number): string => {
  if (size <= 0)
    return "0 B";

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];

  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`;
};

export const formatDate = (date: string): string => {
  const times = [
    { unit: "year", value: 1000 * 60 * 60 * 24 * 365 },
    { unit: "month", value: 1000 * 60 * 60 * 24 * 30 },
    { unit: "day", value: 1000 * 60 * 60 * 24 },
    { unit: "hour", value: 1000 * 60 * 60 },
    { unit: "minute", value: 1000 * 60 },
    { unit: "second", value: 1000 },
  ];

  const now = Date.now();
  const diff = now - new Date(date).getTime();

  for (const { unit, value } of times) {
    const amount = Math.floor(diff / value);
    if (amount > 0) {
      return `${amount} ${unit}${amount > 1 ? 's' : ''} ago`;
    }
  }

  return "just now";
};
