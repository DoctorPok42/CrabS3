import { FontAwesomeIcon, FontAwesomeIconProps } from '@fortawesome/react-fontawesome';

interface ButtonProps {
  text?: string;
  title?: string;
  onClick: () => void;
  onHover?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  icon?: FontAwesomeIconProps['icon'];
  divClass?: string
}

const colorClass = {
  "primary": "text-white bg-primary-500 border-primary-500 hover:bg-primary-400 dark:hover:bg-primary-600 cursor-pointer",
  "secondary": "text-[#332c28] bg-btn-secondary border-[#dbd6d3] hover:bg-[#eee] dark:text-[#dcd6d3] dark:bg-[#231e1b] dark:hover:bg-[#2c2623] dark:border-[#3d3632] cursor-pointer",
  "danger": "text-[#a20519] bg-[#ffebe8] border-[#edc2bd] hover:bg-[#f5c6c3] dark:text-[#fb9890] dark:bg-[#3c1715] dark:hover:bg-[#5c1e1c] dark:border-[#6e2826] cursor-pointer",
  "ghost": "text-[#332c28] bg-transparent border-transparent dark:text-[#dcd6d3] dark:bg-transparent cursor-pointer",
  "disabled": "text-[#a8a8a8] bg-[#f0f0f0] border-[#dcdcdc] cursor-not-allowed dark:text-[#5c5c5c] dark:bg-[#2c2c2c] dark:border-[#3d3d3d] cursor-pointer"
}

const Button = ({ text, onClick, onHover, variant = 'primary', icon, divClass, title, disabled }: ButtonProps) => {
  if (!text && !icon) return null;

  return (
    <div title={title} onClick={disabled ? undefined : onClick} onMouseEnter={onHover} className={`flex items-center justify-center text-[14.5px] py-2.25 px-5.5 rounded-full font-bold border transition duration-300 ${disabled ? colorClass.disabled : colorClass[variant] || colorClass.primary} ${divClass}`} style={{ ...(disabled ? { cursor: 'not-allowed', userSelect: 'none' } : {}) }}>
      {icon && <FontAwesomeIcon icon={icon} />}
      {text && <span>{text}</span>}
    </div>
  );
};

export default Button;
