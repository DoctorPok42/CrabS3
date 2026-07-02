import { FontAwesomeIcon, FontAwesomeIconProps } from '@fortawesome/react-fontawesome';

interface ButtonProps {
  text?: string;
  onClick: () => void;
  onHover?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  icon?: FontAwesomeIconProps['icon'];
  divClass?: string
}

const colorClass = {
  "primary": "hover:border-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900",
  "secondary": "hover:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-900",
  "danger": "hover:border-red-500 hover:bg-red-100 dark:hover:bg-red-900",
  "success": "hover:border-green-500 hover:bg-green-100 dark:hover:bg-green-900"
}

const Button = ({ text, onClick, onHover, variant = 'primary', icon, divClass }: ButtonProps) => {
  if (!text && !icon) return null;

  return (
    <div onClick={onClick} onMouseEnter={onHover} className={`text-sm py-2 px-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 text-zinc-800 dark:text-zinc-200 cursor-pointer transition duration-300 ${colorClass[variant] || colorClass.primary} ${divClass}`}>
      {icon && <FontAwesomeIcon icon={icon} />}
      {text && <span>{text}</span>}
    </div>
  );
};

export default Button;
