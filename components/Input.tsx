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
}

const Input = ({ label, id, type, name, placeholder, class: inputClass, value, onChange, onKeyDown, icon, divClass, disabled, readOnly }: InputProps) => {
  return (
    <div className={`flex flex-col gap-1 col-span-1 md:col-span-1 lg:col-span-2 ${divClass || ''} ${disabled || readOnly ? 'cursor-not-allowed' : ''}`}>
      <label htmlFor={id} className="text-zinc-700 dark:text-zinc-300">{label}</label>
      <div className='inputClass h-10 text-lg bg-[#fafafa] dark:bg-[#1c1d21] hover:bg-[#f4f4f6] dark:hover:bg-[#25272c] border-[#e9ebed]! dark:border-[#383a42]! rounded-md px-2 text-zinc-700! dark:text-[#d2d5da]! transition duration-300'>
        {icon && <FontAwesomeIcon icon={icon} className='text-zinc-700 dark:text-[#d2d5da]' size='xs' />}
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
        />
      </div>
    </div>
  )
}

export default Input;
