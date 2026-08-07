import { FontAwesomeIcon, FontAwesomeIconProps } from '@fortawesome/react-fontawesome';

interface ButtonProps {
  text?: string;
  title?: string;
  onClick: () => void;
  onHover?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  icon?: FontAwesomeIconProps['icon'];
  divClass?: string
}

const colorClass = {
  "primary": "text-white bg-primary-500 border-primary-500 hover:bg-primary-400 dark:hover:bg-primary-600",
  "secondary": "text-[#332c28] bg-btn-secondary border-[#dbd6d3] hover:bg-[#eee] dark:text-[#dcd6d3] dark:bg-[#231e1b] dark:hover:bg-[#2c2623] dark:border-[#3d3632]",
  "danger": "text-[#a20519] bg-[#ffebe8] border-[#edc2bd] hover:bg-[#f5c6c3] dark:bg-[#3c1715] dark:hover:bg-[#5c1e1c] dark:border-[#6e2826]",
  "success": "text-[#0f5132] bg-[#d1e7dd] border-[#badbcc] hover:bg-[#c1e7a5] dark:bg-[#1b2a22] dark:hover:bg-[#203a2d]",
  "ghost": "text-[#332c28] bg-transparent border-transparent dark:text-[#dcd6d3] dark:bg-transparent",
}

const Button = ({ text, onClick, onHover, variant = 'primary', icon, divClass, title }: ButtonProps) => {
  if (!text && !icon) return null;

  return (
    <div title={title} onClick={onClick} onMouseEnter={onHover} className={`flex items-center justify-center text-[14.5px] py-2.25 px-5.5 rounded-full font-bold border cursor-pointer transition duration-300 ${colorClass[variant] || colorClass.primary} ${divClass}`}>
      {icon && <FontAwesomeIcon icon={icon} />}
      {text && <span>{text}</span>}
    </div>
  );
};

export default Button;
