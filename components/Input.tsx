import { FontAwesomeIcon, FontAwesomeIconProps } from "@fortawesome/react-fontawesome";

interface InputProps {
  label: string;
  id: string;
  type: HTMLInputElement["type"];
  name: string;
  placeholder?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  icon?: FontAwesomeIconProps["icon"];
  class?: string;
  divClass?: string;
  disabled?: boolean;
  readOnly?: boolean;
  autoFocus?: boolean;
}

const Input = ({ label, id, type, name, placeholder, class: inputClass, value, onChange, onKeyDown, icon, divClass, disabled, readOnly, autoFocus }: InputProps) => {
  return (
    <div className={`flex flex-col gap-1 col-span-1 md:col-span-1 lg:col-span-2 ${divClass || ''} ${disabled || readOnly ? 'cursor-not-allowed' : ''}`}>
      <label htmlFor={id} className="text-[#5b544f] dark:text-[#a59d97] text-[13px] tracking-[0.001em] font-semibold">
        {label}
      </label>
      <div className='h-11.5 px-2 text-[15px] bg-input dark:bg-input-dark hover:bg-[#f4f4f6] dark:hover:bg-[#25272c] border-[1.5px] border-[#e9ebed] dark:border-[#383a42] rounded-2xl text-zinc-700! dark:text-[#d2d5da]! transition duration-300 inputClass'>
        {icon && <FontAwesomeIcon icon={icon} className='text-zinc-700 dark:text-[#d2d5da] ml-1' size='sm' />}
        <input
          id={id}
          type={type}
          name={name}
          placeholder={placeholder}
          className={`outline-none w-full ${inputClass || ''} ${disabled || readOnly ? 'cursor-not-allowed' : ''}`}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          disabled={disabled}
          readOnly={readOnly}
          autoFocus={autoFocus}
        />
      </div>
    </div>
  )
}

export default Input;
